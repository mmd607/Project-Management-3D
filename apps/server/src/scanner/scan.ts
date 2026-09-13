/**
 * Reduced metadata scanner.
 * Source: ai-project-workspace-phase0/06-scanner/SCANNER_SPEC.md
 *
 * Detects only where evidence exists. Never executes project code/scripts. Bounded
 * traversal — one bad/huge project must not crash the whole workspace scan; partial
 * results + recorded errors beat a hard failure.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import type { Confidence } from "../domain/confidence.js";
import { isSecretFileName, type ExclusionPolicy } from "../security/exclusions.js";

export interface EvidenceRecord {
  evidenceType: string;
  sourcePath: string;
  key: string;
  value: string;
  confidence: Confidence;
}

export interface ScanOutcome {
  status: "OK" | "PARTIAL" | "FAILED";
  fileCount: number;
  directoryCount: number;
  /** Sum of on-disk sizes of files actually visited during this scan (bytes). Excludes
   * files skipped by exclusion rules or the traversal cap — this is "scanned size", not
   * necessarily the project's true total size if the scan was partial/truncated. */
  totalSizeBytes: number;
  evidence: EvidenceRecord[];
  errors: { path: string; message: string }[];
  truncated: boolean;
}

const MAX_FILES_VISITED = 5000;

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".py": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".cc": "C++",
  ".c": "C",
  ".h": "C/C++ header",
  ".swift": "Swift",
  ".dart": "Dart",
  ".ex": "Elixir",
  ".exs": "Elixir",
};

const MANIFEST_PACKAGE_MANAGER: Record<string, { manager: string; ecosystem: string }> = {
  "package.json": { manager: "npm", ecosystem: "Node.js" },
  "requirements.txt": { manager: "pip", ecosystem: "Python" },
  "pyproject.toml": { manager: "pip/poetry", ecosystem: "Python" },
  "Cargo.toml": { manager: "cargo", ecosystem: "Rust" },
  "go.mod": { manager: "go modules", ecosystem: "Go" },
  "pom.xml": { manager: "maven", ecosystem: "Java" },
  "build.gradle": { manager: "gradle", ecosystem: "Java/Kotlin" },
  "build.gradle.kts": { manager: "gradle", ecosystem: "Kotlin" },
  "composer.json": { manager: "composer", ecosystem: "PHP" },
  Gemfile: { manager: "bundler", ecosystem: "Ruby" },
  "mix.exs": { manager: "mix", ecosystem: "Elixir" },
  "pubspec.yaml": { manager: "pub", ecosystem: "Dart" },
};

// "Components" the project is made of — real structural presence checks only, feeding both
// the UI's "what this project is made of" and the Health Score's tests/documentation
// sub-scores (docs/DATA_AND_SCORING.md). Never inferred from anything but a literal match.
const TEST_DIR_NAMES = new Set(["test", "tests", "__tests__", "spec", "specs"]);
const DOCS_DIR_NAMES = new Set(["docs", "doc", "documentation"]);
const TEST_FRAMEWORK_MARKERS: RegExp[] = [
  /"(jest|vitest|mocha|jasmine|ava|tape)"\s*:/,
  /\bpytest\b/i,
  /\bunittest\b/i,
  /\brspec\b/i,
  /\bphpunit\b/i,
];
const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "Pipfile.lock",
  "Gemfile.lock",
  "composer.lock",
  "Cargo.lock",
  "go.sum",
]);
const DEPLOYMENT_FILE_NAMES = new Set(["Dockerfile", "docker-compose.yml", "docker-compose.yaml", "Procfile"]);
const CI_CONFIG_DIR_NAMES = new Set([".github", ".gitlab", ".circleci"]);

const FRAMEWORK_MARKERS: { pattern: RegExp; framework: string }[] = [
  { pattern: /"react"\s*:/, framework: "React" },
  { pattern: /"next"\s*:/, framework: "Next.js" },
  { pattern: /"vue"\s*:/, framework: "Vue" },
  { pattern: /"@angular\/core"\s*:/, framework: "Angular" },
  { pattern: /"svelte"\s*:/, framework: "Svelte" },
  { pattern: /"express"\s*:/, framework: "Express" },
  { pattern: /"@nestjs\/core"\s*:/, framework: "NestJS" },
  { pattern: /\bdjango\b/i, framework: "Django" },
  { pattern: /\bflask\b/i, framework: "Flask" },
  { pattern: /\bfastapi\b/i, framework: "FastAPI" },
];

