import { STATUS_LABEL, type ProjectStatus } from "../model/workspaceView";

interface Props {
  status: ProjectStatus;
  /** Compact = dot + text only (used under folder nodes). */
  compact?: boolean;
}

/** Status is conveyed by colour AND an icon AND text — never colour alone. */
export function StatusBadge({ status, compact = false }: Props) {
  const label = STATUS_LABEL[status];
  return (
    <span className={`status-badge status-${status}${compact ? " compact" : ""}`} data-testid={`status-${status}`}>
      <StatusIcon status={status} />
      <span>{label}</span>
    </span>
  );
}

function StatusIcon({ status }: { status: ProjectStatus }) {
  if (status === "needs-attention") {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M8 2 1.5 13.5h13L8 2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 6.5v3.2M8 11.6v.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "idle") {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 4.8V8l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m5.2 8.2 1.9 1.9 3.8-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
