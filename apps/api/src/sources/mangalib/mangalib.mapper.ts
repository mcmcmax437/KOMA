import { Chapter, Page, SearchResult, Title } from "@koma/shared";
import { SourceError } from "../errors/source-errors";

export const MANGALIB_PARSER_VERSION = "1";

interface Cover {
  default?: string;
  md?: string;
  thumbnail?: string;
}

interface SearchItem {
  rus_name?: string;
  name?: string;
  eng_name?: string;
  slug_url?: string;
  cover?: Cover;
  status?: { label?: string };
}

interface ChapterItem {
  volume?: string | number;
  number?: string | number;
  name?: string | null;
  index?: number;
  branches_count?: number;
  branches?: Array<{ branch_id?: number | null; restricted_view?: { is_open?: boolean } }>;
}

export function proseText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const current = node as { type?: string; text?: string; content?: unknown[] };
  if (typeof current.text === "string") return current.text;
  const parts = (current.content ?? []).map((child) => proseText(child));
  const sep = current.type === "doc" || current.type === "paragraph" ? "\n" : "";
  return parts.join(sep).replace(/\n{2,}/g, "\n").trim();
}

function coverUrl(cover?: Cover): string | undefined {
  return cover?.default || cover?.md || cover?.thumbnail;
}

export function mapSearchItem(item: SearchItem, siteBase: string): SearchResult | null {
  if (!item.slug_url) return null;
  const title = item.rus_name || item.name || item.eng_name || item.slug_url;
  const alternatives = [item.name, item.eng_name, item.rus_name].filter((value): value is string => Boolean(value) && value !== title);
  return {
    externalId: item.slug_url,
    title,
    alternativeTitles: [...new Set(alternatives)],
    coverUrl: coverUrl(item.cover),
    url: `${siteBase}/ru/manga/${item.slug_url}`,
  };
}

export function mapTitle(data: Record<string, unknown>, siteBase: string): Title {
  const slug = String(data.slug_url ?? "");
  if (!slug) {
    throw new SourceError("TITLE_NOT_FOUND", "Тайтл не знайдено на цьому джерелі", ["switch_source"], MANGALIB_PARSER_VERSION);
  }
  const authors = Array.isArray(data.authors) ? data.authors : [];
  const author = authors
    .map((person) => {
      const row = person as { rus_name?: string; name?: string };
      return row.rus_name || row.name;
    })
    .filter(Boolean)
    .join(", ");
  const status = data.status as { label?: string } | undefined;
  const name = String(data.rus_name || data.name || slug);
  const alternatives = [data.name, data.eng_name]
    .map((value) => (typeof value === "string" ? value : ""))
    .filter((value) => value && value !== name);
  return {
    externalId: slug,
    title: name,
    alternativeTitles: alternatives,
    description: proseText(data.summary) || undefined,
    coverUrl: coverUrl(data.cover as Cover | undefined),
    author: author || undefined,
    status: status?.label,
    url: `${siteBase}/ru/manga/${slug}`,
  };
}

export function chapterExternalId(slug: string, volume: string, number: string, branchId?: number | null): string {
  return branchId ? `${slug}~${volume}~${number}~${branchId}` : `${slug}~${volume}~${number}`;
}

export function parseChapterExternalId(externalId: string): { slug: string; volume: string; number: string; branchId?: string } {
  const parts = externalId.split("~");
  if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new SourceError("CHAPTER_NOT_FOUND", "Глава недоступна", ["back", "retry"], MANGALIB_PARSER_VERSION);
  }
  return { slug: parts[0], volume: parts[1], number: parts[2], branchId: parts[3] || undefined };
}

export function mapChapters(slug: string, items: ChapterItem[], siteBase: string): Chapter[] {
  const chapters: Chapter[] = [];
  for (const item of items) {
    const volume = String(item.volume ?? "0");
    const number = String(item.number ?? "");
    if (!number) continue;
    const branch = (item.branches ?? []).find((row) => row.restricted_view?.is_open !== false) ?? item.branches?.[0];
    if (branch?.restricted_view?.is_open === false) continue;
    const sortValue = Number(String(number).replace(",", "."));
    const label = item.name ? `${number} — ${item.name}` : number;
    chapters.push({
      externalId: chapterExternalId(slug, volume, number, branch?.branch_id),
      displayNumber: label,
      sortValue: Number.isFinite(sortValue) ? sortValue : item.index,
      title: item.name ?? undefined,
      url: `${siteBase}/ru/${slug}/read/v${volume}/c${number}`,
    });
  }
  return chapters.sort((a, b) => (a.sortValue ?? 0) - (b.sortValue ?? 0) || a.displayNumber.localeCompare(b.displayNumber));
}

export function mapPages(pages: Array<{ url?: string; slug?: number }>, server: string): Page[] {
  const images = pages
    .map((page, index) => {
      if (!page.url) return null;
      return { number: index + 1, imageUrl: joinImage(server, page.url) };
    })
    .filter((page): page is Page => page !== null);
  if (images.length === 0) {
    throw new SourceError("PAGES_NOT_FOUND", "Не вдалося завантажити сторінки", ["retry"], MANGALIB_PARSER_VERSION);
  }
  return images;
}

export function joinImage(server: string, path: string): string {
  if (path.startsWith("https://") || path.startsWith("http://")) return path;
  return `${server.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function pickImageServer(servers: Array<{ id?: string; url?: string; site_ids?: number[] }>): string {
  const forSite = servers.filter((server) => !server.site_ids || server.site_ids.includes(1));
  const main = forSite.find((server) => server.id === "main" && server.url);
  return main?.url || forSite.find((server) => server.url)?.url || "https://img2.imglib.info";
}
