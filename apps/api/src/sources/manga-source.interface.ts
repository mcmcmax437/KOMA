import { Chapter, ChapterDetails, SearchResult, SourceCode, Title } from "@koma/shared";

export interface MangaSource {
  readonly code: SourceCode;
  readonly name: string;
  readonly parserVersion: string;
  search(query: string): Promise<SearchResult[]>;
  getTitle(externalId: string): Promise<Title>;
  getChapters(externalTitleId: string): Promise<Chapter[]>;
  getChapter(externalChapterId: string): Promise<ChapterDetails>;
  checkLatestChapter(externalTitleId: string): Promise<Chapter | null>;
}
