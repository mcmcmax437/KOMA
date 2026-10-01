import { loadConfig } from "../../config";
import { SourceError } from "../errors/source-errors";
import { MANGALIB_PARSER_VERSION, pickImageServer } from "./mangalib.mapper";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export class MangalibClient {
  private chain: Promise<unknown> = Promise.resolve();
  private lastAt = 0;
  private imageServer: { at: number; url: string } | null = null;

  constructor(
    private readonly apiUrl = loadConfig().mangalibApiUrl,
    private readonly siteUrl = loadConfig().mangalibBaseUrl,
  ) {}

  get siteBase(): string {
    return this.siteUrl;
  }

  search(query: string): Promise<unknown> {
    const params = new URLSearchParams({ q: query, page: "1" });
    params.append("site_id[]", "1");
    return this.getJson(`/api/manga?${params.toString()}`, "search");
  }

  browse(sortBy: "views" | "last_chapter_at", page: number): Promise<unknown> {
    const params = new URLSearchParams({ page: String(page), sort_by: sortBy });
    params.append("site_id[]", "1");
    return this.getJson(`/api/manga?${params.toString()}`, "search");
  }

  title(slug: string): Promise<unknown> {
    const params = new URLSearchParams();
    for (const field of ["summary", "authors", "eng_name", "otherNames", "rate"]) params.append("fields[]", field);
    return this.getJson(`/api/manga/${encodeURIComponent(slug)}?${params.toString()}`, "title");
  }

  chapters(slug: string): Promise<unknown> {
    return this.getJson(`/api/manga/${encodeURIComponent(slug)}/chapters`, "title");
  }

  chapter(slug: string, volume: string, number: string, branchId?: string): Promise<unknown> {
    const params = new URLSearchParams({ volume, number });
    if (branchId) params.set("branch_id", branchId);
    return this.getJson(`/api/manga/${encodeURIComponent(slug)}/chapter?${params.toString()}`, "chapter");
  }

  async imageServerUrl(): Promise<string> {
    if (this.imageServer && Date.now() - this.imageServer.at < 60 * 60 * 1000) return this.imageServer.url;
    try {
      const body = (await this.getJson("/api/constants?fields[]=imageServers", "title")) as {
        data?: { imageServers?: Array<{ id?: string; url?: string; site_ids?: number[] }> };
      };
      const url = pickImageServer(body.data?.imageServers ?? []);
      this.imageServer = { at: Date.now(), url };
      return url;
    } catch {
      return "https://img2.imglib.info";
    }
  }

  private async getJson(path: string, kind: "search" | "title" | "chapter"): Promise<unknown> {
    return this.schedule(async () => {
      const timeout = loadConfig().sourceTimeoutMs;
      try {
        const response = await fetch(`${this.apiUrl}${path}`, {
          signal: AbortSignal.timeout(timeout),
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
            Referer: `${this.siteUrl}/`,
            "Site-Id": "1",
          },
        });
        if (response.status === 404) {
          throw new SourceError(
            kind === "chapter" ? "CHAPTER_NOT_FOUND" : "TITLE_NOT_FOUND",
            kind === "chapter" ? "Глава недоступна" : "Тайтл не знайдено на цьому джерелі",
            kind === "chapter" ? ["back", "retry"] : ["switch_source"],
            MANGALIB_PARSER_VERSION,
          );
        }
        if (response.status === 429 || response.status === 403) {
          throw new SourceError("RATE_LIMITED", "Джерело тимчасово обмежує запити", ["later", "switch_source"], MANGALIB_PARSER_VERSION);
        }
        if (!response.ok) {
          throw new SourceError(
            kind === "search" ? "SEARCH_FAILED" : "SOURCE_UNAVAILABLE",
            kind === "search" ? "Пошук не вдався" : "Джерело тимчасово недоступне",
            ["retry", "switch_source"],
            MANGALIB_PARSER_VERSION,
          );
        }
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("json")) {
          throw new SourceError("SOURCE_UNAVAILABLE", "Джерело тимчасово недоступне", ["retry", "switch_source"], MANGALIB_PARSER_VERSION);
        }
        return (await response.json()) as unknown;
      } catch (error) {
        if (error instanceof SourceError) throw error;
        const name = error instanceof Error ? error.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new SourceError("TIMEOUT", "Джерело відповідає надто довго", ["retry", "switch_source"], MANGALIB_PARSER_VERSION);
        }
        throw new SourceError("SOURCE_UNAVAILABLE", "Джерело тимчасово недоступне", ["retry", "switch_source"], MANGALIB_PARSER_VERSION);
      }
    });
  }

  private async schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const wait = 250 - (Date.now() - this.lastAt);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      this.lastAt = Date.now();
      return task();
    });
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }
}
