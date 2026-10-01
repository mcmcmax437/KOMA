import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthResponse } from "@koma/shared";
import jwt from "jsonwebtoken";
import { loadConfig } from "../config";
import { PrismaService } from "../prisma/prisma.service";
import { validateTelegramInitData } from "./telegram-init-data";

const TOKEN_TTL_SEC = 60 * 60 * 12;

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async loginWithTelegram(initData: string): Promise<AuthResponse> {
    const config = loadConfig();
    let telegram;
    try {
      telegram = validateTelegramInitData(initData, config.telegramBotToken);
    } catch {
      throw new UnauthorizedException("Не вдалося підтвердити Telegram");
    }
    return this.issue(BigInt(telegram.id), telegram.username ?? null, telegram.firstName ?? null);
  }

  async loginDev(): Promise<AuthResponse> {
    if (!loadConfig().allowDevAuth) {
      throw new ForbiddenException("Локальний вхід вимкнено");
    }
    return this.issue(1n, "local", "Local");
  }

  async profile(userId: string): Promise<AuthResponse["user"]> {
    const user = await this.prisma.user.findUnique({ where: { id: BigInt(userId) } });
    if (!user) throw new UnauthorizedException("Користувача не знайдено");
    await this.prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
    return {
      id: user.id.toString(),
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
    };
  }

  private async issue(telegramId: bigint, username: string | null, firstName: string | null): Promise<AuthResponse> {
    const user = await this.prisma.user.upsert({
      where: { telegramId },
      create: { telegramId, username, firstName, lastSeenAt: new Date() },
      update: { username, firstName, lastSeenAt: new Date() },
    });
    const accessToken = jwt.sign(
      { sub: user.id.toString(), tg: user.telegramId.toString() },
      loadConfig().jwtSecret,
      { expiresIn: TOKEN_TTL_SEC },
    );
    return {
      accessToken,
      expiresIn: TOKEN_TTL_SEC,
      user: {
        id: user.id.toString(),
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
      },
    };
  }
}
