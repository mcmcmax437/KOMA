import "reflect-metadata";

process.env.PROCESS_ROLE = "worker";

async function bootstrap(): Promise<void> {
  const { NestFactory } = await import("@nestjs/core");
  const { AppModule } = await import("./app.module");
  const app = await NestFactory.createApplicationContext(AppModule);
  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void bootstrap();
