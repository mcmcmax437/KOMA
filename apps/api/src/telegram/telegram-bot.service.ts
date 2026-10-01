import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { loadConfig } from "../config";
import { log } from "../common/log";

interface TelegramUpdate {
  update_id: number;
  message?: { chat: { id: number }; text?: string };
}

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private stopped = false;
  private offset = 0;

  onModuleInit(): void {
    const config = loadConfig();
    if (!config.telegramBotToken || config.processRole === "worker") return;
    void this.configure();
    void this.poll();
  }

  onModuleDestroy(): void {
    this.stopped = true;
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    const token = loadConfig().telegramBotToken;
    if (!token) {
      log("warn", "telegram_skipped", { reason: "missing_token" });
      return false;
    }
    const webAppUrl = loadConfig().telegramWebAppUrl;
    const replyMarkup =
      webAppUrl.startsWith("https://")
        ? { inline_keyboard: [[{ text: "Відкрити KOMA", web_app: { url: webAppUrl } }]] }
        : undefined;
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup }),
    });
    if (!response.ok) {
      log("warn", "telegram_send_failed", { status: response.status });
      return false;
    }
    return true;
  }

  private async configure(): Promise<void> {
    const config = loadConfig();
    await this.call("setMyCommands", { commands: [{ command: "start", description: "Відкрити KOMA" }] });
    if (config.telegramWebAppUrl.startsWith("https://")) {
      await this.call("setChatMenuButton", {
        menu_button: { type: "web_app", text: "Читати", web_app: { url: config.telegramWebAppUrl } },
      });
    }
  }

  private async poll(): Promise<void> {
    while (!this.stopped) {
      try {
        const updates = await this.call<TelegramUpdate[]>("getUpdates", { offset: this.offset, timeout: 25 });
        for (const update of updates ?? []) {
          this.offset = update.update_id + 1;
          const text = update.message?.text ?? "";
          if (text.startsWith("/start")) await this.replyStart(update.message!.chat.id);
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  private async replyStart(chatId: number): Promise<void> {
    const url = loadConfig().telegramWebAppUrl;
    const keyboard = url.startsWith("https://")
      ? { keyboard: [[{ text: "Відкрити KOMA", web_app: { url } }]], resize_keyboard: true }
      : undefined;
    const text = url
      ? "KOMA — один рідер, джерело обираєте ви. Відкрийте мінізастосунок, щоб шукати й читати."
      : "KOMA запущено, але TELEGRAM_WEBAPP_URL ще не задано.";
    await this.call("sendMessage", { chat_id: chatId, text, reply_markup: keyboard });
  }

  private async call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const token = loadConfig().telegramBotToken;
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(method === "getUpdates" ? 35_000 : 10_000),
    });
    const payload = (await response.json()) as { ok: boolean; result: T };
    if (!payload.ok) throw new Error(method);
    return payload.result;
  }
}
