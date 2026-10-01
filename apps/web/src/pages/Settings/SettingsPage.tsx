import { useAppState } from "../../store/app-store";

export function SettingsPage() {
  const { settings, updateSettings, user } = useAppState();
  return (
    <section className="page">
      <header className="mast compact">
        <h1>Налаштування</h1>
        <p className="lede">{user?.firstName || user?.username || "Читач"} · Telegram {user?.telegramId}</p>
      </header>
      <fieldset>
        <legend>Тема</legend>
        <div className="segment">
          <button type="button" className={settings.theme === "dark" ? "on" : ""} onClick={() => updateSettings({ theme: "dark" })}>Ніч</button>
          <button type="button" className={settings.theme === "light" ? "on" : ""} onClick={() => updateSettings({ theme: "light" })}>Папір</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Рідер</legend>
        <div className="segment">
          <button type="button" className={settings.fit === "width" ? "on" : ""} onClick={() => updateSettings({ fit: "width" })}>На ширину</button>
          <button type="button" className={settings.fit === "contain" ? "on" : ""} onClick={() => updateSettings({ fit: "contain" })}>Ціла сторінка</button>
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.preload} onChange={(event) => updateSettings({ preload: event.target.checked })} />
          Підвантажувати наступні 2 сторінки
        </label>
      </fieldset>
      <p className="meta">Сповіщення про нові глави вмикаються окремо для кожного джерела в картці тайтлу. Перевірка — раз на день.</p>
    </section>
  );
}
