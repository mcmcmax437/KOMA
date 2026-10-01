import { Injectable } from "@nestjs/common";
import { Chapter, ChapterDetails, SearchResult, Title } from "@koma/shared";
import { loadConfig } from "../../config";
import { SourceError } from "../errors/source-errors";
import { MangaSource } from "../manga-source.interface";
import { ComxClient } from "./comx.client";
import { COMX_PARSER_VERSION, parseChapterPages, parseChaptersFromHtml, parseSearchHtml, parseTitleHtml } from "./comx.parser";

const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 120_000;

@Injectable()
export class ComxAdapter implements MangaSource {
  readonly code = "comx" as const;
  readonly name = "Com-X";
  readonly parserVersion = COMX_PARSER_VERSION;
  private readonly client = new ComxClient();

  async search(query: string): Promise<SearchResult[]> {
    const base = loadConfig().comxBaseUrl;
    const path = `/search/${encodeURIComponent(query)}/page/1/`;
    const html = await this.cached(`search:${query.toLowerCase()}`, () => this.client.getHtml(path));
    return parseSearchHtml(html, base);
  }

  async getTitle(externalId: string): Promise<Title> {
    this.assertId(externalId);
    const base = loadConfig().comxBaseUrl;
    const html = await this.cached(`title:${externalId}`, () => this.client.getHtml(`/${externalId}.html`));
    return parseTitleHtml(html, base, externalId);
  }

  async getChapters(externalTitleId: string) {
    this.assertId(externalTitleId);
    const base = loadConfig().comxBaseUrl;
    const html = await this.cached(`title:${externalTitleId}`, () => this.client.getHtml(`/${externalTitleId}.html`));
    return parseChaptersFromHtml(html, base);
  }

  async getChapter(externalChapterId: string): Promise<ChapterDetails> {
    this.assertId(externalChapterId);
    const [comicId, chapterId] = externalChapterId.split("~");
    if (!comicId || !chapterId) {
      throw new SourceError("CHAPTER_NOT_FOUND", "Глава недоступна", ["back", "retry"], COMX_PARSER_VERSION);
    }
    const base = loadConfig().comxBaseUrl;
    const html = await this.cached(`chapter:${externalChapterId}`, () => this.client.getHtml(`/reader/${comicId}/${chapterId}`), 60_000);
    const parsed = parseChapterPages(html, externalChapterId, base);
    return {
      externalId: externalChapterId,
      chapter: {
        externalId: externalChapterId,
        displayNumber: chapterId,
        url: parsed.chapterUrl,
      },
      pages: parsed.pages,
    };
  }

  async checkLatestChapter(externalTitleId: string): Promise<Chapter | null> {
    const chapters = await this.getChapters(externalTitleId);
    if (chapters.length === 0) return null;
    return chapters.reduce((best, chapter) => ((chapter.sortValue ?? -1) > (best.sortValue ?? -1) ? chapter : best));
  }

  private assertId(id: string): void {
    if (!/^[\w.~:-]{1,255}$/.test(id) || id.includes("..")) {
      throw new SourceError("TITLE_NOT_FOUND", "Некоректний ідентифікатор", ["back"], COMX_PARSER_VERSION);
    }
  }

  private async cached(key: string, load: () => Promise<string>, ttl = TTL_MS): Promise<string> {
    const hit = cache.get(`comx:${key}`);
    if (hit && Date.now() - hit.at < ttl && typeof hit.value === "string") return hit.value;
    const value = await load();
    cache.set(`comx:${key}`, { at: Date.now(), value });
    return value;
  }
}
