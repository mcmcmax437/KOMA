import { Module } from "@nestjs/common";
import { ComxAdapter } from "./comx/comx.adapter";
import { MangalibAdapter } from "./mangalib/mangalib.adapter";
import { SourceManager } from "./source-manager.service";
import { SourcesController } from "./sources.controller";

@Module({
  controllers: [SourcesController],
  providers: [ComxAdapter, MangalibAdapter, SourceManager],
  exports: [SourceManager],
})
export class SourcesModule {}
