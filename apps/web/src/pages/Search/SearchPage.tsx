import { SearchResult } from "@koma/shared";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../../api/client";
import { MangaCard } from "../../components/MangaCard/MangaCard";
import { SourceError } from "../../components/SourceError/SourceError";
import { SourceSelector } from "../../components/SourceSelector/SourceSelector";
import { otherSource, useAppState } from "../../store/app-store";

export function SearchPage() {
  const navigate = useNavigate();
  const { source, setSource } = useAppState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [searched, setSearched] = useState("");

  async function run(event?: FormEvent) {
    event?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.search(source, q);
      setResults(data.results);
      setSearched(q);
    } catch (reason) {
      setResults([]);
      setError(reason instanceof ApiError ? reason : new ApiError("SEARCH_FAILED", "Пошук не вдався"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header className="mast compact">
        <h1>Пошук</h1>
        <p className="lede">Результати лише з {source === "comx" ? "Com-X" : "MangaLib"}. Інше джерело — окремий запит.</p>
      </header>
      <SourceSelector value={source} onChange={(next) => { setSource(next); setResults([]); setSearched(""); }} />
      <form className="search" onSubmit={run}>
        <label className="sr" htmlFor="q">Назва</label>
        <input id="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Назва тайтлу" maxLength={120} />
        <button type="submit" disabled={loading}>{loading ? "Шукаю" : "Знайти"}</button>
      </form>
      {error ? (
        <SourceError
          message={error.message}
          onRetry={() => void run()}
          onSwitch={() => { setSource(otherSource(source)); setResults([]); setError(null); }}
        />
      ) : null}
      {loading ? <p className="meta">Запит іде лише в обране джерело…</p> : null}
      {!loading && searched && results.length === 0 && !error ? <p className="empty">Нічого не знайдено в цьому джерелі.</p> : null}
      <div className="stack">
        {results.map((item) => (
          <MangaCard
            key={item.externalId}
            title={item.title}
            coverUrl={item.coverUrl}
            meta={item.alternativeTitles?.join(" · ")}
            onClick={() => navigate(`/title/${source}/${encodeURIComponent(item.externalId)}`)}
          />
        ))}
      </div>
    </section>
  );
}
