import { Body, Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/jwt-auth.guard";
import { LibraryService } from "./library.service";
import { NotificationsService } from "../notifications/notifications.service";

class CreateTitleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  titleName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverUrl?: string;
}

class AttachSourceDto {
  @IsString()
  sourceCode!: string;

  @IsString()
  @MaxLength(255)
  externalTitleId!: string;

  @IsUrl({ require_protocol: true })
  externalTitleUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverUrl?: string;
}

class NotificationsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

@Controller("api/v1/library")
export class LibraryController {
  constructor(
    @Inject(LibraryService) private readonly library: LibraryService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.library.list(user.id);
  }

  @Post("titles")
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTitleDto) {
    return this.library.createTitle(user.id, body.titleName, body.coverUrl);
  }

  @Post("titles/:userTitleId/sources")
  attach(@CurrentUser() user: AuthUser, @Param("userTitleId") userTitleId: string, @Body() body: AttachSourceDto) {
    return this.library.attachSource(user.id, userTitleId, body);
  }

  @Delete("sources/:userTitleSourceId")
  async remove(@CurrentUser() user: AuthUser, @Param("userTitleSourceId") userTitleSourceId: string) {
    await this.library.removeSource(user.id, userTitleSourceId);
    return { ok: true };
  }

  @Post("sources/:id/notifications")
  enable(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() _body: NotificationsDto) {
    return this.notifications.setEnabled(user.id, id, true);
  }

  @Delete("sources/:id/notifications")
  disable(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notifications.setEnabled(user.id, id, false);
  }
}
