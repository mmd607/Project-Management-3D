import { useState } from "react";
import type { ProjectDetailVM } from "../model/workspaceView";
import { formatBytes } from "../lib/formatBytes";
import { formatRelative } from "../lib/formatRelative";
import { FolderIcon } from "./FolderIcon";
import { StatusBadge } from "./StatusBadge";
import { HealthBreakdown, HealthRing } from "./HealthRing";
import { FullDetailsModal } from "./FullDetailsModal";
import type { InspectorState } from "./useProjectSelection";

interface Props {
  state: InspectorState;
  /** Name shown while loading / on error (from the node summary) so the panel never goes blank. */
  projectName?: string | null;
  onRetry: () => void;
  onClose?: () => void;
}

/** Right-hand panel. Five explicit states: empty, loading, error, ready (complete) and ready
 * with incomplete data (a notice listing what the provider could not fill in). */
export function ProjectInspector({ state, projectName, onRetry, onClose }: Props) {
  return (
    <aside className="inspector" aria-label="Project details" aria-busy={state.kind === "loading"}>
      {onClose && (
        <button type="button" className="inspector-close" onClick={onClose} aria-label="Close project details">
          ✕
        </button>
      )}
      {state.kind === "empty" && <EmptyState />}
      {state.kind === "loading" && <LoadingState name={projectName} />}
      {state.kind === "error" && <ErrorState name={projectName} message={state.message} onRetry={onRetry} />}
      {state.kind === "ready" && <ReadyState detail={state.detail} />}
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="inspector-state" data-testid="inspector-empty">
      <div className="inspector-state-glyph" aria-hidden="true">
        <FolderIcon accent="#94A0B2" size={52} />
      </div>
      <h2>No project selected</h2>
      <p className="inspector-muted">Choose a folder in the workspace to see its type, stack, health and recent activity.</p>
      <p className="inspector-muted small">Tip: press Tab to reach the folders, then Enter to select one.</p>
    </div>
  );
}

function LoadingState({ name }: { name?: string | null }) {
  return (
    <div className="inspector-state" data-testid="inspector-loading" role="status">
      <div className="skeleton-row">
        <span className="skeleton skeleton-icon" />
        <span className="skeleton skeleton-title" />
      </div>
      <span className="skeleton skeleton-line" />
      <span className="skeleton skeleton-line short" />
      <span className="skeleton skeleton-block" />
      <p className="inspector-muted">Loading {name ? `“${name}”` : "project"}…</p>
    </div>
  );
}

function ErrorState({ name, message, onRetry }: { name?: string | null; message: string; onRetry: () => void }) {
  return (
    <div className="inspector-state" data-testid="inspector-error" role="alert">
      <h2>Could not load {name ? `“${name}”` : "this project"}</h2>
      <p className="inspector-error">{message}</p>
      <button type="button" className="btn" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function ReadyState({ detail }: { detail: ProjectDetailVM }) {
  const [modalOpen, setModalOpen] = useState(false);
  const isDemo = detail.dataSource === "demo";
  return (
    <div className="inspector-content" data-testid="inspector-ready" style={{ ["--accent" as string]: detail.accent }}>
      <header className="inspector-head">
        <span className="inspector-icon">
          <FolderIcon accent={detail.accent} size={44} />
        </span>
        <div>
          <h2>{detail.name}</h2>
          <StatusBadge status={detail.status} />
        </div>
      </header>

      {detail.missingFields.length > 0 && (
        <p className="inspector-notice" data-testid="inspector-incomplete" role="note">
          Some information is not available for this project: {detail.missingFields.join(", ")}.
        </p>
      )}

      <p className="inspector-description">{detail.description ?? <span className="inspector-muted">No description available.</span>}</p>

      <dl className="inspector-facts">
        <Fact label="Type" value={detail.type} />
        <Fact label="Category" value={detail.category} />
        <Fact label="Size" value={detail.sizeBytes === null ? null : formatBytes(detail.sizeBytes)} />
        <Fact label="Last Modified" value={detail.lastModified ? formatRelative(detail.lastModified) : null} title={detail.lastModified ?? undefined} />
        <Fact label="Primary Language" value={detail.language} />
        <Fact label="Framework" value={detail.framework} />
      </dl>

      <section className="inspector-section">
        <h3>Technology Stack</h3>
        {detail.techStack.length > 0 ? (
          <ul className="pill-list" aria-label="Technology stack">
            {detail.techStack.map((t) => (
              <li key={t} className="pill">
                {t}
              </li>
            ))}
          </ul>
        ) : (
          <p className="inspector-muted">Not available.</p>
        )}
      </section>

      <section className="inspector-section">
        <h3>
          Project Health
          <span className={`source-tag ${isDemo ? "demo" : "scan"}`}>{isDemo ? "demo data" : "from scan"}</span>
        </h3>
        <div className="health-summary">
          <HealthRing score={detail.healthScore} accent={detail.accent} dataSource={detail.dataSource} />
          <p className="inspector-muted small">
            {isDemo
              ? "Illustrative score for the demo workspace — not a measurement and not a prediction."
              : "Weighted, versioned formula over scanned evidence (see docs/DATA_AND_SCORING.md)."}
          </p>
        </div>
        <h4>Health Breakdown</h4>
        <HealthBreakdown items={detail.healthBreakdown} accent={detail.accent} />
      </section>

      <section className="inspector-section">
        <h3>Project Components</h3>
        {detail.components.length > 0 ? (
          <ul className="component-list" aria-label="Project components">
            {detail.components.map((c) => (
              <li key={c} className="component-chip">
                <ComponentGlyph kind={c} />
                {c}
              </li>
            ))}
          </ul>
        ) : (
          <p className="inspector-muted">No components detected.</p>
        )}
      </section>

      <section className="inspector-section">
        <h3>Recent Activity</h3>
        {detail.recentActivity.length > 0 ? (
          <ul className="activity-list">
            {detail.recentActivity.map((a) => (
              <li key={a.id}>
                <span className="activity-text">{a.text}</span>
                <time dateTime={a.at} className="activity-time">
                  {formatRelative(a.at)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="inspector-muted">No recent activity recorded.</p>
        )}
      </section>

      <button type="button" className="btn primary wide" onClick={() => setModalOpen(true)}>
        View Full Details
      </button>

      {modalOpen && <FullDetailsModal detail={detail} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function Fact({ label, value, title }: { label: string; value: string | null; title?: string }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd title={title}>{value ?? <span className="inspector-muted">Not available</span>}</dd>
    </div>
  );
}

function ComponentGlyph({ kind }: { kind: string }) {
  const glyph: Record<string, string> = {
    Frontend: "▣",
    Backend: "▤",
    Database: "◍",
    Documentation: "▭",
    Tests: "✓",
    Deployment: "▲",
  };
  return (
    <span className="component-glyph" aria-hidden="true">
      {glyph[kind] ?? "•"}
    </span>
  );
}
