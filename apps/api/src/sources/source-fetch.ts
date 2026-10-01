import { loadConfig } from "../config";

interface SourceFetchInit {
  headers: Record<string, string>;
  signal: AbortSignal;
}

interface FetcherReply {
  status: number;
  contentType?: string;
  body: string;
}

/**
 * Requests a source URL. With FETCHER_URL set it goes through the Camoufox service,
 * otherwise (or if that service is unreachable) it uses plain fetch.
 */
export async function sourceFetch(url: string, init: SourceFetchInit): Promise<Response> {
  const fetcher = loadConfig().fetcherUrl;
  if (!fetcher) return fetch(url, init);
  try {
    const reply = await fetch(`${fetcher}/fetch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, headers: init.headers, timeoutMs: loadConfig().sourceTimeoutMs }),
      signal: init.signal,
    });
    if (!reply.ok) return fetch(url, init);
    const data = (await reply.json()) as FetcherReply;
    return new Response(data.body, {
      status: data.status,
      headers: { "content-type": data.contentType ?? "" },
    });
  } catch (error) {
    if (init.signal.aborted) throw error;
    return fetch(url, init);
  }
}
