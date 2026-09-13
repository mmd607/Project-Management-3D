/**
 * Project Health Score — transparent, versioned, explainable.
 *
 * Source: project-nexus-claude-pack Task 02. Explicitly NOT the reference image's "82%
 * Good" style success percentage (that has no defined meaning) — this is a named, weighted,
 * documented score computed only from real local evidence, with missing evidence reported
 * as N/A rather than a fabricated zero. See docs/DATA_AND_SCORING.md for the human-readable
 * write-up of this exact formula; keep the two in sync if either changes.
 */
import type { EvidenceRecord, ScanOutcome } from "../scanner/scan.js";

export const HEALTH_SCORE_VERSION = "v1";

export type HealthComponentKey = "tests" | "documentation" | "dependencies" | "structure" | "activity";

export const HEALTH_COMPONENT_WEIGHTS: Record<HealthComponentKey, number> = {
  tests: 30,
  documentation: 20,
  dependencies: 20,
  structure: 20,
  activity: 10,
};

export interface HealthComponentResult {
  key: HealthComponentKey;
  label: string;
  weight: number;
  /** 0-100, or null when there isn't enough evidence to judge this component at all —
   * never a fabricated zero standing in for "unknown". */
  score: number | null;
  method: string;
  evidenceRefs: string[];
}

export interface HealthScoreResult {
  version: string;
  computedAt: string;
  /** Weighted average over only the computable (non-null) components, renormalized to
   * their own weight sum. Null if zero components were computable (e.g. scan failed). */
  overallScore: number | null;
  /** Fraction (0-1) of the total possible weight that was actually computable. */
  coverage: number;
  components: HealthComponentResult[];
}

function hasEvidence(evidence: EvidenceRecord[], key: string, value?: string): boolean {
  return evidence.some((e) => e.key === key && (value === undefined || e.value === value));
}

function distinctValues(evidence: EvidenceRecord[], key: string): string[] {
  return [...new Set(evidence.filter((e) => e.key === key).map((e) => e.value))];
}

