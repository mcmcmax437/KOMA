import {
  AuthResponse,
  Chapter,
  ChapterResponse,
  ChaptersResponse,
  HistoryResponse,
  LibraryTitle,
  ProgressResponse,
  SearchResponse,
  SourceInfo,
  TitleResponse,
  UserProfile,
} from "@koma/shared";

const TOKEN_KEY = "koma_token";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly actions: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function token(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(value: string): void {
  localStorage.setItem(TOKEN_KEY, value);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const access = token();
  if (access) headers.set("authorization", `Bearer ${access}`);
  const response = await fetch(path, { ...init, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error ?? {};
    throw new ApiError(error.code ?? "HTTP_ERROR", error.message ?? "Запит не вдався", error.actions ?? []);
  }
  return body as T;
}

export const api = {
  telegram(initData: string) {
    return request<AuthResponse>("/api/v1/auth/telegram", { method: "POST", body: JSON.stringify({ initData }) });
  },
  dev() {
    return request<AuthResponse>("/api/v1/auth/dev", { method: "POST", body: "{}" });
  },
  me() {
    return request<UserProfile>("/api/v1/me");
  },
  sources() {
    return request<{ sources: SourceInfo[] }>("/api/v1/sources");
  },
  search(source: string, q: string) {
    return request<SearchResponse>(`/api/v1/search?source=${encodeURIComponent(source)}&q=${encodeURIComponent(q)}`);
  },
  title(source: string, externalId: string) {
    return request<TitleResponse>(`/api/v1/title/${encodeURIComponent(source)}/${encodeURIComponent(externalId)}`);
  },
  chapters(source: string, externalId: string) {
    return request<ChaptersResponse>(`/api/v1/title/${encodeURIComponent(source)}/${encodeURIComponent(externalId)}/chapters`);
  },
  chapter(source: string, externalChapterId: string) {
    return request<ChapterResponse>(`/api/v1/chapter/${encodeURIComponent(source)}/${encodeURIComponent(externalChapterId)}`);
  },
  library() {
    return request<LibraryTitle[]>("/api/v1/library");
  },
  createTitle(titleName: string, coverUrl?: string) {
    return request<LibraryTitle>("/api/v1/library/titles", {
      method: "POST",
      body: JSON.stringify({ titleName, coverUrl }),
    });
  },
  attachSource(userTitleId: string, body: { sourceCode: string; externalTitleId: string; externalTitleUrl: string; titleName?: string; coverUrl?: string }) {
    return request<{ userTitleId: string; userTitleSourceId: string }>(`/api/v1/library/titles/${userTitleId}/sources`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  removeSource(userTitleSourceId: string) {
    return request<{ ok: boolean }>(`/api/v1/library/sources/${userTitleSourceId}`, { method: "DELETE" });
  },
  enableNotifications(id: string) {
    return request<{ ok: boolean; notificationsEnabled: boolean }>(`/api/v1/library/sources/${id}/notifications`, {
      method: "POST",
      body: "{}",
    });
  },
  disableNotifications(id: string) {
    return request<{ ok: boolean; notificationsEnabled: boolean }>(`/api/v1/library/sources/${id}/notifications`, { method: "DELETE" });
  },
  progress() {
    return request<ProgressResponse>("/api/v1/progress");
  },
  saveProgress(body: { userTitleSourceId: string; externalChapterId: string; chapterNumber: string; page: number; totalPages: number; completed?: boolean }) {
    return request("/api/v1/progress", { method: "POST", body: JSON.stringify(body) });
  },
  history() {
    return request<HistoryResponse>("/api/v1/history");
  },
};

export async function ensureMapping(input: {
  titleName: string;
  coverUrl?: string;
  sourceCode: string;
  externalTitleId: string;
  externalTitleUrl: string;
}): Promise<{ userTitleId: string; userTitleSourceId: string }> {
  const titles = await api.library();
  for (const title of titles) {
    for (const source of title.sources) {
      if (source.sourceCode === input.sourceCode && source.externalTitleId === input.externalTitleId) {
        return { userTitleId: title.id, userTitleSourceId: source.id };
      }
    }
  }
  const created = await api.createTitle(input.titleName, input.coverUrl);
  return api.attachSource(created.id, input);
}

export function findMapping(titles: LibraryTitle[], sourceCode: string, externalTitleId: string) {
  for (const title of titles) {
    for (const source of title.sources) {
      if (source.sourceCode === sourceCode && source.externalTitleId === externalTitleId) {
        return { title, source };
      }
    }
  }
  return null;
}

export type { Chapter };
