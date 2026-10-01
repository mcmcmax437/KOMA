import { BadRequestException, Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { FeedSort, SourceCode } from "@koma/shared";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { RateLimit } from "../common/rate-limit.guard";
import { FEED_SORTS, SOURCE_CODES } from "@koma/shared";
import { SourceManager } from "./source-manager.service";

class FeedQueryDto {
  @IsIn(SOURCE_CODES)
  source!: SourceCode;

  @IsOptional()
  @IsIn(FEED_SORTS)
  sort?: FeedSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page?: number;
}

class SearchQueryDto {
  @IsIn(SOURCE_CODES)
  source!: SourceCode;

  @IsString()
  @Length(1, 120)
  q!: string;
}

function assertExternalId(id: string): string {
  if (!/^[\w.~:-]{1,255}$/.test(id) || id.includes("..")) {
    throw new BadRequestException("Некоректний ідентифікатор");
  }
  return id;
}

@Controller("api/v1")
export class SourcesController {
  constructor(@Inject(SourceManager) private readonly sources: SourceManager) {}

  @Get("sources")
  list() {
    return { sources: this.sources.list() };
  }

  @RateLimit("search")
  @Get("search")
  async search(@Query() query: SearchQueryDto) {
    const started = Date.now();
    const source = this.sources.get(query.source);
    const results = await source.search(query.q.trim());
    return { source: source.code, query: query.q.trim(), results, meta: { durationMs: Date.now() - started } };
  }

  @RateLimit("title")
  @Get("feed")
  async feed(@Query() query: FeedQueryDto) {
    const started = Date.now();
    const source = this.sources.get(query.source);
    const sort = query.sort ?? "popular";
    const page = query.page ?? 1;
    const result = await source.browse(sort, page);
    return { source: source.code, sort, page, ...result, meta: { durationMs: Date.now() - started } };
  }

  @RateLimit("title")
  @Get("title/:source/:externalTitleId")
  async title(@Param("source") sourceCode: string, @Param("externalTitleId") externalTitleId: string) {
    const started = Date.now();
    const source = this.sources.get(sourceCode);
    const title = await source.getTitle(assertExternalId(externalTitleId));
    return { source: source.code, title, meta: { durationMs: Date.now() - started } };
  }

  @RateLimit("title")
  @Get("title/:source/:externalTitleId/chapters")
  async chapters(@Param("source") sourceCode: string, @Param("externalTitleId") externalTitleId: string) {
    const started = Date.now();
    const source = this.sources.get(sourceCode);
    const id = assertExternalId(externalTitleId);
    const chapters = await source.getChapters(id);
    return { source: source.code, externalTitleId: id, chapters, meta: { durationMs: Date.now() - started } };
  }

  @RateLimit("chapter")
  @Get("chapter/:source/:externalChapterId")
  async chapter(@Param("source") sourceCode: string, @Param("externalChapterId") externalChapterId: string) {
    const started = Date.now();
    const source = this.sources.get(sourceCode);
    const details = await source.getChapter(assertExternalId(externalChapterId));
    return { source: source.code, chapter: details.chapter, pages: details.pages, meta: { durationMs: Date.now() - started } };
  }
}
