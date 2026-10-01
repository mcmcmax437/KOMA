export function ProgressIndicator({ page, total }: { page: number; total: number }) {
  const percent = total > 0 ? Math.min(100, (page / total) * 100) : 0;
  return (
    <div className="progress-line" aria-hidden="true">
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
