import { Injectable } from "@nestjs/common";
import { Chapter, ChapterDetails, SearchResult, Title } from "@koma/shared";
import { SourceError } from "../errors/source-errors";
import { MangaSource } from "../manga-source.interface";
import { MangalibClient } from "./mangalib.client";
import {
  MANGALIB_PARSER_VERSION,
  mapChapters,
  mapPages,
  mapSearchItem,
  mapTitle,
  parseChapterExternalId,
} from "./mangalib.mapper";

const cache = new Map<string, { at: number; value: unknown }>();

@Injectable()
export class MangalibAdapter implements MangaSource {
  readonly code = "mangalib" as const;
  readonly name = "MangaLib";
  readonly parserVersion = MANGALIB_PARSER_VERSION;
  private readonly client = new MangalibClient();

  async search(query: string): Promise<SearchResult[]> {
    const body = (await this.cached(`search:${query.toLowerCase()}`, () => this.client.search(query))) as { data?: unknown[] };
    return (body.data ?? [])
      .map((item) => mapSearchItem(item as Parameters<typeof mapSearchItem>[0], this.client.siteBase))
      .filter((item): item is SearchResult => item !== null);
  }

  async getTitle(externalId: string): Promise<Title> {
    this.assertSlug(externalId);
    const body = (await this.cached(`title:${externalId}`, () => this.client.title(externalId))) as { data?: Record<string, unknown> };
    if (!body.data) {
      throw new SourceError("TITLE_NOT_FOUND", "Тайтл не знайдено на цьому джерелі", ["switch_source"], MANGALIB_PARSER_VERSION);
    }
    return mapTitle(body.data, this.client.siteBase);
  }

  async getChapters(externalTitleId: string): Promise<Chapter[]> {
    this.assertSlug(externalTitleId);
    const body = (await this.cached(`chapters:${externalTitleId}`, () => this.client.chapters(externalTitleId))) as {
      data?: Parameters<typeof mapChapters>[1];
    };
    return mapChapters(externalTitleId, body.data ?? [], this.client.siteBase);
  }

  async getChapter(externalChapterId: string): Promise<ChapterDetails> {
    const parsed = parseChapterExternalId(externalChapterId);
    this.assertSlug(parsed.slug);
    const body = (await this.cached(
      `chapter:${externalChapterId}`,
      () => this.client.chapter(parsed.slug, parsed.volume, parsed.number, parsed.branchId),
      60_000,
    )) as { data?: { name?: string; pages?: Array<{ url?: string }> } };
    const server = await this.client.imageServerUrl();
    const pages = mapPages(body.data?.pages ?? [], server);
    return {
      externalId: externalChapterId,
      chapter: {
        externalId: externalChapterId,
        displayNumber: body.data?.name ? `${parsed.number} — ${body.data.name}` : parsed.number,
        sortValue: Number(parsed.number),
        title: body.data?.name,
        url: `${this.client.siteBase}/ru/${parsed.slug}/read/v${parsed.volume}/c${parsed.number}`,
      },
      pages,
    };
  }

  async checkLatestChapter(externalTitleId: string): Promise<Chapter | null> {
    const chapters = await this.getChapters(externalTitleId);
    if (chapters.length === 0) return null;
    return chapters.reduce((best, chapter) => ((chapter.sortValue ?? -1) > (best.sortValue ?? -1) ? chapter : best));
  }

  private assertSlug(id: string): void {
    if (!/^[\w.~:-]{1,255}$/.test(id) || id.includes("..")) {
      throw new SourceError("TITLE_NOT_FOUND", "Некоректний ідентифікатор", ["back"], MANGALIB_PARSER_VERSION);
    }
  }

  private async cached<T>(key: string, load: () => Promise<T>, ttl = 120_000): Promise<T> {
    const hit = cache.get(`mangalib:${key}`);
    if (hit && Date.now() - hit.at < ttl) return hit.value as T;
    const value = await load();
    cache.set(`mangalib:${key}`, { at: Date.now(), value });
    return value;
  }
}
