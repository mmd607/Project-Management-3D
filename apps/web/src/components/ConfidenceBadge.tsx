import type { Confidence } from "../api/types";

const LABEL: Record<Confidence, string> = {
  DETERMINISTIC: "Detected fact",
  INFERRED: "Inferred (rule-based)",
  AI_INFERRED: "AI-generated",
  UNKNOWN: "Unknown",
};

const CLASS: Record<Confidence, string> = {
  DETERMINISTIC: "badge badge-fact",
  INFERRED: "badge badge-inferred",
  AI_INFERRED: "badge badge-ai",
  UNKNOWN: "badge badge-unknown",
};

/**
 * Renders the provenance/confidence category for a single claim.
 * Per ai-project-workspace-phase0/04-data/PROVENANCE_AND_CONFIDENCE.md: "The UI must not
 * blur these categories" — this badge is the one place that distinction is rendered, and
 * every evidence/intelligence/AI value in this app must be shown next to one.
 */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className={CLASS[confidence]}>{LABEL[confidence]}</span>;
}
