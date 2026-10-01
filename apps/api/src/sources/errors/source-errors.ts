import { SourceErrorAction, SourceErrorCode } from "@koma/shared";

export class SourceError extends Error {
  constructor(
    readonly code: SourceErrorCode,
    message: string,
    readonly actions: SourceErrorAction[] = [],
    readonly parserVersion?: string,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export function statusForSourceError(code: SourceErrorCode): number {
  switch (code) {
    case "TITLE_NOT_FOUND":
    case "CHAPTER_NOT_FOUND":
    case "PAGES_NOT_FOUND":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "TIMEOUT":
      return 504;
    case "SEARCH_FAILED":
    case "PARSER_ERROR":
    case "SOURCE_UNAVAILABLE":
      return 502;
    default:
      return 502;
  }
}
