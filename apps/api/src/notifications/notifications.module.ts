import { Module } from "@nestjs/common";
import { SourcesModule } from "../sources/sources.module";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [SourcesModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
