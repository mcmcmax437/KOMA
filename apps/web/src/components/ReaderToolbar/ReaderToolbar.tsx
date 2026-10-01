export function ReaderToolbar({
  title,
  label,
  page,
  total,
  onBack,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  title: string;
  label: string;
  page: number;
  total: number;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  return (
    <div className="reader-chrome">
      <div className="reader-top">
        <button type="button" onClick={onBack}>Назад</button>
        <div>
          <strong>{title}</strong>
          <span>{label} · {page}/{total || "…"}</span>
        </div>
      </div>
      <div className="reader-bottom">
        <button type="button" onClick={onPrev} disabled={prevDisabled}>Попередня</button>
        <button type="button" onClick={onNext} disabled={nextDisabled}>Наступна</button>
      </div>
    </div>
  );
}
