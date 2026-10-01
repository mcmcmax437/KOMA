import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppState } from "../../store/app-store";
import { Icon, IconName } from "../Icon/Icon";

const NAV: Array<{ to: string; label: string; hint: string; icon: IconName }> = [
  { to: "/", label: "Головна", hint: "Тайтли з джерела", icon: "home" },
  { to: "/search", label: "Пошук", hint: "За назвою", icon: "search" },
  { to: "/list", label: "Мій список", hint: "Полиця та історія", icon: "list" },
  { to: "/account", label: "Акаунт", hint: "Профіль і налаштування", icon: "user" },
];

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "K";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAppState();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const current = NAV.find((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)));
  const name = user?.firstName || user?.username || "Читач";

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="KOMA, головна">KOMA</NavLink>
        <span className="topbar-title">{current?.label ?? ""}</span>
        <button type="button" className="icon-btn" aria-label="Відкрити меню" aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" size={22} />
        </button>
      </header>

      {children}

      <div className={open ? "scrim on" : "scrim"} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={open ? "drawer on" : "drawer"} aria-label="Меню" aria-hidden={!open} inert={!open}>
        <div className="drawer-head">
          <div className="avatar">{initials(name)}</div>
          <div className="drawer-user">
            <strong>{name}</strong>
            <small>{user?.username ? `@${user.username}` : `ID ${user?.telegramId ?? ""}`}</small>
          </div>
          <button type="button" className="icon-btn" aria-label="Закрити меню" onClick={() => setOpen(false)}>
            <Icon name="close" size={22} />
          </button>
        </div>
        <nav className="drawer-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className="drawer-link">
              <span className="drawer-icon"><Icon name={item.icon} /></span>
              <span className="drawer-text">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              <Icon name="arrow" size={16} />
            </NavLink>
          ))}
        </nav>
        <p className="drawer-foot">KOMA · читання з Com-X і MangaLib</p>
      </aside>
    </>
  );
}
