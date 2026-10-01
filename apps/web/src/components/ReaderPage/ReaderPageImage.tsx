import { token } from "../../api/client";
import { useEffect, useState } from "react";

export function ReaderPageImage({
  src,
  page,
  eager,
  fit,
}: {
  src: string;
  page: number;
  eager: boolean;
  fit: "width" | "contain";
}) {
  const [mode, setMode] = useState<"direct" | "proxy" | "broken">("direct");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    setMode("direct");
    setObjectUrl(null);
  }, [src]);

  useEffect(() => {
    if (mode !== "proxy") return;
    let cancelled = false;
    let created = "";
    const access = token();
    fetch(`/api/v1/media?url=${encodeURIComponent(src)}`, {
      headers: access ? { authorization: `Bearer ${access}` } : {},
    })
      .then((response) => {
        if (!response.ok) throw new Error("proxy");
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      })
      .catch(() => {
        if (!cancelled) setMode("broken");
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [mode, src]);

  if (mode === "broken") {
    return (
      <div className="page-fallback" data-page={page}>
        <p>Сторінка {page} не завантажилась</p>
        <button type="button" onClick={() => setMode("direct")}>Ще раз</button>
      </div>
    );
  }

  const shown = mode === "proxy" ? objectUrl : src;
  return (
    <div className={`reader-page fit-${fit}`} data-page={page}>
      {shown ? (
        <img
          src={shown}
          alt={`Сторінка ${page}`}
          loading={eager ? "eager" : "lazy"}
          onError={() => setMode((current) => (current === "direct" ? "proxy" : "broken"))}
        />
      ) : (
        <div className="page-fallback"><p>Проксі…</p></div>
      )}
    </div>
  );
}
