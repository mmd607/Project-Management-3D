/**
 * Default scan exclusions.
 * Source: ai-project-workspace-phase0/06-scanner/EXCLUSIONS.md ("v0 default patterns")
 * All defaults are user-overridable — nothing here is a hard-coded limit.
 */

export const DEFAULT_EXCLUDED_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "venv",
  ".venv",
  "env",
  "__pycache__",
  ".pytest_cache",
  "dist",
  "build",
  "out",
  "target",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  ".parcel-cache",
  "coverage",
  ".idea",
  ".vscode",
  "site-packages",
]);

/** Content of these files/patterns is never read, even though the path may be discovered. */
export const SECRET_FILE_PATTERNS: RegExp[] = [
  /^\.env(\..*)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa/i,
  /\.pfx$/i,
  /password/i,
  /secret/i,
];

/** Skip reading file contents above this size for textual/manifest analysis. */
export const MAX_FILE_READ_BYTES = 2 * 1024 * 1024; // 2 MB

export function isExcludedDirName(name: string): boolean {
  return DEFAULT_EXCLUDED_DIR_NAMES.has(name);
}

export function isSecretFileName(name: string): boolean {
  return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(name));
}

export interface ExclusionPolicy {
  excludedDirNames: Set<string>;
  secretFilePatterns: RegExp[];
  maxFileReadBytes: number;
}

export function defaultExclusionPolicy(): ExclusionPolicy {
  return {
    excludedDirNames: new Set(DEFAULT_EXCLUDED_DIR_NAMES),
    secretFilePatterns: [...SECRET_FILE_PATTERNS],
    maxFileReadBytes: MAX_FILE_READ_BYTES,
  };
}
