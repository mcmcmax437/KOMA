import { CanActivate, ExecutionContext, HttpException, Inject, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

export type RateArea = "search" | "title" | "chapter" | "media";

const LIMITS: Record<RateArea, { max: number; windowMs: number }> = {
  search: { max: 10, windowMs: 60_000 },
  title: { max: 30, windowMs: 60_000 },
  chapter: { max: 20, windowMs: 60_000 },
  media: { max: 60, windowMs: 60_000 },
};

export const RATE_AREA = "rateArea";
export const RateLimit = (area: RateArea) => SetMetadata(RATE_AREA, area);

interface Bucket {
  hits: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const area = this.reflector.getAllAndOverride<RateArea | undefined>(RATE_AREA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!area) return true;
    const request = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const userId = request.user?.id ?? request.ip ?? "anon";
    const source = String(request.params?.source ?? request.query?.source ?? "any");
    const key = `${userId}:${source}:${area}`;
    const policy = LIMITS[area];
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((ts) => now - ts < policy.windowMs);
    if (bucket.hits.length >= policy.max) {
      throw new HttpException("Забагато запитів. Спробуйте трохи пізніше", 429);
    }
    bucket.hits.push(now);
    this.buckets.set(key, bucket);
    return true;
  }
}
