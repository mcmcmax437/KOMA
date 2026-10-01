import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramWebAppUser {
  id: string;
  username?: string;
  firstName?: string;
}

const MAX_AGE_SEC = 60 * 60 * 24;

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  nowSec = Math.floor(Date.now() / 1000),
): TelegramWebAppUser {
  if (!botToken) throw new Error("Bot token is not configured");
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing hash");

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  const left = Buffer.from(calculated);
  const right = Buffer.from(hash);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid init data");
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || nowSec - authDate > MAX_AGE_SEC || authDate > nowSec + 60) {
    throw new Error("init data expired");
  }

  const rawUser = params.get("user");
  if (!rawUser) throw new Error("Missing user");
  const user = JSON.parse(rawUser) as { id?: number | string; username?: string; first_name?: string };
  if (user.id === undefined || user.id === null) throw new Error("Missing telegram id");
  return {
    id: String(user.id),
    username: user.username,
    firstName: user.first_name,
  };
}
