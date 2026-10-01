import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { validateTelegramInitData } from "./telegram-init-data";

function sign(botToken: string, fields: Record<string, string>): string {
  const pairs = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .sort();
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

describe("telegram init data", () => {
  const token = "123456:test-token";
  const now = 1_700_000_000;

  it("accepts a valid payload and rejects a tampered one", () => {
    const user = JSON.stringify({ id: 42, username: "maks", first_name: "Maksym" });
    const initData = sign(token, { auth_date: String(now), user, query_id: "abc" });
    const parsed = validateTelegramInitData(initData, token, now);
    assert.equal(parsed.id, "42");
    assert.equal(parsed.username, "maks");
    assert.equal(parsed.firstName, "Maksym");

    assert.throws(() => validateTelegramInitData(initData.replace("42", "43"), token, now));
    assert.throws(() => validateTelegramInitData(initData, "other-token", now));
    assert.throws(() => validateTelegramInitData(initData, token, now + 60 * 60 * 25));
  });
});
