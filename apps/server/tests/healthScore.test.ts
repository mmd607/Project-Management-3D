import { describe, it, expect } from "vitest";
import { computeHealthScore, HEALTH_COMPONENT_WEIGHTS } from "../src/intelligence/healthScore.js";
import type { EvidenceRecord, ScanOutcome } from "../src/scanner/scan.js";

function ev(key: string, value: string, evidenceType = "structure"): EvidenceRecord {
  return { evidenceType, sourcePath: "/x", key, value, confidence: "DETERMINISTIC" };
}

function scan(overrides: Partial<Pick<ScanOutcome, "status" | "truncated" | "errors">> = {}) {
  return { status: "OK" as const, truncated: false, errors: [], ...overrides };
}

describe("computeHealthScore", () => {
  it("scores every component fully when all real signals are present", () => {
    const evidence = [
      ev("component", "tests"),
      ev("readme", "README.md", "documentation"),
      ev("component", "docs"),
      ev("packageManager", "npm", "manifest"),
      ev("lockfile", "package-lock.json", "manifest"),
      ev("gitBranch", "main", "git"),
    ];
    const result = computeHealthScore(evidence, scan());

    expect(result.version).toBe("v1");
    expect(result.coverage).toBe(1);
    expect(result.overallScore).toBe(100);
    for (const c of result.components) expect(c.score).toBe(100);
  });

  it("never reports a fabricated zero for dependencies when no package manager was found — N/A instead", () => {
    const result = computeHealthScore([ev("readme", "README.md", "documentation")], scan());
    const deps = result.components.find((c) => c.key === "dependencies")!;
    expect(deps.score).toBeNull();
    expect(deps.method).toMatch(/does not apply/);
  });

  it("scores 0 (not N/A) for tests/documentation/activity when the scan succeeded but found nothing — absence is real information here", () => {
    const result = computeHealthScore([], scan());
    expect(result.components.find((c) => c.key === "tests")!.score).toBe(0);
    expect(result.components.find((c) => c.key === "documentation")!.score).toBe(0);
    expect(result.components.find((c) => c.key === "activity")!.score).toBe(0);
  });

  it("marks every component N/A and overallScore null when the scan failed entirely", () => {
    const result = computeHealthScore([], scan({ status: "FAILED" }));
    expect(result.overallScore).toBeNull();
    expect(result.coverage).toBe(0);
    for (const c of result.components) expect(c.score).toBeNull();
  });

  it("rewards a lockfile over a bare manifest for dependencies", () => {
    const withLockfile = computeHealthScore(
      [ev("packageManager", "npm", "manifest"), ev("lockfile", "package-lock.json", "manifest")],
      scan(),
    );
    const withoutLockfile = computeHealthScore([ev("packageManager", "npm", "manifest")], scan());
    const scoreWith = withLockfile.components.find((c) => c.key === "dependencies")!.score!;
    const scoreWithout = withoutLockfile.components.find((c) => c.key === "dependencies")!.score!;
    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it("penalizes multiple conflicting package managers with no lockfile", () => {
    const result = computeHealthScore(
      [ev("packageManager", "npm", "manifest"), ev("packageManager", "yarn", "manifest")],
      scan(),
    );
    const deps = result.components.find((c) => c.key === "dependencies")!;
    expect(deps.score).toBeLessThan(50);
    expect(deps.method).toMatch(/Multiple package managers/);
  });

  it("gives documentation partial credit for a README without a docs directory", () => {
    const result = computeHealthScore([ev("readme", "README.md", "documentation")], scan());
    expect(result.components.find((c) => c.key === "documentation")!.score).toBe(70);
  });

  it("penalizes structure for a truncated scan, without affecting unrelated components", () => {
    const result = computeHealthScore(
      [ev("packageManager", "npm", "manifest"), ev("lockfile", "package-lock.json", "manifest")],
      scan({ truncated: true }),
    );
    expect(result.components.find((c) => c.key === "structure")!.score).toBeLessThan(100);
    expect(result.components.find((c) => c.key === "dependencies")!.score).toBe(100); // unaffected
  });

  it("renormalizes the overall score over only the computable components (coverage < 1)", () => {
    // No package manager at all -> dependencies is N/A (weight 20 excluded).
    const evidence = [ev("component", "tests"), ev("readme", "README.md", "documentation"), ev("gitBranch", "main", "git")];
    const result = computeHealthScore(evidence, scan());
    const expectedCoverage = (100 - HEALTH_COMPONENT_WEIGHTS.dependencies) / 100;
    expect(result.coverage).toBeCloseTo(expectedCoverage, 5);
    // tests=100, documentation=70, structure=100, activity=100, weights 30+20+20+10=80
    const expectedOverall = Math.round((100 * 30 + 70 * 20 + 100 * 20 + 100 * 10) / 80);
    expect(result.overallScore).toBe(expectedOverall);
  });

  it("every component result carries a human-readable method string, never a bare number", () => {
    const result = computeHealthScore([], scan());
    for (const c of result.components) {
      expect(typeof c.method).toBe("string");
      expect(c.method.length).toBeGreaterThan(0);
    }
  });
});
