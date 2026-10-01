import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { isSourceCode, LibraryTitle } from "@koma/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export function parseDbId(id: string): bigint {
  if (!/^\d+$/.test(id)) throw new BadRequestException("Некоректний id");
  return BigInt(id);
}

type TitleWithSources = Prisma.UserTitleGetPayload<{
  include: { sources: { include: { progress: true } } };
}>;

@Injectable()
export class LibraryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<LibraryTitle[]> {
    const titles = await this.prisma.userTitle.findMany({
      where: { userId: parseDbId(userId) },
      orderBy: { updatedAt: "desc" },
      include: {
        sources: {
          include: { progress: { orderBy: { updatedAt: "desc" }, take: 1 } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return titles.map((title) => this.serialize(title));
  }

  async createTitle(userId: string, titleName: string, coverUrl?: string): Promise<LibraryTitle> {
    const title = await this.prisma.userTitle.create({
      data: {
        userId: parseDbId(userId),
        titleName: titleName.trim(),
        coverUrl: coverUrl?.trim() || null,
      },
      include: { sources: { include: { progress: true } } },
    });
    return this.serialize(title);
  }

  async attachSource(
    userId: string,
    userTitleId: string,
    input: { sourceCode: string; externalTitleId: string; externalTitleUrl: string; titleName?: string; coverUrl?: string },
  ) {
    if (!isSourceCode(input.sourceCode)) throw new BadRequestException("Невідоме джерело");
    const uid = parseDbId(userId);
    const existing = await this.prisma.userTitleSource.findFirst({
      where: {
        sourceCode: input.sourceCode,
        externalTitleId: input.externalTitleId,
        userTitle: { userId: uid },
      },
    });
    if (existing) return { userTitleId: existing.userTitleId.toString(), userTitleSourceId: existing.id.toString() };

    const titleId = parseDbId(userTitleId);
    const title = await this.prisma.userTitle.findFirst({ where: { id: titleId, userId: uid } });
    if (!title) throw new NotFoundException("Тайтл не знайдено в бібліотеці");

    const slot = await this.prisma.userTitleSource.findUnique({
      where: { userTitleId_sourceCode: { userTitleId: titleId, sourceCode: input.sourceCode } },
    });
    if (slot) throw new ConflictException("Це джерело вже прив’язане до тайтлу");

    const created = await this.prisma.userTitleSource.create({
      data: {
        userTitleId: titleId,
        sourceCode: input.sourceCode,
        externalTitleId: input.externalTitleId,
        externalTitleUrl: input.externalTitleUrl,
      },
    });
    if (input.titleName || input.coverUrl) {
      await this.prisma.userTitle.update({
        where: { id: titleId },
        data: {
          titleName: input.titleName?.trim() || undefined,
          coverUrl: input.coverUrl?.trim() || undefined,
        },
      });
    }
    return { userTitleId: titleId.toString(), userTitleSourceId: created.id.toString() };
  }

  async removeSource(userId: string, userTitleSourceId: string): Promise<void> {
    const row = await this.ownedSource(userId, userTitleSourceId);
    await this.prisma.userTitleSource.delete({ where: { id: row.id } });
    const left = await this.prisma.userTitleSource.count({ where: { userTitleId: row.userTitleId } });
    if (left === 0) await this.prisma.userTitle.delete({ where: { id: row.userTitleId } });
  }

  async ownedSource(userId: string, userTitleSourceId: string) {
    const row = await this.prisma.userTitleSource.findFirst({
      where: { id: parseDbId(userTitleSourceId), userTitle: { userId: parseDbId(userId) } },
      include: { userTitle: { include: { user: true } } },
    });
    if (!row) throw new NotFoundException("Джерело не знайдено");
    return row;
  }

  private serialize(title: TitleWithSources): LibraryTitle {
    return {
      id: title.id.toString(),
      titleName: title.titleName,
      coverUrl: title.coverUrl,
      createdAt: title.createdAt.toISOString(),
      sources: title.sources.map((source) => {
        const progress = source.progress[0];
        return {
          id: source.id.toString(),
          sourceCode: source.sourceCode,
          externalTitleId: source.externalTitleId,
          externalTitleUrl: source.externalTitleUrl,
          notificationsEnabled: source.notificationsEnabled,
          lastKnownChapter: source.lastKnownChapter,
          progress: progress
            ? {
                externalChapterId: progress.externalChapterId,
                chapterNumber: progress.chapterNumber,
                page: progress.page,
                progressPercent: Number(progress.progressPercent),
                completed: progress.completed,
                updatedAt: progress.updatedAt.toISOString(),
              }
            : null,
        };
      }),
    };
  }
}
