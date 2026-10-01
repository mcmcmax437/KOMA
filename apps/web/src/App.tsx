import { SourceCode, UserProfile } from "@koma/shared";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, setToken, token } from "./api/client";
import { AppShell } from "./components/AppShell/AppShell";
import { HomePage } from "./pages/Home/HomePage";
import { LibraryPage } from "./pages/Library/LibraryPage";
import { ReaderPage } from "./pages/Reader/ReaderPage";
import { SearchPage } from "./pages/Search/SearchPage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import { TitlePage } from "./pages/Title/TitlePage";
import { useAppState } from "./store/app-store";
import { applyTelegramChrome, telegramWebApp } from "./telegram/telegram";

export function App() {
  const { setUser, settings, setSource } = useAppState();
  const [status, setStatus] = useState<"loading" | "ready" | "blocked">("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const webApp = telegramWebApp();
    webApp?.ready();
    webApp?.expand();
    applyTelegramChrome(settings.theme);
    const start = webApp?.initDataUnsafe.start_param;
    if (start?.startsWith("src_")) {
      const code = start.slice(4);
      if (code === "comx" || code === "mangalib") setSource(code as SourceCode);
    }

    const existing = token();
    const initData = webApp?.initData ?? "";
    const login = initData
      ? api.telegram(initData)
      : import.meta.env.DEV
        ? api.dev()
        : existing
          ? api.me().then((user) => ({ user, accessToken: existing, expiresIn: 0 }))
          : Promise.reject(new Error("Відкрийте KOMA з Telegram"));

    login
      .then((session) => {
        if ("accessToken" in session && session.accessToken && initData) setToken(session.accessToken);
        if ("accessToken" in session && session.accessToken && import.meta.env.DEV && !initData) setToken(session.accessToken);
        setUser(session.user as UserProfile);
        setStatus("ready");
      })
      .catch((reason: Error) => {
        setMessage(reason.message || "Не вдалося увійти");
        setStatus("blocked");
      });
  }, []);

  useEffect(() => {
    const webApp = telegramWebApp();
    if (!webApp) return;
    const back = () => navigate(-1);
    webApp.BackButton.onClick(back);
    if (window.location.pathname !== "/") webApp.BackButton.show();
    else webApp.BackButton.hide();
    return () => webApp.BackButton.offClick(back);
  });

  if (status === "loading") return <main className="phone"><p className="boot">Відкриваю KOMA…</p></main>;
  if (status === "blocked") {
    return (
      <main className="phone">
        <section className="page">
          <h1>KOMA</h1>
          <p>{message}</p>
        </section>
      </main>
    );
  }

  const reading = location.pathname.startsWith("/read/");

  const routes = (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/title/:source/:externalId" element={<TitlePage />} />
      <Route path="/read/:source/:chapterId" element={<ReaderPage />} />
      <Route path="/list" element={<LibraryPage />} />
      <Route path="/account" element={<SettingsPage />} />
      <Route path="/library" element={<Navigate to="/list" replace />} />
      <Route path="/history" element={<Navigate to="/list?tab=history" replace />} />
      <Route path="/settings" element={<Navigate to="/account" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <main className="phone">
      {reading ? routes : <AppShell>{routes}</AppShell>}
    </main>
  );
}
