/**
 * Provenance/confidence categories.
 * Source: ai-project-workspace-phase0/04-data/PROVENANCE_AND_CONFIDENCE.md
 * The UI must not blur these categories — every surfaced claim carries one of these.
 */
export type Confidence = "DETERMINISTIC" | "INFERRED" | "AI_INFERRED" | "UNKNOWN";
