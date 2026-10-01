import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ContinueItem, HistoryItem } from "@koma/shared";
import { Prisma } from "@prisma/client";
import { progressPercent, selectContinueId } from "../domain/reading";
import { parseDbId } from "../library/library.service";
import { PrismaService } from "../prisma/prisma.service";

export interface UpsertProgressInput {
  userTitleSourceId: string;
  externalChapterId: string;
  chapterNumber: string;
  page: number;
  totalPages: number;
  completed?: boolean;
}

type ProgressRow = Prisma.ReadingProgressGetPayload<{
  include: { source: { include: { userTitle: true } } };
}>;

@Injectable()
export class ProgressService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async upsert(userId: string, input: UpsertProgressInput): Promise<ContinueItem> {
    const uid = parseDbId(userId);
    const sourceId = parseDbId(input.userTitleSourceId);
    const mapping = await this.prisma.userTitleSource.findFirst({
      where: { id: sourceId, userTitle: { userId: uid } },
      include: { userTitle: true },
    });
    if (!mapping) throw new NotFoundException("Джерело не знайдено в бібліотеці");
    const percent = progressPercent(input.page, input.totalPages);
    const completed = input.completed ?? input.page >= input.totalPages;
    const row = await this.prisma.readingProgress.upsert({
      where: {
        userId_userTitleSourceId_externalChapterId: {
          userId: uid,
          userTitleSourceId: sourceId,
          externalChapterId: input.externalChapterId,
        },
      },
      create: {
        userId: uid,
        userTitleSourceId: sourceId,
        externalChapterId: input.externalChapterId,
        chapterNumber: input.chapterNumber,
        page: input.page,
        progressPercent: percent,
        completed,
      },
      update: {
        chapterNumber: input.chapterNumber,
        page: input.page,
        progressPercent: percent,
        completed,
      },
      include: { source: { include: { userTitle: true } } },
    });
    await this.touchHistory(uid, sourceId, input, completed);
    return this.serialize(row);
  }

  async get(userId: string): Promise<{ continue: ContinueItem | null; items: ContinueItem[] }> {
    const rows = await this.prisma.readingProgress.findMany({
      where: { userId: parseDbId(userId) },
      orderBy: { updatedAt: "desc" },
      take: 40,
      include: { source: { include: { userTitle: true } } },
    });
    const selected = selectContinueId(
      rows.map((row) => ({ id: row.id.toString(), updatedAt: row.updatedAt.getTime(), completed: row.completed })),
    );
    const current = rows.find((row) => row.id.toString() === selected);
    return { continue: current ? this.serialize(current) : null, items: rows.map((row) => this.serialize(row)) };
  }

  async history(userId: string): Promise<HistoryItem[]> {
    const rows = await this.prisma.readingHistory.findMany({
      where: { userId: parseDbId(userId) },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: { source: { include: { userTitle: true } } },
    });
    return rows.map((row) => ({
      id: row.id.toString(),
      userTitleSourceId: row.userTitleSourceId.toString(),
      titleName: row.source.userTitle.titleName,
      coverUrl: row.source.userTitle.coverUrl,
      sourceCode: row.source.sourceCode,
      externalTitleId: row.source.externalTitleId,
      externalChapterId: row.externalChapterId,
      chapterNumber: row.chapterNumber,
      lastPage: row.lastPage,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
    }));
  }

  private async touchHistory(userId: bigint, sourceId: bigint, input: UpsertProgressInput, completed: boolean): Promise<void> {
    const open = await this.prisma.readingHistory.findFirst({
      where: { userId, userTitleSourceId: sourceId, externalChapterId: input.externalChapterId, finishedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (open) {
      await this.prisma.readingHistory.update({
        where: { id: open.id },
        data: { lastPage: input.page, chapterNumber: input.chapterNumber, finishedAt: completed ? new Date() : null },
      });
      return;
    }
    await this.prisma.readingHistory.create({
      data: {
        userId,
        userTitleSourceId: sourceId,
        externalChapterId: input.externalChapterId,
        chapterNumber: input.chapterNumber,
        lastPage: input.page,
        finishedAt: completed ? new Date() : null,
      },
    });
  }

  private serialize(row: ProgressRow): ContinueItem {
    return {
      userTitleId: row.source.userTitleId.toString(),
      userTitleSourceId: row.userTitleSourceId.toString(),
      titleName: row.source.userTitle.titleName,
      coverUrl: row.source.userTitle.coverUrl,
      sourceCode: row.source.sourceCode,
      externalTitleId: row.source.externalTitleId,
      externalChapterId: row.externalChapterId,
      chapterNumber: row.chapterNumber,
      page: row.page,
      progressPercent: Number(row.progressPercent),
      completed: row.completed,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
