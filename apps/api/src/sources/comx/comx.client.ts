import { loadConfig } from "../../config";
import { SourceError } from "../errors/source-errors";
import { sourceFetch } from "../source-fetch";
import { COMX_PARSER_VERSION, detectComxBlock } from "./comx.parser";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export class ComxClient {
  private chain: Promise<unknown> = Promise.resolve();
  private lastAt = 0;

  constructor(private readonly baseUrl = loadConfig().comxBaseUrl) {}

  async getHtml(path: string): Promise<string> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    return this.schedule(() => this.fetchHtml(url));
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

  private async fetchHtml(url: string): Promise<string> {
    const timeout = loadConfig().sourceTimeoutMs;
    try {
      const first = await sourceFetch(url, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (first.status >= 300 && first.status < 400) {
        const location = first.headers.get("location") ?? "";
        if (location.includes("/_c")) {
          throw new SourceError(
            "SOURCE_UNAVAILABLE",
            "Джерело показало перевірку доступу. KOMA не обходить такі перевірки.",
            ["retry", "switch_source"],
            COMX_PARSER_VERSION,
          );
        }
        const next = new URL(location, url).toString();
        return this.fetchHtml(next);
      }
      if (first.status === 404) {
        throw new SourceError("TITLE_NOT_FOUND", "Тайтл не знайдено на цьому джерелі", ["switch_source"], COMX_PARSER_VERSION);
      }
      if (first.status === 429 || first.status === 403) {
        throw new SourceError("RATE_LIMITED", "Джерело тимчасово обмежує запити", ["later", "switch_source"], COMX_PARSER_VERSION);
      }
      if (!first.ok) {
        throw new SourceError("SOURCE_UNAVAILABLE", "Джерело тимчасово недоступне", ["retry", "switch_source"], COMX_PARSER_VERSION);
      }
      const html = await first.text();
      if (detectComxBlock(html, first.url || url)) {
        throw new SourceError(
          "SOURCE_UNAVAILABLE",
          "Джерело показало перевірку доступу. KOMA не обходить такі перевірки.",
          ["retry", "switch_source"],
          COMX_PARSER_VERSION,
        );
      }
      return html;
    } catch (error) {
      if (error instanceof SourceError) throw error;
      const name = error instanceof Error ? error.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new SourceError("TIMEOUT", "Джерело відповідає надто довго", ["retry", "switch_source"], COMX_PARSER_VERSION);
      }
      throw new SourceError("SOURCE_UNAVAILABLE", "Джерело тимчасово недоступне", ["retry", "switch_source"], COMX_PARSER_VERSION);
    }
  }
}
