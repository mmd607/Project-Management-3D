import type { DataSource, HealthBreakdownItem } from "../model/workspaceView";

interface RingProps {
  score: number | null;
  accent: string;
  dataSource: DataSource;
}

/** Headline health score as a small SVG ring. "N/A" (not zero) when the score is unknown. */
export function HealthRing({ score, accent, dataSource }: RingProps) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const filled = score === null ? 0 : (score / 100) * circumference;
  const label = score === null ? "Project health not available" : `Project health ${score} out of 100`;
  return (
    <div className="health-ring" role="img" aria-label={`${label}${dataSource === "demo" ? " (demo data)" : ""}`}>
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        {score !== null && (
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference - filled}`}
            transform="rotate(-90 32 32)"
          />
        )}
      </svg>
      <span className="health-ring-value">{score === null ? "N/A" : `${score}%`}</span>
    </div>
  );
}

interface BreakdownProps {
  items: HealthBreakdownItem[];
  accent: string;
}

export function HealthBreakdown({ items, accent }: BreakdownProps) {
  if (items.length === 0) return <p className="inspector-muted">No breakdown available.</p>;
  return (
    <ul className="health-breakdown">
      {items.map((item) => (
        <li key={item.key} className="health-breakdown-row">
          <div className="health-breakdown-head">
            <span>{item.label}</span>
            <span className="health-breakdown-value">{item.score === null ? "N/A" : `${item.score}%`}</span>
          </div>
          <div
            className="health-breakdown-track"
            role="progressbar"
            aria-label={item.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.score ?? undefined}
            aria-valuetext={item.score === null ? "not available" : `${item.score} percent`}
          >
            {item.score !== null && <div className="health-breakdown-fill" style={{ width: `${item.score}%`, background: accent }} />}
          </div>
          {item.note && <span className="health-breakdown-note">{item.note}</span>}
        </li>
      ))}
    </ul>
  );
}
