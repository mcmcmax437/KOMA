import { ReactNode } from "react";
import { Cover } from "./Cover";

export function MangaCard({
  title,
  coverUrl,
  meta,
  onClick,
}: {
  title: string;
  coverUrl?: string | null;
  meta?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag className="manga-card" type={onClick ? "button" : undefined} onClick={onClick}>
      <Cover src={coverUrl} alt="" />
      <div>
        <h3>{title}</h3>
        {meta ? <p className="meta">{meta}</p> : null}
      </div>
    </Tag>
  );
}
