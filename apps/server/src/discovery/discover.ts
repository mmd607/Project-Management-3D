/**
 * Project discovery.
 * Source: ai-project-workspace-phase0/06-scanner/PROJECT_DISCOVERY.md ("v0 default policy")
 *
 * A project boundary is not "every child directory" — it is evidence-based. v0 defaults:
 * - depth <= 3 below the workspace root (configurable)
 * - one level of nesting detection: once a directory qualifies as a project, do not keep
 *   descending into it looking for more nested projects
 * - monorepos surface as a single project at their root (no per-package breakdown)
 * - empty/near-empty folders are not discovered as projects (but are still traversed through)
 * - symlinks are never followed
 * - confidence threshold: at least one strong signal (.git, a recognized manifest, or a
 *   build/config file) to qualify; README-only folders are low-confidence candidates, never
 *   silently dropped or silently promoted
 */
import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import type { Confidence } from "../domain/confidence.js";
import type { ExclusionPolicy } from "../security/exclusions.js";

export interface ProjectCandidate {
  rootPath: string;
  name: string;
  confidence: Confidence; // DETERMINISTIC (strong signal) | INFERRED (README-only)
  evidenceSignals: string[];
}

export interface DiscoveryError {
  path: string;
  message: string;
}

export interface DiscoveryResult {
  projects: ProjectCandidate[];
  errors: DiscoveryError[];
}

export interface DiscoveryOptions {
  maxDepth: number;
  minFileCountForCandidate: number;
  exclusions: ExclusionPolicy;
}

export const DEFAULT_DISCOVERY_OPTIONS: Omit<DiscoveryOptions, "exclusions"> = {
  maxDepth: 3,
  minFileCountForCandidate: 1,
};

const RECOGNIZED_MANIFESTS = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "setup.py",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "composer.json",
  "Gemfile",
  "mix.exs",
  "pubspec.yaml",
]);

const RECOGNIZED_BUILD_FILES = new Set([
  "Dockerfile",
  "Makefile",
  "CMakeLists.txt",
  "docker-compose.yml",
  "docker-compose.yaml",
]);

function isReadmeName(name: string): boolean {
  return /^readme(\.\w+)?$/i.test(name);
}

interface DirEvidence {
  strongSignals: string[];
  hasReadme: boolean;
  hasGit: boolean;
  fileCount: number;
}

function inspectDirectory(entries: import("node:fs").Dirent[]): DirEvidence {
  const evidence: DirEvidence = { strongSignals: [], hasReadme: false, hasGit: false, fileCount: 0 };

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue; // never follow symlinks in v0

    if (entry.isDirectory()) {
      if (entry.name === ".git") {
        evidence.hasGit = true;
        evidence.strongSignals.push(".git");
      }
      continue;
    }

    if (entry.isFile()) {
      evidence.fileCount += 1;
      if (RECOGNIZED_MANIFESTS.has(entry.name)) evidence.strongSignals.push(entry.name);
      if (RECOGNIZED_BUILD_FILES.has(entry.name)) evidence.strongSignals.push(entry.name);
      if (isReadmeName(entry.name)) evidence.hasReadme = true;
    }
  }

  return evidence;
}

function classify(evidence: DirEvidence, minFileCount: number): { confidence: Confidence | null; signals: string[] } {
  if (evidence.strongSignals.length > 0) {
    return { confidence: "DETERMINISTIC", signals: evidence.strongSignals };
  }
  if (evidence.hasReadme && evidence.fileCount >= minFileCount) {
    return { confidence: "INFERRED", signals: ["README"] };
  }
  return { confidence: null, signals: [] };
}

export function discoverProjects(rootPath: string, opts: DiscoveryOptions): DiscoveryResult {
  const projects: ProjectCandidate[] = [];
  const errors: DiscoveryError[] = [];

  function walk(dirPath: string, depth: number): void {
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
      errors.push({ path: dirPath, message: (err as Error).message });
      return;
    }

    const evidence = inspectDirectory(entries);
    const { confidence, signals } = classify(evidence, opts.minFileCountForCandidate);

    if (confidence !== null) {
      projects.push({
        rootPath: dirPath,
        name: basename(dirPath),
        confidence,
        evidenceSignals: signals,
      });
      // One level of nesting detection: do not recurse further into a confirmed project
      // looking for more nested projects (per PROJECT_DISCOVERY.md v0 default policy).
      return;
    }

    if (depth >= opts.maxDepth) return;

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (opts.exclusions.excludedDirNames.has(entry.name)) continue;

      const childPath = join(dirPath, entry.name);
      try {
        const st = statSync(childPath);
        if (!st.isDirectory()) continue;
      } catch (err) {
        errors.push({ path: childPath, message: (err as Error).message });
        continue;
      }

      walk(childPath, depth + 1);
    }
  }

  walk(rootPath, 0);

  return { projects, errors };
}
