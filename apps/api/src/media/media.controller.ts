import { BadRequestException, Controller, Get, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { Readable } from "node:stream";
import { IsString, MaxLength } from "class-validator";
import { loadConfig } from "../config";
import { RateLimit } from "../common/rate-limit.guard";
import { isAllowedImageUrl } from "../domain/reading";

class MediaQueryDto {
  @IsString()
  @MaxLength(2000)
  url!: string;
}

function refererFor(url: string): string {
  const host = new URL(url).hostname;
  if (host.endsWith("com-x.life")) return "https://com-x.life/";
  return "https://mangalib.me/";
}

@Controller("api/v1")
export class MediaController {
  @RateLimit("media")
  @Get("media")
  async media(@Query() query: MediaQueryDto, @Res() res: Response): Promise<void> {
    const config = loadConfig();
    if (!isAllowedImageUrl(query.url, config.imageHostAllowlist)) {
      throw new BadRequestException("Цю адресу не можна проксувати");
    }
    const upstream = await fetch(query.url, {
      signal: AbortSignal.timeout(config.sourceTimeoutMs),
      headers: { Accept: "image/*,*/*", Referer: refererFor(query.url) },
    });
    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.startsWith("image/") || !upstream.body) {
      throw new BadRequestException("Зображення недоступне");
    }
    res.setHeader("Content-Type", type.split(";")[0]);
    res.setHeader("Cache-Control", "private, max-age=300");
    Readable.fromWeb(upstream.body as import("stream/web").ReadableStream).pipe(res);
  }
}
