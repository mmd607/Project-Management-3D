import type { HealthScoreResult } from "../api/types";

interface Props {
  healthScore: HealthScoreResult | null;
}

/**
 * Project Health Score — transparent and versioned (docs/DATA_AND_SCORING.md).
 * Deliberately NOT a single unexplained "82% Good" style badge: every row shows its own
 * score, its weight, and the exact method used, and N/A is a real possible value (shown
 * with shape + text, not color alone, for accessibility) rather than a fabricated zero.
 */
export function HealthScorePanel({ healthScore }: Props) {
  if (!healthScore) {
    return <p className="empty-state-hint">No health score yet — rescan the workspace.</p>;
  }

  const { overallScore, coverage, components, version } = healthScore;

  return (
    <div className="health-score">
      <div className="health-score-overall">
        <span className="health-score-overall-value">
          {overallScore === null ? "N/A" : overallScore}
          {overallScore !== null && <span className="health-score-unit">/100</span>}
        </span>
        <span className="health-score-coverage">
          {Math.round(coverage * 100)}% of components computable · formula {version}
        </span>
      </div>
      <ul className="health-score-components">
        {components.map((c) => (
          <li key={c.key} className="health-score-row">
            <div className="health-score-row-header">
              <span>
                {c.label} <span className="health-score-weight">(weight {c.weight})</span>
              </span>
              <span className="health-score-row-value">{c.score === null ? "N/A" : `${c.score}/100`}</span>
            </div>
            <div className="health-score-bar-track" role="img" aria-label={`${c.label}: ${c.score === null ? "not applicable" : c.score + " out of 100"}`}>
              {c.score !== null && (
                <div
                  className="health-score-bar-fill"
                  style={{ width: `${c.score}%` }}
                />
              )}
            </div>
            <p className="health-score-method">{c.method}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
