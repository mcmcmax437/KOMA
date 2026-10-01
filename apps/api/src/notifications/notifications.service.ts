import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { chapterToken, isNewerChapter } from "../domain/reading";
import { log } from "../common/log";
import { parseDbId } from "../library/library.service";
import { PrismaService } from "../prisma/prisma.service";
import { SourceManager } from "../sources/source-manager.service";
import { SourceError } from "../sources/errors/source-errors";
import { TelegramBotService } from "../telegram/telegram-bot.service";

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SourceManager) private readonly sources: SourceManager,
    @Inject(TelegramBotService) private readonly telegram: TelegramBotService,
  ) {}

  async setEnabled(userId: string, userTitleSourceId: string, enabled: boolean) {
    const row = await this.prisma.userTitleSource.findFirst({
      where: { id: parseDbId(userTitleSourceId), userTitle: { userId: parseDbId(userId) } },
    });
    if (!row) throw new NotFoundException("Джерело не знайдено");
    const updated = await this.prisma.userTitleSource.update({
      where: { id: row.id },
      data: { notificationsEnabled: enabled },
    });
    if (enabled && !updated.lastKnownChapter) void this.baseline(updated.id);
    return { ok: true, notificationsEnabled: updated.notificationsEnabled };
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduled(): Promise<void> {
    const role = process.env.PROCESS_ROLE ?? "api";
    if (role !== "worker" && process.env.RUN_SCHEDULER !== "true") return;
    await this.runDailyCheck();
  }

  async runDailyCheck(): Promise<{ checked: number; notified: number }> {
    const mappings = await this.prisma.userTitleSource.findMany({
      where: { notificationsEnabled: true },
      include: { userTitle: { include: { user: true } } },
      orderBy: { sourceCode: "asc" },
    });
    let notified = 0;
    for (const mapping of mappings) {
      try {
        const sent = await this.checkOne(mapping);
        if (sent) notified += 1;
      } catch (error) {
        log("warn", "notify_check_failed", {
          source: mapping.sourceCode,
          code: error instanceof SourceError ? error.code : "UNKNOWN",
          parserVersion: error instanceof SourceError ? error.parserVersion : undefined,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    log("info", "notify_daily_done", { checked: mappings.length, notified });
    return { checked: mappings.length, notified };
  }

  private async baseline(id: bigint): Promise<void> {
    const mapping = await this.prisma.userTitleSource.findUnique({ where: { id } });
    if (!mapping || mapping.lastKnownChapter) return;
    try {
      const latest = await this.sources.get(mapping.sourceCode).checkLatestChapter(mapping.externalTitleId);
      if (!latest) return;
      await this.prisma.userTitleSource.update({
        where: { id },
        data: { lastKnownChapter: chapterToken(latest).slice(0, 100), lastCheckedAt: new Date() },
      });
    } catch (error) {
      log("warn", "notify_baseline_failed", {
        source: mapping.sourceCode,
        code: error instanceof SourceError ? error.code : "UNKNOWN",
      });
    }
  }

  private async checkOne(mapping: {
    id: bigint;
    sourceCode: string;
    externalTitleId: string;
    lastKnownChapter: string | null;
    userTitle: { titleName: string; user: { telegramId: bigint } };
  }): Promise<boolean> {
    const latest = await this.sources.get(mapping.sourceCode).checkLatestChapter(mapping.externalTitleId);
    const checkedAt = new Date();
    if (!latest) {
      await this.prisma.userTitleSource.update({ where: { id: mapping.id }, data: { lastCheckedAt: checkedAt } });
      return false;
    }
    const token = chapterToken(latest).slice(0, 100);
    if (!mapping.lastKnownChapter) {
      await this.prisma.userTitleSource.update({
        where: { id: mapping.id },
        data: { lastKnownChapter: token, lastCheckedAt: checkedAt },
      });
      return false;
    }
    if (!isNewerChapter(token, mapping.lastKnownChapter)) {
      await this.prisma.userTitleSource.update({ where: { id: mapping.id }, data: { lastCheckedAt: checkedAt } });
      return false;
    }
    const sourceName = this.sources.get(mapping.sourceCode).name;
    const sent = await this.telegram.sendMessage(
      mapping.userTitle.user.telegramId.toString(),
      `Нова глава\n${mapping.userTitle.titleName}\n${sourceName} · ${latest.displayNumber}`,
    );
    if (!sent) return false;
    await this.prisma.userTitleSource.update({
      where: { id: mapping.id },
      data: { lastKnownChapter: token, lastCheckedAt: checkedAt },
    });
    return true;
  }
}
