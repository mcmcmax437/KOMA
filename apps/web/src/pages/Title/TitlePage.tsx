import { Chapter, Title } from "@koma/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, api, ensureMapping, findMapping } from "../../api/client";
import { ChapterList } from "../../components/ChapterList/ChapterList";
import { Cover } from "../../components/MangaCard/Cover";
import { SourceError } from "../../components/SourceError/SourceError";
import { SOURCE_LABEL, otherSource, useAppState } from "../../store/app-store";

export function TitlePage() {
  const { source = "", externalId = "" } = useParams();
  const navigate = useNavigate();
  const { setSource } = useAppState();
  const [title, setTitle] = useState<Title | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [mappingId, setMappingId] = useState<string | null>(null);
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [openText, setOpenText] = useState(false);

  async function load() {
    setError(null);
    try {
      const [details, list, library] = await Promise.all([
        api.title(source, externalId),
        api.chapters(source, externalId),
        api.library(),
      ]);
      setTitle(details.title);
      setChapters(list.chapters);
      const found = findMapping(library, source, externalId);
      setMappingId(found?.source.id ?? null);
      setNotify(found?.source.notificationsEnabled ?? false);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError("SOURCE_UNAVAILABLE", "Джерело тимчасово недоступне"));
    }
  }

  useEffect(() => { void load(); }, [source, externalId]);

  async function save(): Promise<string | null> {
    if (!title) return null;
    setBusy(true);
    try {
      const mapping = await ensureMapping({
        titleName: title.title,
        coverUrl: title.coverUrl,
        sourceCode: source,
        externalTitleId: title.externalId,
        externalTitleUrl: title.url,
      });
      setMappingId(mapping.userTitleSourceId);
      return mapping.userTitleSourceId;
    } finally {
      setBusy(false);
    }
  }

  async function toggleNotify() {
    const id = mappingId ?? (await save());
    if (!id) return;
    if (notify) await api.disableNotifications(id);
    else await api.enableNotifications(id);
    setNotify(!notify);
  }

  function openChapter(chapter: Chapter) {
    if (!title) return;
    const params = new URLSearchParams({
      title: title.externalId,
      name: title.title,
      label: chapter.displayNumber,
      page: "1",
    });
    if (title.coverUrl) params.set("cover", title.coverUrl);
    if (mappingId) params.set("uts", mappingId);
    navigate(`/read/${source}/${encodeURIComponent(chapter.externalId)}?${params.toString()}`);
  }

  if (error) {
    return (
      <section className="page">
        <SourceError
          message={error.message}
          onRetry={() => void load()}
          onSwitch={() => { setSource(otherSource(source === "mangalib" ? "mangalib" : "comx")); navigate("/search"); }}
        />
      </section>
    );
  }
  if (!title) return <section className="page"><p className="meta">Читаю сторінку джерела…</p></section>;

  return (
    <section className="page">
      <div className="title-hero">
        <Cover src={title.coverUrl} alt="" />
        <div>
          <p className="eyebrow">{SOURCE_LABEL[source] ?? source}</p>
          <h1>{title.title}</h1>
          {title.author ? <p className="meta">{title.author}</p> : null}
          {title.status ? <p className="meta">{title.status}</p> : null}
        </div>
      </div>
      {title.description ? (
        <p className={openText ? "description" : "description clamp"}>{title.description}</p>
      ) : null}
      {title.description && title.description.length > 180 ? (
        <button type="button" className="textish" onClick={() => setOpenText((value) => !value)}>{openText ? "Згорнути" : "Весь опис"}</button>
      ) : null}
      <div className="row">
        <button type="button" onClick={() => void save()} disabled={busy || Boolean(mappingId)}>{mappingId ? "У бібліотеці" : "Зберегти"}</button>
        <button type="button" className="ghost" onClick={() => void toggleNotify()} disabled={!mappingId && busy}>
          {notify ? "Сповіщення вкл" : "Сповіщення"}
        </button>
      </div>
      <h2 className="section">Глави</h2>
      <ChapterList chapters={chapters} onOpen={openChapter} />
    </section>
  );
}
