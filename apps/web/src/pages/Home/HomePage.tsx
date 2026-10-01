import { ContinueItem } from "@koma/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { MangaCard } from "../../components/MangaCard/MangaCard";
import { SourceSelector } from "../../components/SourceSelector/SourceSelector";
import { SOURCE_LABEL, useAppState } from "../../store/app-store";

function continuePath(item: ContinueItem): string {
  const params = new URLSearchParams({
    title: item.externalTitleId,
    page: String(item.page),
    name: item.titleName,
    label: item.chapterNumber,
    uts: item.userTitleSourceId,
  });
  if (item.coverUrl) params.set("cover", item.coverUrl);
  return `/read/${item.sourceCode}/${encodeURIComponent(item.externalChapterId)}?${params.toString()}`;
}

export function HomePage() {
  const navigate = useNavigate();
  const { source, setSource } = useAppState();
  const [current, setCurrent] = useState<ContinueItem | null>(null);
  const [recent, setRecent] = useState<ContinueItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.progress().then((data) => {
      setCurrent(data.continue);
      setRecent(data.items.slice(0, 5));
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <section className="page">
      <header className="mast">
        <p className="eyebrow">Telegram reader</p>
        <h1>KOMA</h1>
        <p className="lede">Одне джерело за раз. Каталог живе на сайті, тут лишається лише ваше місце в главі.</p>
      </header>
      <SourceSelector value={source} onChange={setSource} />
      {error ? <p className="meta">{error}</p> : null}
      {current ? (
        <article className="continue">
          <p className="eyebrow">Продовжити</p>
          <h2>{current.titleName}</h2>
          <p>{SOURCE_LABEL[current.sourceCode] ?? current.sourceCode} · {current.chapterNumber} · стор. {current.page}</p>
          <button type="button" className="accent" onClick={() => navigate(continuePath(current))}>Відкрити сторінку {current.page}</button>
        </article>
      ) : (
        <div className="empty-card">
          <h2>Ще немає місця, куди повернутися</h2>
          <p>Знайдіть тайтл у вибраному джерелі. Прогрес збережеться саме для нього.</p>
          <button type="button" onClick={() => navigate("/search")}>До пошуку</button>
        </div>
      )}
      {recent.length > 0 ? (
        <div className="stack">
          <h2 className="section">Нещодавно</h2>
          {recent.map((item) => (
            <MangaCard
              key={`${item.userTitleSourceId}-${item.externalChapterId}`}
              title={item.titleName}
              coverUrl={item.coverUrl}
              meta={`${SOURCE_LABEL[item.sourceCode] ?? item.sourceCode} · ${item.chapterNumber} · стор. ${item.page}`}
              onClick={() => navigate(continuePath(item))}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
