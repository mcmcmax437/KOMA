import { Chapter, Page } from "@koma/shared";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError, api, ensureMapping } from "../../api/client";
import { ProgressIndicator } from "../../components/ProgressIndicator/ProgressIndicator";
import { ReaderPageImage } from "../../components/ReaderPage/ReaderPageImage";
import { ReaderToolbar } from "../../components/ReaderToolbar/ReaderToolbar";
import { SourceError } from "../../components/SourceError/SourceError";
import { useAppState } from "../../store/app-store";

export function ReaderPage() {
  const { source = "", chapterId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useAppState();
  const titleId = params.get("title") ?? "";
  const titleName = params.get("name") ?? "KOMA";
  const cover = params.get("cover") ?? undefined;
  const label = params.get("label") ?? "";
  const initialPage = Math.max(1, Number(params.get("page") ?? 1) || 1);

  const [pages, setPages] = useState<Page[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [display, setDisplay] = useState(label);
  const [current, setCurrent] = useState(initialPage);
  const [error, setError] = useState<ApiError | null>(null);
  const [chrome, setChrome] = useState(true);
  const [mappingId, setMappingId] = useState(params.get("uts") ?? "");
  const armed = useRef(false);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setPages([]);
    armed.current = false;
    api.chapter(source, chapterId)
      .then((data) => {
        if (cancelled) return;
        setPages(data.pages);
        setDisplay(label || data.chapter.displayNumber);
        setCurrent(Math.min(initialPage, data.pages.length || 1));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason : new ApiError("PAGES_NOT_FOUND", "Не вдалося завантажити сторінки"));
      });
    if (titleId) {
      api.chapters(source, titleId).then((data) => { if (!cancelled) setChapters(data.chapters); }).catch(() => undefined);
      ensureMapping({
        titleName,
        coverUrl: cover,
        sourceCode: source,
        externalTitleId: titleId,
        externalTitleUrl: source === "comx" ? `https://com-x.life/${titleId}.html` : `https://mangalib.me/ru/manga/${titleId}`,
      }).then((mapping) => { if (!cancelled) setMappingId(mapping.userTitleSourceId); }).catch(() => undefined);
    }
    return () => { cancelled = true; };
  }, [source, chapterId, titleId]);

  useEffect(() => {
    if (pages.length === 0) return;
    const node = document.querySelector(`[data-page="${Math.min(initialPage, pages.length)}"]`);
    node?.scrollIntoView({ block: "start" });
    const timer = window.setTimeout(() => { armed.current = true; }, 350);
    return () => window.clearTimeout(timer);
  }, [pages, initialPage]);

  useEffect(() => {
    if (pages.length === 0) return;
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-page]")];
    const observer = new IntersectionObserver((entries) => {
      if (!armed.current) return;
      const best = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const page = Number(best?.target.getAttribute("data-page"));
      if (page) setCurrent(page);
    }, { threshold: [0.45, 0.7] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  useEffect(() => {
    if (!mappingId || pages.length === 0) return;
    const timer = window.setTimeout(() => { void persist(currentRef.current); }, 1500);
    const flush = () => { void persist(currentRef.current); };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [mappingId, pages.length, current, display]);

  function persist(page: number) {
    if (!mappingId || pages.length === 0) return;
    void api.saveProgress({
      userTitleSourceId: mappingId,
      externalChapterId: chapterId,
      chapterNumber: display || label || chapterId,
      page,
      totalPages: pages.length,
      completed: page >= pages.length,
    }).catch(() => undefined);
  }

  useEffect(() => {
    if (!settings.preload || pages.length === 0) return;
    pages.slice(current, current + 2).forEach((page) => {
      const image = new Image();
      image.src = page.imageUrl;
    });
  }, [settings.preload, current, pages]);

  const index = chapters.findIndex((chapter) => chapter.externalId === chapterId);
  function go(chapter: Chapter) {
    const next = new URLSearchParams({
      title: titleId,
      name: titleName,
      label: chapter.displayNumber,
      page: "1",
    });
    if (cover) next.set("cover", cover);
    if (mappingId) next.set("uts", mappingId);
    navigate(`/read/${source}/${encodeURIComponent(chapter.externalId)}?${next.toString()}`);
  }

  if (error) {
    return (
      <section className="page">
        <SourceError message={error.message} onRetry={() => navigate(0)} onSwitch={() => navigate("/search")} />
      </section>
    );
  }

  return (
    <div className={chrome ? "reader chrome-on" : "reader"} onClick={(event) => {
      if ((event.target as HTMLElement).closest("button")) return;
      setChrome((value) => !value);
    }}>
      <ProgressIndicator page={current} total={pages.length} />
      {chrome ? (
        <ReaderToolbar
          title={titleName}
          label={display}
          page={current}
          total={pages.length}
          onBack={() => navigate(titleId ? `/title/${source}/${encodeURIComponent(titleId)}` : "/")}
          onPrev={() => index > 0 && go(chapters[index - 1])}
          onNext={() => index >= 0 && index < chapters.length - 1 && go(chapters[index + 1])}
          prevDisabled={index <= 0}
          nextDisabled={index < 0 || index >= chapters.length - 1}
        />
      ) : null}
      <div className="reader-pages">
        {pages.map((page) => (
          <ReaderPageImage
            key={page.number}
            src={page.imageUrl}
            page={page.number}
            eager={page.number <= current + 1}
            fit={settings.fit}
          />
        ))}
        {pages.length === 0 ? <p className="meta reader-wait">Збираю сторінки…</p> : null}
      </div>
    </div>
  );
}
