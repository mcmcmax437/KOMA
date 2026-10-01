import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { isSourceCode, SourceCode } from "@koma/shared";
import { ComxAdapter } from "./comx/comx.adapter";
import { MangalibAdapter } from "./mangalib/mangalib.adapter";
import { MangaSource } from "./manga-source.interface";

@Injectable()
export class SourceManager {
  private readonly sources: Map<SourceCode, MangaSource>;

  constructor(@Inject(ComxAdapter) comx: ComxAdapter, @Inject(MangalibAdapter) mangalib: MangalibAdapter) {
    this.sources = new Map<SourceCode, MangaSource>([
      [comx.code, comx],
      [mangalib.code, mangalib],
    ]);
  }

  list() {
    return [...this.sources.values()].map((source) => ({
      code: source.code,
      name: source.name,
      enabled: true,
    }));
  }

  get(code: string): MangaSource {
    if (!isSourceCode(code) || !this.sources.has(code)) {
      throw new BadRequestException("Невідоме джерело");
    }
    return this.sources.get(code)!;
  }
}
