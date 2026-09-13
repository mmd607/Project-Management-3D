import { useEffect, useRef } from "react";
import type { ProjectDetailVM } from "../model/workspaceView";
import { STATUS_LABEL } from "../model/workspaceView";
import { formatBytes } from "../lib/formatBytes";
import { formatRelative } from "../lib/formatRelative";
import { FolderIcon } from "./FolderIcon";
import { StatusBadge } from "./StatusBadge";
import { HealthBreakdown, HealthRing } from "./HealthRing";

interface Props {
  detail: ProjectDetailVM;
  onClose: () => void;
}

/**
 * Accessible dialog behind "View Full Details": focus is trapped, Esc / backdrop / button
 * close it, focus returns to the opener. Shows every field the view-model carries, including
 * per-item health notes and exact timestamps that the compact panel abbreviates.
 */
export function FullDetailsModal({ detail, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  const isDemo = detail.dataSource === "demo";

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="full-details-backdrop">
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-details-title"
        onClick={(e) => e.stopPropagation()}
        style={{ ["--accent" as string]: detail.accent }}
      >
        <header className="modal-head">
          <span className="inspector-icon">
            <FolderIcon accent={detail.accent} size={40} />
          </span>
          <div className="modal-title-block">
            <h2 id="full-details-title">{detail.name}</h2>
            <p className="inspector-muted small">
              {detail.type} · {detail.category} · <StatusBadge status={detail.status} />
            </p>
          </div>
          <button type="button" className="btn icon" onClick={onClose} aria-label="Close full details">
            ✕
          </button>
        </header>

        {isDemo && (
          <p className="inspector-notice">
            This is a demo workspace: every value below is illustrative sample data, not the result of a scan.
          </p>
        )}
        {detail.missingFields.length > 0 && (
          <p className="inspector-notice">Not available for this project: {detail.missingFields.join(", ")}.</p>
        )}

        <div className="modal-grid">
          <section>
            <h3>Overview</h3>
            <p>{detail.description ?? <span className="inspector-muted">No description available.</span>}</p>
            <dl className="inspector-facts">
              <div className="fact"><dt>Type</dt><dd>{detail.type}</dd></div>
              <div className="fact"><dt>Category / Domain</dt><dd>{detail.category}</dd></div>
              <div className="fact"><dt>Status</dt><dd>{STATUS_LABEL[detail.status]}</dd></div>
              <div className="fact"><dt>Size</dt><dd>{detail.sizeBytes === null ? "Not available" : formatBytes(detail.sizeBytes)}</dd></div>
              <div className="fact">
                <dt>Last Modified</dt>
                <dd>{detail.lastModified ? `${formatRelative(detail.lastModified)} (${new Date(detail.lastModified).toLocaleString()})` : "Not available"}</dd>
              </div>
              <div className="fact"><dt>Primary Language</dt><dd>{detail.language ?? "Not available"}</dd></div>
              <div className="fact"><dt>Framework</dt><dd>{detail.framework ?? "Not available"}</dd></div>
              <div className="fact"><dt>Data source</dt><dd>{isDemo ? "Demo workspace (sample data)" : "Local scan"}</dd></div>
            </dl>
          </section>

          <section>
            <h3>
              Health Score <span className={`source-tag ${isDemo ? "demo" : "scan"}`}>{isDemo ? "demo data" : "from scan"}</span>
            </h3>
            <div className="health-summary">
              <HealthRing score={detail.healthScore} accent={detail.accent} dataSource={detail.dataSource} />
              <p className="inspector-muted small">
                {isDemo
                  ? "Headline score is the average of the breakdown below. Illustrative only."
                  : "Weighted average of the computable components; N/A components are excluded, never counted as zero."}
              </p>
            </div>
            <HealthBreakdown items={detail.healthBreakdown} accent={detail.accent} />
          </section>

          <section>
            <h3>Technology Stack</h3>
            {detail.techStack.length > 0 ? (
              <ul className="pill-list">
                {detail.techStack.map((t) => (
                  <li key={t} className="pill">{t}</li>
                ))}
              </ul>
            ) : (
              <p className="inspector-muted">Not available.</p>
            )}
            <h3>Project Components</h3>
            {detail.components.length > 0 ? (
              <ul className="component-list">
                {detail.components.map((c) => (
                  <li key={c} className="component-chip">{c}</li>
                ))}
              </ul>
            ) : (
              <p className="inspector-muted">No components detected.</p>
            )}
          </section>

          <section>
            <h3>Recent Activity</h3>
            {detail.recentActivity.length > 0 ? (
              <ul className="activity-list">
                {detail.recentActivity.map((a) => (
                  <li key={a.id}>
                    <span className="activity-text">{a.text}</span>
                    <time dateTime={a.at} className="activity-time" title={new Date(a.at).toLocaleString()}>
                      {formatRelative(a.at)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="inspector-muted">No recent activity recorded.</p>
            )}
          </section>
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
