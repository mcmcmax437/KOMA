export const SOURCE_CODES = ["comx", "mangalib"] as const;

export type SourceCode = (typeof SOURCE_CODES)[number];

export interface SourceInfo {
  code: SourceCode;
  name: string;
  enabled: boolean;
}

export const FEED_SORTS = ["popular", "updated"] as const;

export type FeedSort = (typeof FEED_SORTS)[number];

export interface SearchResult {
  externalId: string;
  title: string;
  alternativeTitles?: string[];
  coverUrl?: string;
  url: string;
  rating?: string;
  kind?: string;
  status?: string;
}

export interface FeedPage {
  items: SearchResult[];
  hasMore: boolean;
}

export interface FeedResponse extends FeedPage {
  source: SourceCode;
  sort: FeedSort;
  page: number;
  meta: { durationMs: number };
}

export interface Title {
  externalId: string;
  title: string;
  alternativeTitles?: string[];
  description?: string;
  coverUrl?: string;
  author?: string;
  status?: string;
  url: string;
}

export interface Chapter {
  externalId: string;
  displayNumber: string;
  sortValue?: number;
  title?: string;
  url: string;
}

export interface Page {
  number: number;
  imageUrl: string;
}

export interface ChapterDetails {
  externalId: string;
  chapter: Chapter;
  pages: Page[];
}

export type SourceErrorCode =
  | "SOURCE_UNAVAILABLE"
  | "SEARCH_FAILED"
  | "TITLE_NOT_FOUND"
  | "CHAPTER_NOT_FOUND"
  | "PAGES_NOT_FOUND"
  | "RATE_LIMITED"
  | "PARSER_ERROR"
  | "TIMEOUT";

export type SourceErrorAction = "retry" | "switch_source" | "back" | "later";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    actions?: SourceErrorAction[];
  };
  requestId?: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
}

export interface SearchResponse {
  source: SourceCode;
  query: string;
  results: SearchResult[];
  meta: { durationMs: number };
}

export interface TitleResponse {
  source: SourceCode;
  title: Title;
  meta: { durationMs: number };
}

export interface ChaptersResponse {
  source: SourceCode;
  externalTitleId: string;
  chapters: Chapter[];
  meta: { durationMs: number };
}

export interface ChapterResponse {
  source: SourceCode;
  chapter: Chapter;
  pages: Page[];
  meta: { durationMs: number };
}

export interface LibrarySource {
  id: string;
  sourceCode: string;
  externalTitleId: string;
  externalTitleUrl: string;
  notificationsEnabled: boolean;
  lastKnownChapter: string | null;
  progress: {
    externalChapterId: string;
    chapterNumber: string;
    page: number;
    progressPercent: number;
    completed: boolean;
    updatedAt: string;
  } | null;
}

export interface LibraryTitle {
  id: string;
  titleName: string;
  coverUrl: string | null;
  createdAt: string;
  sources: LibrarySource[];
}

export interface ContinueItem {
  userTitleId: string;
  userTitleSourceId: string;
  titleName: string;
  coverUrl: string | null;
  sourceCode: string;
  externalTitleId: string;
  externalChapterId: string;
  chapterNumber: string;
  page: number;
  progressPercent: number;
  completed: boolean;
  updatedAt: string;
}

export interface ProgressResponse {
  continue: ContinueItem | null;
  items: ContinueItem[];
}

export interface HistoryItem {
  id: string;
  userTitleSourceId: string;
  titleName: string;
  coverUrl: string | null;
  sourceCode: string;
  externalTitleId: string;
  externalChapterId: string;
  chapterNumber: string;
  lastPage: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface HistoryResponse {
  items: HistoryItem[];
}

export function isSourceCode(value: string): value is SourceCode {
  return (SOURCE_CODES as readonly string[]).includes(value);
}
