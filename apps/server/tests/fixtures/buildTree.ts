import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Declarative fixture tree:
 *   { "package.json": '{"name":"x"}', "src": { "index.ts": "..." } }
 * A string value = file content. An object value = a subdirectory.
 */
export type TreeSpec = { [name: string]: string | TreeSpec };

export function buildTree(spec: TreeSpec): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "piw-test-"));

  function write(dir: string, node: TreeSpec) {
    for (const [name, value] of Object.entries(node)) {
      const path = join(dir, name);
      if (typeof value === "string") {
        writeFileSync(path, value);
      } else {
        mkdirSync(path, { recursive: true });
        write(path, value);
      }
    }
  }

  write(root, spec);

  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

/** Returns false (and does nothing) if this OS/user cannot create symlinks (e.g. Windows without dev mode). */
export function tryCreateSymlink(target: string, linkPath: string): boolean {
  try {
    symlinkSync(target, linkPath, "junction");
    return true;
  } catch {
    return false;
  }
}
