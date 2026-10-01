import { Chapter, Page, SearchResult, Title } from "@koma/shared";
import * as cheerio from "cheerio";
import { SourceError } from "../errors/source-errors";

export const COMX_PARSER_VERSION = "1";

export interface ComxData {
  comicId?: number | string;
  host?: string;
  hostRu?: string;
  images?: string[];
  chapters?: Array<{ id?: number | string; title?: string; number?: number; date?: string }>;
}

export function detectComxBlock(html: string, finalUrl: string): boolean {
  if (finalUrl.includes("/_c")) return true;
  const readable = html.includes("window.__DATA__") || html.includes('id="dle-content"') || html.includes("dle-content");
  if (readable) return false;
  return /\/_c\?t=|cf-browser-verification|just a moment|access check|g4f18/i.test(html);
}

export function extractWindowData(html: string): ComxData {
  const marker = "window.__DATA__";
  const start = html.indexOf(marker);
  if (start < 0) {
    throw new SourceError("PARSER_ERROR", "Джерело змінило формат сторінки", ["retry", "switch_source"], COMX_PARSER_VERSION);
  }
  const brace = html.indexOf("{", start);
  if (brace < 0) {
    throw new SourceError("PARSER_ERROR", "Джерело змінило формат сторінки", ["retry", "switch_source"], COMX_PARSER_VERSION);
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = brace; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(brace, i + 1)) as ComxData;
        } catch {
          throw new SourceError("PARSER_ERROR", "Джерело змінило формат сторінки", ["retry", "switch_source"], COMX_PARSER_VERSION);
        }
      }
    }
  }
  throw new SourceError("PARSER_ERROR", "Джерело змінило формат сторінки", ["retry", "switch_source"], COMX_PARSER_VERSION);
}

function absUrl(baseUrl: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function imageAttr(baseUrl: string, el: { attr(name: string): string | undefined }): string | undefined {
  const dataSrc = el.attr("data-src");
  const src = el.attr("src");
  return absUrl(baseUrl, dataSrc && !dataSrc.startsWith("data:") ? dataSrc : src);
}

export function externalIdFromHref(href: string): string | null {
  const match = href.match(/\/([^/]+)\.html(?:$|\?)/i);
  return match?.[1] ?? null;
}

export function parseSearchHtml(html: string, baseUrl: string): SearchResult[] {
  if (detectComxBlock(html, "")) {
    throw new SourceError(
      "SOURCE_UNAVAILABLE",
      "Джерело показало перевірку доступу. KOMA не обходить такі перевірки.",
      ["retry", "switch_source"],
      COMX_PARSER_VERSION,
    );
  }
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  $("#dle-content .readed").each((_, element) => {
    const link = $(element).find(".readed__title > a").first();
    const href = link.attr("href");
    const full = link.text().replace(/\s+/g, " ").trim();
    if (!href || !full) return;
    const url = absUrl(baseUrl, href);
    const externalId = externalIdFromHref(url ?? href);
    if (!url || !externalId) return;
    const parts = full.split(/\s+\/\s+/).map((part) => part.trim()).filter(Boolean);
    results.push({
      externalId,
      title: parts[0] ?? full,
      alternativeTitles: parts.slice(1),
      coverUrl: imageAttr(baseUrl, $(element).find("img").first()),
      url,
    });
  });
  return results;
}

function listItem($: cheerio.CheerioAPI, label: string): string | undefined {
  const row = $(`.page__list > li:contains("${label}")`).first();
  const text = row.find("a").first().text().trim() || row.text().replace(label, "").trim();
  return text || undefined;
}

export function parseTitleHtml(html: string, baseUrl: string, externalId: string): Title {
  if (detectComxBlock(html, "")) {
    throw new SourceError(
      "SOURCE_UNAVAILABLE",
      "Джерело показало перевірку доступу. KOMA не обходить такі перевірки.",
      ["retry", "switch_source"],
      COMX_PARSER_VERSION,
    );
  }
  const $ = cheerio.load(html);
  const title = $("header.page__header h1").first().text().replace(/\s+/g, " ").trim();
  if (!title) {
    throw new SourceError("TITLE_NOT_FOUND", "Тайтл не знайдено на цьому джерелі", ["switch_source"], COMX_PARSER_VERSION);
  }
  const original = $(".page__title-original").first().text().trim();
  return {
    externalId,
    title,
    alternativeTitles: original ? [original] : undefined,
    description: $("div.page__text").first().text().replace(/\s+/g, " ").trim() || undefined,
    coverUrl: imageAttr(baseUrl, $("div.page__poster img").first()),
    author: listItem($, "Автор"),
    status: listItem($, "Статус"),
    url: `${baseUrl}/${externalId}.html`,
  };
}

export function parseChaptersFromHtml(html: string, baseUrl: string): Chapter[] {
  const data = extractWindowData(html);
  const comicId = String(data.comicId ?? "");
  if (!comicId || !Array.isArray(data.chapters)) {
    throw new SourceError("PARSER_ERROR", "Список глав не знайдено", ["retry", "switch_source"], COMX_PARSER_VERSION);
  }
  const chapters: Chapter[] = [];
  data.chapters.forEach((chapter, index) => {
    const id = chapter.id;
    if (id === undefined || id === null) return;
    const display = (chapter.title ?? "").replace(/\s+/g, " ").trim() || String(chapter.number ?? index + 1);
    const sortValue = typeof chapter.number === "number" && chapter.number > 0 ? chapter.number : sortFromLabel(display, index);
    chapters.push({
      externalId: `${comicId}~${id}`,
      displayNumber: display,
      sortValue,
      title: chapter.title,
      url: `${baseUrl}/reader/${comicId}/${id}`,
    });
  });
  return chapters.sort((a, b) => (a.sortValue ?? 0) - (b.sortValue ?? 0));
}

function sortFromLabel(label: string, index: number): number {
  const match = label.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return index + 0.001;
  return Number(match[1].replace(",", "."));
}

export function parseChapterPages(html: string, externalChapterId: string, baseUrl: string): { chapterUrl: string; pages: Page[] } {
  if (html.includes("Випуск був удален") || html.includes("Випуск був удален по требованию") || html.includes("удален по требованию правообладателя")) {
    throw new SourceError("CHAPTER_NOT_FOUND", "Глава недоступна", ["back", "retry"], COMX_PARSER_VERSION);
  }
  const data = extractWindowData(html);
  const images = data.images ?? [];
  if (images.length === 0) {
    throw new SourceError("PAGES_NOT_FOUND", "Не вдалося завантажити сторінки", ["retry"], COMX_PARSER_VERSION);
  }
  const host = (data.host || data.hostRu || "").replace(/^https?:\/\//, "");
  const pages = images.map((image, index) => ({
    number: index + 1,
    imageUrl: resolveComxImage(host, image, baseUrl),
  }));
  const [comicId, chapterId] = externalChapterId.split("~");
  return { chapterUrl: `${baseUrl}/reader/${comicId}/${chapterId}`, pages };
}

export function resolveComxImage(host: string, image: string, baseUrl: string): string {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (host) return `https://${host}/comix/${image.replace(/^\//, "")}`;
  return new URL(image, baseUrl).toString();
}
