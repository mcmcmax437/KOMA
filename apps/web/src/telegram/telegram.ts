export function telegramWebApp() {
  return window.Telegram?.WebApp;
}

export function applyTelegramChrome(theme: "dark" | "light"): void {
  const webApp = telegramWebApp();
  if (!webApp) return;
  const color = theme === "dark" ? "#12110e" : "#f6f1e7";
  try {
    webApp.setHeaderColor(color);
    webApp.setBackgroundColor(color);
  } catch {
    /* older clients */
  }
}
