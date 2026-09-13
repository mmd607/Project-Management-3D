/** "2 hours ago"-style formatting for ISO timestamps; falls back to the date for old values. */
export function formatRelative(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "Not available";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Not available";
  const diff = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.round(diff / minute)} min ago`;
  if (diff < day) {
    const h = Math.round(diff / hour);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (diff < 30 * day) {
    const d = Math.round(diff / day);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  return new Date(then).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
