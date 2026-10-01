import { SearchResult } from "@koma/shared";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../../api/client";
import { Icon } from "../../components/Icon/Icon";
import { SourceError } from "../../components/SourceError/SourceError";
import { SourceSelector } from "../../components/SourceSelector/SourceSelector";
import { TitleGrid } from "../../components/TitleGrid/TitleGrid";
import { SOURCE_LABEL, otherSource, useAppState } from "../../store/app-store";

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
    setResults([]);
    try {
      const data = await api.search(source, q);
      setResults(data.results);
      setSearched(q);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError("SEARCH_FAILED", "Пошук не вдався"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header className="hero compact">
        <h1>Пошук</h1>
        <p className="lede">Шукаємо лише в {SOURCE_LABEL[source]}. Інше джерело — окремий запит.</p>
      </header>
      <SourceSelector value={source} onChange={(next) => { setSource(next); setResults([]); setSearched(""); setError(null); }} />
      <form className="search" onSubmit={run} role="search">
        <label className="sr" htmlFor="q">Назва</label>
        <span className="search-field">
          <Icon name="search" size={18} />
          <input id="q" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Назва тайтлу" maxLength={120} enterKeyHint="search" />
        </span>
        <button type="submit" disabled={loading || !query.trim()}>{loading ? "Шукаю…" : "Знайти"}</button>
      </form>
      {error ? (
        <SourceError
          message={error.message}
          onRetry={() => void run()}
          onSwitch={() => { setSource(otherSource(source)); setResults([]); setError(null); }}
        />
      ) : null}
      {searched && !loading && !error ? (
        <p className="meta">{results.length > 0 ? `Знайдено: ${results.length} · «${searched}»` : `Нічого не знайдено за «${searched}» у цьому джерелі.`}</p>
      ) : null}
      {!searched && !loading && !error ? (
        <div className="hint-card">
          <Icon name="search" size={28} />
          <p>Введіть назву українською, російською чи англійською.</p>
        </div>
      ) : null}
      <TitleGrid
        items={results}
        loading={loading}
        onOpen={(item) => navigate(`/title/${source}/${encodeURIComponent(item.externalId)}`)}
      />
    </section>
  );
}
