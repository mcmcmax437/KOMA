import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { SourceSelector } from "../../components/SourceSelector/SourceSelector";
import { useAppState } from "../../store/app-store";

export function SettingsPage() {
  const { settings, updateSettings, user, source, setSource } = useAppState();
  const [stats, setStats] = useState<{ titles: number; sessions: number } | null>(null);
  const name = user?.firstName || user?.username || "Читач";

  useEffect(() => {
    Promise.all([api.library(), api.history()])
      .then(([titles, history]) => setStats({ titles: titles.length, sessions: history.items.length }))
      .catch(() => setStats(null));
  }, []);

  return (
    <section className="page">
      <header className="hero compact">
        <h1>Акаунт</h1>
      </header>

      <article className="profile">
        <div className="avatar large">{name.slice(0, 1).toUpperCase()}</div>
        <div>
          <h2>{name}</h2>
          <p className="meta">{user?.username ? `@${user.username} · ` : ""}Telegram {user?.telegramId}</p>
        </div>
      </article>

      <div className="stats">
        <div><strong>{stats?.titles ?? "—"}</strong><small>на полиці</small></div>
        <div><strong>{stats?.sessions ?? "—"}</strong><small>сесій читання</small></div>
      </div>

      <fieldset>
        <legend>Джерело за замовчуванням</legend>
        <SourceSelector value={source} onChange={setSource} />
      </fieldset>
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
