import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/jwt-auth.guard";
import { ProgressService } from "./progress.service";

class UpsertProgressDto {
  @IsString()
  userTitleSourceId!: string;

  @IsString()
  @MaxLength(255)
  externalChapterId!: string;

  @IsString()
  @MaxLength(100)
  chapterNumber!: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  page!: number;

  @IsInt()
  @Min(1)
  @Max(10000)
  totalPages!: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

@Controller("api/v1")
export class ProgressController {
  constructor(@Inject(ProgressService) private readonly progress: ProgressService) {}

  @Get("progress")
  get(@CurrentUser() user: AuthUser) {
    return this.progress.get(user.id);
  }

  @Post("progress")
  save(@CurrentUser() user: AuthUser, @Body() body: UpsertProgressDto) {
    return this.progress.upsert(user.id, body);
  }

  @Get("history")
  history(@CurrentUser() user: AuthUser) {
    return this.progress.history(user.id).then((items) => ({ items }));
  }
}
