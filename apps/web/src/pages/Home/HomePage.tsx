import { ContinueItem, FeedSort, SearchResult } from "@koma/shared";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../../api/client";
import { Cover } from "../../components/MangaCard/Cover";
import { SourceError } from "../../components/SourceError/SourceError";
import { SourceSelector } from "../../components/SourceSelector/SourceSelector";
import { TitleGrid } from "../../components/TitleGrid/TitleGrid";
import { SOURCE_LABEL, otherSource, useAppState } from "../../store/app-store";

const SORTS: Array<{ value: FeedSort; label: string }> = [
  { value: "popular", label: "Популярне" },
  { value: "updated", label: "Оновлення" },
];

export function continuePath(item: ContinueItem): string {
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
  const [recent, setRecent] = useState<ContinueItem[]>([]);
  const [sort, setSort] = useState<FeedSort>("popular");
  const [items, setItems] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const request = useRef(0);

  useEffect(() => {
    api.progress().then((data) => setRecent(data.items.slice(0, 8))).catch(() => setRecent([]));
  }, []);

  async function load(nextPage: number) {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    if (nextPage === 1) setItems([]);
    try {
      const data = await api.feed(source, sort, nextPage);
      if (id !== request.current) return;
      setItems((current) => {
        if (nextPage === 1) return data.items;
        const seen = new Set(current.map((item) => item.externalId));
        return [...current, ...data.items.filter((item) => !seen.has(item.externalId))];
      });
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (reason) {
      if (id !== request.current) return;
      setError(reason instanceof ApiError ? reason : new ApiError("SOURCE_UNAVAILABLE", "Джерело тимчасово недоступне"));
      setHasMore(false);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, [source, sort]);

  return (
    <section className="page">
      {recent.length > 0 ? (
        <div className="shelf">
          <div className="section-head">
            <h2 className="section">Продовжити</h2>
            <button type="button" className="textish" onClick={() => navigate("/list?tab=history")}>Уся історія</button>
          </div>
          <div className="rail">
            {recent.map((item) => (
              <button key={`${item.userTitleSourceId}-${item.externalChapterId}`} type="button" className="rail-card" onClick={() => navigate(continuePath(item))}>
                <Cover src={item.coverUrl} alt="" className="rail-img" />
                <span className="rail-body">
                  <strong>{item.titleName}</strong>
                  <small>{item.chapterNumber} · стор. {item.page}</small>
                  <span className="bar"><span style={{ width: `${Math.max(4, Math.min(100, item.progressPercent))}%` }} /></span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="section-head">
        <h2 className="section">Каталог {SOURCE_LABEL[source]}</h2>
      </div>
      <SourceSelector value={source} onChange={setSource} />
      <div className="chips" role="tablist" aria-label="Сортування">
        {SORTS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={sort === option.value}
            className={sort === option.value ? "chip on" : "chip"}
            onClick={() => setSort(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <SourceError
          message={error.message}
          onRetry={() => void load(page === 1 || items.length === 0 ? 1 : page + 1)}
          onSwitch={() => setSource(otherSource(source))}
        />
      ) : null}

      <TitleGrid
        items={items}
        loading={loading}
        skeletons={items.length === 0 ? 9 : 3}
        onOpen={(item) => navigate(`/title/${source}/${encodeURIComponent(item.externalId)}`)}
      />

      {!loading && !error && items.length === 0 ? <p className="empty">Джерело не повернуло жодного тайтлу.</p> : null}
      {hasMore && !loading ? (
        <button type="button" className="more" onClick={() => void load(page + 1)}>Показати ще</button>
      ) : null}
    </section>
  );
}
