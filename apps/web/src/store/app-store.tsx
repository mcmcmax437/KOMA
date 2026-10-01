import { SourceCode, UserProfile } from "@koma/shared";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { applyTelegramChrome } from "../telegram/telegram";

export interface Settings {
  theme: "dark" | "light";
  fit: "width" | "contain";
  preload: boolean;
}

const SETTINGS_KEY = "koma_settings";
const SOURCE_KEY = "koma_source";

const defaultSettings: Settings = { theme: "dark", fit: "width", preload: true };

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

interface AppState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  source: SourceCode;
  setSource: (source: SourceCode) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [source, setSourceState] = useState<SourceCode>((localStorage.getItem(SOURCE_KEY) as SourceCode) || "comx");
  const [settings, setSettings] = useState<Settings>(readSettings);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    applyTelegramChrome(settings.theme);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<AppState>(() => ({
    user,
    setUser,
    source,
    setSource: (next) => {
      localStorage.setItem(SOURCE_KEY, next);
      setSourceState(next);
    },
    settings,
    updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
  }), [user, source, settings]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error("App state missing");
  return value;
}

export const SOURCE_LABEL: Record<string, string> = { comx: "Com-X", mangalib: "MangaLib" };

export function otherSource(source: SourceCode): SourceCode {
  return source === "comx" ? "mangalib" : "comx";
}
