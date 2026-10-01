import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import jwt from "jsonwebtoken";
import { loadConfig } from "../config";

export const IS_PUBLIC = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC, true);

export interface AuthUser {
  id: string;
  telegramId: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) throw new UnauthorizedException("Потрібна авторизація");
    try {
      const payload = jwt.verify(token, loadConfig().jwtSecret) as { sub?: string; tg?: string };
      if (!payload.sub || !payload.tg) throw new Error("bad payload");
      request.user = { id: payload.sub, telegramId: payload.tg };
      return true;
    } catch {
      throw new UnauthorizedException("Сесія недійсна");
    }
  }
}
