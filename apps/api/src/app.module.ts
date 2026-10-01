import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { LoggingInterceptor } from "./common/logging.interceptor";
import { RateLimitGuard } from "./common/rate-limit.guard";
import { HealthController } from "./health/health.controller";
import { LibraryModule } from "./library/library.module";
import { MediaModule } from "./media/media.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProgressModule } from "./progress/progress.module";
import { SourcesModule } from "./sources/sources.module";
import { TelegramModule } from "./telegram/telegram.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    TelegramModule,
    AuthModule,
    SourcesModule,
    LibraryModule,
    ProgressModule,
    NotificationsModule,
    MediaModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
