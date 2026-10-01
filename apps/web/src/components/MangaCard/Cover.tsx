import { useState } from "react";

export function Cover({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="cover placeholder" aria-hidden="true" />;
  return <img className="cover" src={src} alt={alt} onError={() => setFailed(true)} />;
}
