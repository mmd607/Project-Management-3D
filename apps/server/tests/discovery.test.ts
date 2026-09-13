import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import { discoverProjects, DEFAULT_DISCOVERY_OPTIONS } from "../src/discovery/discover.js";
import { defaultExclusionPolicy } from "../src/security/exclusions.js";
import { buildTree, tryCreateSymlink } from "./fixtures/buildTree.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function opts(overrides: Partial<typeof DEFAULT_DISCOVERY_OPTIONS> = {}) {
  return { ...DEFAULT_DISCOVERY_OPTIONS, ...overrides, exclusions: defaultExclusionPolicy() };
}

describe("discoverProjects", () => {
  it("discovers a project with strong evidence and does not recurse into it for nested projects", () => {
    const { root, cleanup } = buildTree({
      appA: {
        ".git": {},
        "package.json": '{"name":"app-a"}',
        nested: { ".git": {} }, // must NOT be discovered separately — inside a confirmed project
      },
    });
    cleanups.push(cleanup);

    const { projects, errors } = discoverProjects(root, opts());

    expect(errors).toEqual([]);
    expect(projects).toHaveLength(1);
    expect(projects[0].rootPath).toBe(join(root, "appA"));
    expect(projects[0].confidence).toBe("DETERMINISTIC");
  });

  it("discovers multiple sibling projects", () => {
    const { root, cleanup } = buildTree({
      appA: { "package.json": "{}" },
      libs: { appB: { "Cargo.toml": "[package]" } },
    });
    cleanups.push(cleanup);

    const { projects } = discoverProjects(root, opts());
    const paths = projects.map((p) => p.rootPath).sort();
    expect(paths).toEqual([join(root, "appA"), join(root, "libs", "appB")].sort());
  });

  it("returns no projects for an empty root", () => {
    const { root, cleanup } = buildTree({});
    cleanups.push(cleanup);

    const { projects, errors } = discoverProjects(root, opts());
    expect(projects).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("ignores excluded directory names at any depth", () => {
    const { root, cleanup } = buildTree({
      node_modules: { somepkg: { "package.json": "{}" } },
    });
    cleanups.push(cleanup);

    const { projects } = discoverProjects(root, opts());
    expect(projects).toEqual([]);
  });

  it("surfaces a README-only folder as a low-confidence candidate, not silently dropped", () => {
    const { root, cleanup } = buildTree({
      notes: { "README.md": "just some notes", "a.txt": "x" },
    });
    cleanups.push(cleanup);

    const { projects } = discoverProjects(root, opts());
    expect(projects).toHaveLength(1);
    expect(projects[0].confidence).toBe("INFERRED");
  });

  it("does not throw for a non-existent root; reports it as an error instead", () => {
    const { root, cleanup } = buildTree({});
    cleanup(); // remove the dir so root no longer exists

    const { projects, errors } = discoverProjects(root, opts());
    expect(projects).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe(root);
  });

  it("respects maxDepth", () => {
    const { root, cleanup } = buildTree({
      a: { b: { c: { d: { "package.json": "{}" } } } }, // depth 4
    });
    cleanups.push(cleanup);

    const shallow = discoverProjects(root, opts({ maxDepth: 2 }));
    expect(shallow.projects).toEqual([]);

    const deep = discoverProjects(root, opts({ maxDepth: 4 }));
    expect(deep.projects).toHaveLength(1);
  });

  it("does not follow symlinked directories (loop safety)", () => {
    const { root, cleanup } = buildTree({ real: { "package.json": "{}" } });
    cleanups.push(cleanup);

    const linkPath = join(root, "loop");
    const created = tryCreateSymlink(root, linkPath); // link back to root itself
    if (!created) return; // environment cannot create symlinks (e.g. Windows without dev mode) — skip silently

    const { projects, errors } = discoverProjects(root, opts());
    // Must terminate (no infinite recursion) and must still find the real project.
    expect(projects.some((p) => p.rootPath === join(root, "real"))).toBe(true);
    expect(errors).toEqual([]);
  });
});
