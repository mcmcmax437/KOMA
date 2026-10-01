import { SearchResult } from "@koma/shared";
import { Cover } from "../MangaCard/Cover";
import { Icon } from "../Icon/Icon";

export function TitleTile({ item, onOpen }: { item: SearchResult; onOpen: () => void }) {
  const meta = [item.kind, item.status].filter(Boolean).join(" · ");
  return (
    <button type="button" className="tile" onClick={onOpen}>
      <span className="tile-cover">
        <Cover src={item.coverUrl} alt="" className="tile-img" />
        {item.rating ? (
          <span className="tile-rating"><Icon name="star" size={12} />{item.rating}</span>
        ) : null}
      </span>
      <strong className="tile-title">{item.title}</strong>
      {meta ? <small className="tile-meta">{meta}</small> : null}
    </button>
  );
}

export function TitleGrid({
  items,
  loading = false,
  skeletons = 6,
  onOpen,
}: {
  items: SearchResult[];
  loading?: boolean;
  skeletons?: number;
  onOpen: (item: SearchResult) => void;
}) {
  return (
    <div className="grid">
      {items.map((item) => <TitleTile key={item.externalId} item={item} onOpen={() => onOpen(item)} />)}
      {loading
        ? Array.from({ length: skeletons }, (_, index) => (
            <div key={`skeleton-${index}`} className="tile skeleton" aria-hidden="true">
              <span className="tile-cover" />
              <span className="line" />
              <span className="line short" />
            </div>
          ))
        : null}
    </div>
  );
}