function safeReadSmallFile(path: string, maxBytes: number): string | null {
  try {
    const st = statSync(path);
    if (!st.isFile() || st.size > maxBytes) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function detectGitBranch(projectRoot: string): string | null {
  const headPath = join(projectRoot, ".git", "HEAD");
  const content = safeReadSmallFile(headPath, 4096);
  if (!content) return null;
  const trimmed = content.trim();
  const match = /^ref:\s*refs\/heads\/(.+)$/.exec(trimmed);
  if (match) return match[1];
  return trimmed.slice(0, 12); // detached HEAD: short hash
}

export function scanProject(
  projectRoot: string,
  exclusions: ExclusionPolicy,
  maxFilesVisited: number = MAX_FILES_VISITED,
): ScanOutcome {
  const evidence: EvidenceRecord[] = [];
  const errors: { path: string; message: string }[] = [];
  const languageCounts = new Map<string, number>();
  const componentsSeen = new Set<string>(); // dedup: emit each component/lockfile once
  let fileCount = 0;
  let directoryCount = 0;
  let totalSizeBytes = 0;
  let truncated = false;
  let visited = 0;

  function emitComponentOnce(key: string, value: string, sourcePath: string) {
    const dedupeKey = `${key}:${value}`;
    if (componentsSeen.has(dedupeKey)) return;
    componentsSeen.add(dedupeKey);
    evidence.push({ evidenceType: "structure", sourcePath, key, value, confidence: "DETERMINISTIC" });
  }

  function walk(dirPath: string): void {
    if (truncated) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
      errors.push({ path: dirPath, message: (err as Error).message });
      return;
    }

    for (const entry of entries) {
      if (truncated) return;
      if (entry.isSymbolicLink()) continue;
      visited += 1;
      if (visited > maxFilesVisited) {
        truncated = true;
        return;
      }

      const entryPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (exclusions.excludedDirNames.has(entry.name)) continue;
        directoryCount += 1;
        const lowerName = entry.name.toLowerCase();
        if (TEST_DIR_NAMES.has(lowerName)) emitComponentOnce("component", "tests", entryPath);
        if (DOCS_DIR_NAMES.has(lowerName)) emitComponentOnce("component", "docs", entryPath);
        if (CI_CONFIG_DIR_NAMES.has(entry.name)) emitComponentOnce("component", "deployment", entryPath);
        walk(entryPath);
        continue;
      }

      if (!entry.isFile()) continue;
      fileCount += 1;
      try {
        totalSizeBytes += statSync(entryPath).size;
      } catch {
        /* size is best-effort; a stat race (file removed mid-scan) shouldn't fail the scan */
      }

      if (LOCKFILE_NAMES.has(entry.name)) {
        emitComponentOnce("lockfile", entry.name, entryPath);
      }
      if (DEPLOYMENT_FILE_NAMES.has(entry.name)) {
        emitComponentOnce("component", "deployment", entryPath);
      }

      const ext = extname(entry.name).toLowerCase();
      const language = LANGUAGE_BY_EXTENSION[ext];
      if (language) {
        languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
      }

      if (MANIFEST_PACKAGE_MANAGER[entry.name]) {
        const { manager, ecosystem } = MANIFEST_PACKAGE_MANAGER[entry.name];
        evidence.push({
          evidenceType: "manifest",
          sourcePath: entryPath,
          key: "packageManager",
          value: manager,
          confidence: "DETERMINISTIC",
        });
        evidence.push({
          evidenceType: "manifest",
          sourcePath: entryPath,
          key: "ecosystem",
          value: ecosystem,
          confidence: "DETERMINISTIC",
        });

        if (!isSecretFileName(entry.name)) {
          const content = safeReadSmallFile(entryPath, exclusions.maxFileReadBytes);
          if (content) {
            for (const marker of FRAMEWORK_MARKERS) {
              if (marker.pattern.test(content)) {
                evidence.push({
                  evidenceType: "manifest",
                  sourcePath: entryPath,
                  key: "framework",
                  value: marker.framework,
                  confidence: "DETERMINISTIC",
                });
              }
            }
            if (TEST_FRAMEWORK_MARKERS.some((pattern) => pattern.test(content))) {
              emitComponentOnce("component", "tests", entryPath);
            }
          }
        }
      }

      if (/^readme(\.\w+)?$/i.test(entry.name)) {
        evidence.push({
          evidenceType: "documentation",
          sourcePath: entryPath,
          key: "readme",
          value: entry.name,
          confidence: "DETERMINISTIC",
        });
      }
    }
  }

  try {
    walk(projectRoot);
  } catch (err) {
    return {
      status: "FAILED",
      fileCount,
      directoryCount,
      totalSizeBytes,
      evidence,
      errors: [...errors, { path: projectRoot, message: (err as Error).message }],
      truncated,
    };
  }

  for (const [language, count] of languageCounts.entries()) {
    evidence.push({
      evidenceType: "language",
      sourcePath: projectRoot,
      key: "language",
      value: `${language} (${count} file${count === 1 ? "" : "s"})`,
      confidence: "DETERMINISTIC",
    });
  }

  const gitBranch = detectGitBranch(projectRoot);
  if (gitBranch) {
    evidence.push({
      evidenceType: "git",
      sourcePath: join(projectRoot, ".git", "HEAD"),
      key: "gitBranch",
      value: gitBranch,
      confidence: "DETERMINISTIC",
    });
  }

  // The root itself being unreadable (vs. some sub-path deeper in the tree) means nothing
  // usable was gathered at all — that is a full failure, not a partial result.
  const rootUnreadable = errors.some((e) => e.path === projectRoot) && fileCount === 0 && directoryCount === 0;
  const status: ScanOutcome["status"] = rootUnreadable
    ? "FAILED"
    : errors.length > 0 || truncated
      ? "PARTIAL"
      : "OK";

  return { status, fileCount, directoryCount, totalSizeBytes, evidence, errors, truncated };
}
