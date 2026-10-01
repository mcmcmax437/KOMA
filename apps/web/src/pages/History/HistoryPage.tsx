import { HistoryItem } from "@koma/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { SOURCE_LABEL } from "../../store/app-store";

const date = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    api.history().then((data) => setItems(data.items)).catch(() => setItems([]));
  }, []);

  return (
    <section className="page">
      <header className="mast compact"><h1>Історія</h1></header>
      {items.length === 0 ? <p className="empty">Сесій читання ще немає.</p> : null}
      <ul className="history">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams({
                  title: item.externalTitleId,
                  page: String(item.lastPage),
                  name: item.titleName,
                  label: item.chapterNumber,
                  uts: item.userTitleSourceId,
                });
                if (item.coverUrl) params.set("cover", item.coverUrl);
                navigate(`/read/${item.sourceCode}/${encodeURIComponent(item.externalChapterId)}?${params.toString()}`);
              }}
            >
              <strong>{item.titleName}</strong>
              <span>{SOURCE_LABEL[item.sourceCode] ?? item.sourceCode} · {item.chapterNumber} · стор. {item.lastPage}</span>
              <small>{date.format(new Date(item.startedAt))}{item.finishedAt ? " · прочитано" : ""}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
