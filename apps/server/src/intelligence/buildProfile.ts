/**
 * Compact project intelligence profile — deterministic, rule-based (no AI/LLM call).
 * Source: ai-project-workspace-phase0/00-overview/MASTER_SPEC.md §3 "Reduced intelligence"
 *         ai-project-workspace-phase0/04-data/PROVENANCE_AND_CONFIDENCE.md
 *
 * Everything here is INFERRED (rule-derived from DETERMINISTIC scanner evidence), never
 * AI_INFERRED — the AI feature (src/ai/explainProject.ts) is a separate, clearly labeled
 * layer on top of this, not a replacement for it.
 */
import type { Confidence } from "../domain/confidence.js";
import type { EvidenceRecord, ScanOutcome } from "../scanner/scan.js";

export interface TechnologyDraft {
  name: string;
  kind: "language" | "framework" | "packageManager" | "ecosystem";
  evidenceSource: string;
  confidence: Confidence;
}

export interface RecommendationDraft {
  text: string;
  rationale: string;
  confidence: Confidence;
}

export interface IntelligenceProfileDraft {
  description: string;
  category: string;
  projectType: string;
  architectureSummary: string;
  healthSummary: string;
  confidence: Confidence;
  technologies: TechnologyDraft[];
  recommendations: RecommendationDraft[];
}

const FRONTEND_FRAMEWORKS = new Set(["React", "Next.js", "Vue", "Angular", "Svelte"]);
const BACKEND_FRAMEWORKS = new Set(["Express", "NestJS", "Django", "Flask", "FastAPI"]);

function pickTopLanguage(evidence: EvidenceRecord[]): string | null {
  const languageEvidence = evidence.filter((e) => e.evidenceType === "language");
  if (languageEvidence.length === 0) return null;
  // value format: "TypeScript (42 files)" — extract count to rank, fall back to first.
  let best: { name: string; count: number } | null = null;
  for (const e of languageEvidence) {
    const match = /^(.+?) \((\d+) files?\)$/.exec(e.value);
    if (!match) continue;
    const count = Number(match[2]);
    if (!best || count > best.count) best = { name: match[1], count };
  }
  return best?.name ?? languageEvidence[0].value;
}

export function buildIntelligenceProfile(
  discoveryConfidence: Confidence,
  evidence: EvidenceRecord[],
  scan: ScanOutcome,
): IntelligenceProfileDraft {
  const frameworks = [...new Set(evidence.filter((e) => e.key === "framework").map((e) => e.value))];
  const ecosystems = [...new Set(evidence.filter((e) => e.key === "ecosystem").map((e) => e.value))];
  const packageManagers = [...new Set(evidence.filter((e) => e.key === "packageManager").map((e) => e.value))];
  const hasReadme = evidence.some((e) => e.key === "readme");
  const hasGit = evidence.some((e) => e.key === "gitBranch");
  const topLanguage = pickTopLanguage(evidence);

  const technologies: TechnologyDraft[] = [];
  for (const e of evidence) {
    if (e.key === "language") {
      const name = e.value.replace(/\s\(\d+ files?\)$/, "");
      technologies.push({ name, kind: "language", evidenceSource: e.sourcePath, confidence: "DETERMINISTIC" });
    } else if (e.key === "framework") {
      technologies.push({ name: e.value, kind: "framework", evidenceSource: e.sourcePath, confidence: "DETERMINISTIC" });
    } else if (e.key === "packageManager") {
      technologies.push({ name: e.value, kind: "packageManager", evidenceSource: e.sourcePath, confidence: "DETERMINISTIC" });
    } else if (e.key === "ecosystem") {
      technologies.push({ name: e.value, kind: "ecosystem", evidenceSource: e.sourcePath, confidence: "DETERMINISTIC" });
    }
  }

  // Category/type heuristic — simple, explainable, bounded. "Unknown" is an acceptable value.
  let category = "Unknown";
  let projectType = "Unknown";
  const hasFrontend = frameworks.some((f) => FRONTEND_FRAMEWORKS.has(f));
  const hasBackend = frameworks.some((f) => BACKEND_FRAMEWORKS.has(f));

  if (hasFrontend && hasBackend) {
    category = "Full-stack application";
    projectType = "Web application";
  } else if (hasFrontend) {
    category = "Web frontend";
    projectType = "Web application";
  } else if (hasBackend) {
    category = "Backend / API service";
    projectType = "Service";
  } else if (ecosystems.length > 0) {
    category = `${ecosystems[0]} project`;
    projectType = packageManagers.length > 0 ? "Application or library" : "Script/utility";
  } else if (discoveryConfidence === "INFERRED") {
    category = "Documentation-only or unrecognized";
    projectType = "Unknown";
  }

  const descriptionParts: string[] = [];
  descriptionParts.push(
    topLanguage
      ? `A ${category.toLowerCase()} written primarily in ${topLanguage}.`
      : `A ${category.toLowerCase()} with no dominant recognized language detected.`,
  );
  if (frameworks.length > 0) descriptionParts.push(`Uses ${frameworks.join(", ")}.`);
  if (packageManagers.length > 0) descriptionParts.push(`Managed with ${packageManagers.join(", ")}.`);

  const architectureSummary =
    hasFrontend && hasBackend
      ? "Appears to combine a frontend and a backend/service layer in one project root."
      : hasFrontend
        ? "Appears to be a client-side/UI-focused codebase."
        : hasBackend
          ? "Appears to be a server-side service/API codebase."
          : "No clear architectural layer detected from available evidence.";

  const healthParts: string[] = [];
  healthParts.push(hasGit ? "Git repository detected." : "No Git repository detected.");
  healthParts.push(hasReadme ? "Has a README." : "No README found.");
  if (scan.truncated) healthParts.push("Scan was truncated at the file-count safety limit.");
  if (scan.errors.length > 0) healthParts.push(`${scan.errors.length} path(s) could not be read during scan.`);
  const healthSummary = healthParts.join(" ");

  const recommendations: RecommendationDraft[] = [];
  if (!hasReadme) {
    recommendations.push({
      text: "Add a README describing what this project does.",
      rationale: "No README was found; project purpose is harder to rediscover later without one.",
      confidence: "INFERRED",
    });
  }
  if (discoveryConfidence === "INFERRED") {
    recommendations.push({
      text: "Confirm whether this is an actual project — no manifest or build file was found.",
      rationale: "This folder was only included because of a README; no strong project signal (manifest, .git, build file) was detected.",
      confidence: "INFERRED",
    });
  }
  if (scan.truncated) {
    recommendations.push({
      text: "Consider narrowing exclusions — this project hit the scan size limit before finishing.",
      rationale: `Scan stopped after visiting the safety limit of entries; results may be incomplete.`,
      confidence: "DETERMINISTIC",
    });
  }

  return {
    description: descriptionParts.join(" "),
    category,
    projectType,
    architectureSummary,
    healthSummary,
    confidence: "INFERRED",
    technologies,
    recommendations,
  };
}
