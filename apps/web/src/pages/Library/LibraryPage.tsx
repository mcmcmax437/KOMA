import { HistoryItem, LibrarySource, LibraryTitle } from "@koma/shared";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { Cover } from "../../components/MangaCard/Cover";
import { SOURCE_LABEL } from "../../store/app-store";

const date = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function readerPath(sourceCode: string, chapterId: string, params: Record<string, string>, cover?: string | null): string {
  const query = new URLSearchParams(params);
  if (cover) query.set("cover", cover);
  return `/read/${sourceCode}/${encodeURIComponent(chapterId)}?${query.toString()}`;
}

export function LibraryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "history" ? "history" : "shelf";
  const [titles, setTitles] = useState<LibraryTitle[] | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    if (tab === "shelf") api.library().then(setTitles).catch(() => setTitles([]));
    else api.history().then((data) => setHistory(data.items)).catch(() => setHistory([]));
  }, [tab]);

  async function remove(id: string) {
    await api.removeSource(id);
    setTitles(await api.library());
  }

  function open(title: LibraryTitle, source: LibrarySource) {
    const progress = source.progress;
    if (!progress) {
      navigate(`/title/${source.sourceCode}/${encodeURIComponent(source.externalTitleId)}`);
      return;
    }
    navigate(readerPath(source.sourceCode, progress.externalChapterId, {
      title: source.externalTitleId,
      page: String(progress.page),
      name: title.titleName,
      label: progress.chapterNumber,
      uts: source.id,
    }, title.coverUrl));
  }

  return (
    <section className="page">
      <header className="hero compact">
        <h1>Мій список</h1>
      </header>
      <div className="segment" role="tablist" aria-label="Розділ">
        <button type="button" role="tab" aria-selected={tab === "shelf"} className={tab === "shelf" ? "on" : ""} onClick={() => setParams({})}>Полиця</button>
        <button type="button" role="tab" aria-selected={tab === "history"} className={tab === "history" ? "on" : ""} onClick={() => setParams({ tab: "history" })}>Історія</button>
      </div>

      {tab === "shelf" ? (
        <>
          {titles === null ? <p className="meta">Завантажую полицю…</p> : null}
          {titles?.length === 0 ? (
            <div className="hint-card">
              <p>Полиця порожня. Відкрийте тайтл і натисніть «Зберегти».</p>
              <button type="button" onClick={() => navigate("/")}>До каталогу</button>
            </div>
          ) : null}
          <div className="stack">
            {titles?.map((title) => (
              <article key={title.id} className="library-card">
                <Cover src={title.coverUrl} alt="" />
                <div className="library-body">
                  <h2>{title.titleName}</h2>
                  {title.sources.map((source) => (
                    <div className="source-row" key={source.id}>
                      <span className="badge">{SOURCE_LABEL[source.sourceCode] ?? source.sourceCode}</span>
                      <span className="meta small">
                        {source.progress ? `${source.progress.chapterNumber} · стор. ${source.progress.page}` : "Ще не почато"}
                      </span>
                      {source.progress ? (
                        <span className="bar"><span style={{ width: `${Math.max(4, Math.min(100, source.progress.progressPercent))}%` }} /></span>
                      ) : null}
                      <div className="row">
                        <button type="button" onClick={() => open(title, source)}>
                          {source.progress ? "Продовжити" : "До глав"}
                        </button>
                        <button type="button" className="textish" onClick={() => void remove(source.id)}>Прибрати</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          {history === null ? <p className="meta">Завантажую історію…</p> : null}
          {history?.length === 0 ? <div className="hint-card"><p>Сесій читання ще немає.</p></div> : null}
          <ul className="history">
            {history?.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(readerPath(item.sourceCode, item.externalChapterId, {
                    title: item.externalTitleId,
                    page: String(item.lastPage),
                    name: item.titleName,
                    label: item.chapterNumber,
                    uts: item.userTitleSourceId,
                  }, item.coverUrl))}
                >
                  <Cover src={item.coverUrl} alt="" className="history-img" />
                  <span className="history-body">
                    <strong>{item.titleName}</strong>
                    <span>{SOURCE_LABEL[item.sourceCode] ?? item.sourceCode} · {item.chapterNumber} · стор. {item.lastPage}</span>
                    <small>{date.format(new Date(item.startedAt))}{item.finishedAt ? " · прочитано" : ""}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
