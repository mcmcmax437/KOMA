import { LibraryTitle } from "@koma/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { Cover } from "../../components/MangaCard/Cover";
import { SOURCE_LABEL } from "../../store/app-store";

export function LibraryPage() {
  const navigate = useNavigate();
  const [titles, setTitles] = useState<LibraryTitle[]>([]);

  useEffect(() => {
    api.library().then(setTitles).catch(() => setTitles([]));
  }, []);

  async function remove(id: string) {
    await api.removeSource(id);
    setTitles(await api.library());
  }

  return (
    <section className="page">
      <header className="mast compact"><h1>Бібліотека</h1></header>
      {titles.length === 0 ? <p className="empty">Порожньо. Збережені тайтли з’являться тут, без загального каталогу.</p> : null}
      <div className="stack">
        {titles.map((title) => (
          <article key={title.id} className="library-card">
            <Cover src={title.coverUrl} alt="" />
            <div>
              <h2>{title.titleName}</h2>
              <div className="badges">
                {title.sources.map((source) => <span key={source.id}>{SOURCE_LABEL[source.sourceCode] ?? source.sourceCode}</span>)}
              </div>
              {title.sources.map((source) => (
                <div className="source-row" key={source.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const progress = source.progress;
                      if (!progress) {
                        navigate(`/title/${source.sourceCode}/${encodeURIComponent(source.externalTitleId)}`);
                        return;
                      }
                      const params = new URLSearchParams({
                        title: source.externalTitleId,
                        page: String(progress.page),
                        name: title.titleName,
                        label: progress.chapterNumber,
                        uts: source.id,
                      });
                      if (title.coverUrl) params.set("cover", title.coverUrl);
                      navigate(`/read/${source.sourceCode}/${encodeURIComponent(progress.externalChapterId)}?${params.toString()}`);
                    }}
                  >
                    {source.progress ? `Продовжити · стор. ${source.progress.page}` : "До глав"}
                  </button>
                  <button type="button" className="textish" onClick={() => void remove(source.id)}>Прибрати</button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
