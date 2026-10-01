import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("api/v1")
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Public()
  @Get("health")
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException("База даних недоступна");
    }
  }
}
