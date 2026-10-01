export function progressPercent(page: number, totalPages: number): number {
  if (!Number.isFinite(page) || !Number.isFinite(totalPages) || totalPages <= 0) return 0;
  const clamped = Math.min(Math.max(page, 1), totalPages);
  return Math.round((clamped / totalPages) * 10000) / 100;
}

export interface ContinueCandidate {
  updatedAt: number;
  completed: boolean;
  id: string;
}

/** The saved row is authoritative. Prefer the newest unfinished position, then the newest row. */
export function selectContinueId(rows: ContinueCandidate[]): string | null {
  if (rows.length === 0) return null;
  const byRecent = [...rows].sort((a, b) => b.updatedAt - a.updatedAt);
  const open = byRecent.find((row) => !row.completed);
  return (open ?? byRecent[0]).id;
}

/**
 * Numeric sort values only. Label-only chapters are not ordered by string comparison.
 * A missing previous token is a baseline, not a new chapter.
 */
export function isNewerChapter(latestToken: string, previous: string | null): boolean {
  if (!previous) return false;
  if (latestToken.startsWith("label:") || previous.startsWith("label:")) return false;
  const next = Number(latestToken);
  const prev = Number(previous);
  if (!Number.isFinite(next) || !Number.isFinite(prev)) return false;
  return next > prev;
}

export function chapterToken(chapter: { sortValue?: number; displayNumber: string }): string {
  if (typeof chapter.sortValue === "number" && Number.isFinite(chapter.sortValue)) {
    return String(chapter.sortValue);
  }
  return `label:${chapter.displayNumber}`;
}

export function isAllowedImageUrl(raw: string, allowlist: string[]): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