export function computeHealthScore(
  evidence: EvidenceRecord[],
  scan: Pick<ScanOutcome, "status" | "truncated" | "errors">,
): HealthScoreResult {
  const components: HealthComponentResult[] = [];
  const scanFailed = scan.status === "FAILED";

  // Tests — presence of a recognized test directory or test-framework dependency.
  components.push(
    scanFailed
      ? { key: "tests", label: "Tests", weight: HEALTH_COMPONENT_WEIGHTS.tests, score: null, method: "Scan failed — no evidence available.", evidenceRefs: [] }
      : hasEvidence(evidence, "component", "tests")
        ? { key: "tests", label: "Tests", weight: HEALTH_COMPONENT_WEIGHTS.tests, score: 100, method: "A recognized test directory or test-framework dependency was found.", evidenceRefs: ["component:tests"] }
        : { key: "tests", label: "Tests", weight: HEALTH_COMPONENT_WEIGHTS.tests, score: 0, method: "No recognized test directory or test-framework dependency was found.", evidenceRefs: [] },
  );

  // Documentation — README presence, plus a docs/ directory.
  if (scanFailed) {
    components.push({ key: "documentation", label: "Documentation", weight: HEALTH_COMPONENT_WEIGHTS.documentation, score: null, method: "Scan failed — no evidence available.", evidenceRefs: [] });
  } else {
    const hasReadme = hasEvidence(evidence, "readme");
    const hasDocs = hasEvidence(evidence, "component", "docs");
    const score = hasReadme && hasDocs ? 100 : hasReadme ? 70 : 0;
    const refs = [hasReadme && "readme", hasDocs && "component:docs"].filter(Boolean) as string[];
    components.push({
      key: "documentation",
      label: "Documentation",
      weight: HEALTH_COMPONENT_WEIGHTS.documentation,
      score,
      method: hasReadme && hasDocs
        ? "README and a docs directory were both found."
        : hasReadme
          ? "A README was found; no separate docs directory was found."
          : "No README was found.",
      evidenceRefs: refs,
    });
  }

  // Dependencies — only computable when a package manager was actually detected; scored on
  // lockfile presence (reproducibility) and absence of conflicting package managers.
  if (scanFailed) {
    components.push({ key: "dependencies", label: "Dependencies", weight: HEALTH_COMPONENT_WEIGHTS.dependencies, score: null, method: "Scan failed — no evidence available.", evidenceRefs: [] });
  } else {
    const managers = distinctValues(evidence, "packageManager");
    if (managers.length === 0) {
      components.push({ key: "dependencies", label: "Dependencies", weight: HEALTH_COMPONENT_WEIGHTS.dependencies, score: null, method: "No package manager was detected — this component does not apply.", evidenceRefs: [] });
    } else {
      const hasLockfile = evidence.some((e) => e.key === "lockfile");
      let score = hasLockfile ? 100 : 50;
      if (managers.length > 1 && !hasLockfile) score = 20; // multiple managers, nothing pinning them
      components.push({
        key: "dependencies",
        label: "Dependencies",
        weight: HEALTH_COMPONENT_WEIGHTS.dependencies,
        score,
        method: hasLockfile
          ? `A lockfile was found for ${managers.join(", ")}.`
          : managers.length > 1
            ? `Multiple package managers detected (${managers.join(", ")}) with no lockfile.`
            : `${managers[0]} manifest found with no lockfile.`,
        evidenceRefs: [...managers.map((m) => `packageManager:${m}`), ...(hasLockfile ? ["lockfile"] : [])],
      });
    }
  }

  // Structure & scan errors — did the scan complete cleanly?
  if (scanFailed) {
    components.push({ key: "structure", label: "Structure & scan health", weight: HEALTH_COMPONENT_WEIGHTS.structure, score: null, method: "Scan failed — no evidence available.", evidenceRefs: [] });
  } else {
    const clean = scan.status === "OK" && !scan.truncated && scan.errors.length === 0;
    const score = clean ? 100 : scan.truncated ? 40 : 60;
    components.push({
      key: "structure",
      label: "Structure & scan health",
      weight: HEALTH_COMPONENT_WEIGHTS.structure,
      score,
      method: clean
        ? "Scan completed with no errors and no truncation."
        : scan.truncated
          ? "Scan was truncated at the safety limit before finishing."
          : `Scan completed with ${scan.errors.length} unreadable path(s).`,
      evidenceRefs: [],
    });
  }

  // Activity — real signal we currently have is "is this under version control at all";
  // no commit-history/frequency data exists yet (v0 has no Continuity/history feature).
  if (scanFailed) {
    components.push({ key: "activity", label: "Documented activity", weight: HEALTH_COMPONENT_WEIGHTS.activity, score: null, method: "Scan failed — no evidence available.", evidenceRefs: [] });
  } else {
    const hasGit = hasEvidence(evidence, "gitBranch");
    components.push({
      key: "activity",
      label: "Documented activity",
      weight: HEALTH_COMPONENT_WEIGHTS.activity,
      score: hasGit ? 100 : 0,
      method: hasGit
        ? "A Git repository was detected (branch/commit history exists, though not yet analyzed)."
        : "No Git repository was detected.",
      evidenceRefs: hasGit ? ["gitBranch"] : [],
    });
  }

  const computable = components.filter((c) => c.score !== null);
  const totalWeight = computable.reduce((sum, c) => sum + c.weight, 0);
  const overallScore =
    totalWeight === 0 ? null : Math.round(computable.reduce((sum, c) => sum + (c.score ?? 0) * c.weight, 0) / totalWeight);

  return {
    version: HEALTH_SCORE_VERSION,
    computedAt: new Date().toISOString(),
    overallScore,
    coverage: totalWeight / 100,
    components,
  };
}
