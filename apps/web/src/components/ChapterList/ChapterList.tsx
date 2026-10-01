import { Chapter } from "@koma/shared";

export function ChapterList({ chapters, onOpen }: { chapters: Chapter[]; onOpen: (chapter: Chapter) => void }) {
  const ordered = [...chapters].reverse();
  if (ordered.length === 0) return <p className="empty">Глав поки немає.</p>;
  return (
    <ol className="chapters">
      {ordered.map((chapter) => (
        <li key={chapter.externalId}>
          <button type="button" onClick={() => onOpen(chapter)}>
            <span>{chapter.displayNumber}</span>
            <small>Читати</small>
          </button>
        </li>
      ))}
    </ol>
  );
}
