import { describe, it, expect, afterEach } from "vitest";
import { scanProject } from "../src/scanner/scan.js";
import { defaultExclusionPolicy } from "../src/security/exclusions.js";
import { buildTree } from "./fixtures/buildTree.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe("scanProject", () => {
  it("detects languages by extension", () => {
    const { root, cleanup } = buildTree({
      "index.ts": "export const x = 1;",
      "a.py": "x = 1",
      src: { "b.ts": "export {}" },
    });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    const languageEvidence = result.evidence.filter((e) => e.key === "language");
    const values = languageEvidence.map((e) => e.value);
    expect(values.some((v) => v.startsWith("TypeScript (2 file"))).toBe(true);
    expect(values.some((v) => v.startsWith("Python (1 file"))).toBe(true);
    expect(result.status).toBe("OK");
  });

  it("detects a package manager and does not crash on malformed manifest JSON", () => {
    const { root, cleanup } = buildTree({
      "package.json": "{ this is not valid JSON !!", // malformed on purpose
    });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(() => result).not.toThrow();
    const pkgManager = result.evidence.find((e) => e.key === "packageManager");
    expect(pkgManager?.value).toBe("npm");
    expect(result.status).toBe("OK");
  });

  it("detects frameworks from manifest content", () => {
    const { root, cleanup } = buildTree({
      "package.json": JSON.stringify({ dependencies: { react: "^18.0.0", express: "^4.0.0" } }),
    });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    const frameworks = result.evidence.filter((e) => e.key === "framework").map((e) => e.value);
    expect(frameworks).toContain("React");
    expect(frameworks).toContain("Express");
  });

  it("detects README presence", () => {
    const { root, cleanup } = buildTree({ "README.md": "# Hello" });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.evidence.some((e) => e.key === "readme")).toBe(true);
  });

  it("reads a normal git branch from .git/HEAD", () => {
    const { root, cleanup } = buildTree({ ".git": { HEAD: "ref: refs/heads/main\n" } });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    const branch = result.evidence.find((e) => e.key === "gitBranch");
    expect(branch?.value).toBe("main");
  });

  it("reads a detached HEAD as a short hash", () => {
    const { root, cleanup } = buildTree({ ".git": { HEAD: "abcdef1234567890\n" } });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    const branch = result.evidence.find((e) => e.key === "gitBranch");
    expect(branch?.value).toBe("abcdef123456");
  });

  it("does not throw for a non-existent project root; returns FAILED status", () => {
    const { root, cleanup } = buildTree({});
    cleanup();

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.status).toBe("FAILED");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("truncates and marks PARTIAL when a safety limit is hit, without throwing", () => {
    const { root, cleanup } = buildTree({
      a: { "1.txt": "x", "2.txt": "x" },
      b: { "3.txt": "x", "4.txt": "x" },
    });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy(), 2 /* tiny visited limit */);
    expect(result.truncated).toBe(true);
    expect(result.status).toBe("PARTIAL");
  });

  it("ignores excluded directories while scanning", () => {
    const { root, cleanup } = buildTree({
      node_modules: { "index.js": "module.exports = {}" },
      "app.ts": "export {}",
    });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    // Only app.ts should be counted; node_modules/index.js must be skipped entirely.
    expect(result.fileCount).toBe(1);
  });

  it("detects a test directory as a real structural component", () => {
    const { root, cleanup } = buildTree({ tests: { "test_app.py": "def test_x(): pass" } });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.evidence.some((e) => e.key === "component" && e.value === "tests")).toBe(true);
  });

  it("detects a test framework dependency in a manifest even with no test directory", () => {
    const { root, cleanup } = buildTree({
      "package.json": JSON.stringify({ devDependencies: { vitest: "^2.0.0" } }),
    });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.evidence.some((e) => e.key === "component" && e.value === "tests")).toBe(true);
  });

  it("detects a docs directory", () => {
    const { root, cleanup } = buildTree({ docs: { "guide.md": "# Guide" } });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.evidence.some((e) => e.key === "component" && e.value === "docs")).toBe(true);
  });

  it("detects a lockfile", () => {
    const { root, cleanup } = buildTree({ "package.json": "{}", "package-lock.json": "{}" });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.evidence.some((e) => e.key === "lockfile" && e.value === "package-lock.json")).toBe(true);
  });

  it("detects a deployment component from a Dockerfile", () => {
    const { root, cleanup } = buildTree({ Dockerfile: "FROM node:20" });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.evidence.some((e) => e.key === "component" && e.value === "deployment")).toBe(true);
  });

  it("detects a deployment component from a CI config directory", () => {
    const { root, cleanup } = buildTree({ ".github": { workflows: { "ci.yml": "name: CI" } } });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.evidence.some((e) => e.key === "component" && e.value === "deployment")).toBe(true);
  });

  it("does not emit duplicate component evidence when multiple signals point to the same component", () => {
    const { root, cleanup } = buildTree({
      tests: { "a.spec.ts": "" },
      "package.json": JSON.stringify({ devDependencies: { vitest: "^2.0.0" } }),
    });
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    const testComponents = result.evidence.filter((e) => e.key === "component" && e.value === "tests");
    expect(testComponents).toHaveLength(1);
  });

  it("tracks total scanned size in bytes", () => {
    const { root, cleanup } = buildTree({ "a.txt": "12345", "b.txt": "1234567890" }); // 5 + 10 bytes
    cleanups.push(cleanup);

    const result = scanProject(root, defaultExclusionPolicy());
    expect(result.totalSizeBytes).toBe(15);
  });
});
