export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  jwtSecret: string;
  telegramBotToken: string;
  telegramWebAppUrl: string;
  comxBaseUrl: string;
  mangalibBaseUrl: string;
  mangalibApiUrl: string;
  allowDevAuth: boolean;
  logLevel: string;
  processRole: string;
  runScheduler: boolean;
  imageHostAllowlist: string[];
  sourceTimeoutMs: number;
  webOrigin: string | true;
}

export function loadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const jwtSecret = process.env.JWT_SECRET ?? "";
  if (nodeEnv === "production" && jwtSecret.length < 16) {
    throw new Error("JWT_SECRET must be set to a long random string in production");
  }
  const origin = process.env.WEB_ORIGIN?.trim();
  return {
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST?.trim() || "0.0.0.0",
    nodeEnv,
    jwtSecret: jwtSecret || "dev-only-change-me",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    telegramWebAppUrl: (process.env.TELEGRAM_WEBAPP_URL ?? "").replace(/\/$/, ""),
    comxBaseUrl: (process.env.COMX_BASE_URL ?? "https://com-x.life").replace(/\/$/, ""),
    mangalibBaseUrl: (process.env.MANGALIB_BASE_URL ?? "https://mangalib.me").replace(/\/$/, ""),
    mangalibApiUrl: (process.env.MANGALIB_API_URL ?? "https://api.cdnlibs.org").replace(/\/$/, ""),
    allowDevAuth: process.env.ALLOW_DEV_AUTH === "true" && nodeEnv !== "production",
    logLevel: process.env.LOG_LEVEL ?? "info",
    processRole: process.env.PROCESS_ROLE ?? "api",
    runScheduler: process.env.RUN_SCHEDULER === "true",
    imageHostAllowlist: (process.env.IMAGE_HOST_ALLOWLIST ?? "com-x.life,cdnlibs.org,imglib.info,mangalib.me")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
    sourceTimeoutMs: Number(process.env.SOURCE_TIMEOUT_MS ?? 12000),
    webOrigin: origin && origin !== "*" ? origin : true,
  };
}
