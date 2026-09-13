import { describe, it, expect } from "vitest";
import { buildIntelligenceProfile } from "../src/intelligence/buildProfile.js";
import type { EvidenceRecord, ScanOutcome } from "../src/scanner/scan.js";

function scan(overrides: Partial<ScanOutcome> = {}): ScanOutcome {
  return { status: "OK", fileCount: 10, directoryCount: 2, evidence: [], errors: [], truncated: false, ...overrides };
}

function ev(partial: Partial<EvidenceRecord> & Pick<EvidenceRecord, "key" | "value">): EvidenceRecord {
  return { evidenceType: "manifest", sourcePath: "/x/package.json", confidence: "DETERMINISTIC", ...partial };
}

describe("buildIntelligenceProfile", () => {
  it("classifies a React frontend project", () => {
    const evidence = [
      ev({ key: "framework", value: "React" }),
      ev({ key: "language", value: "TypeScript (12 files)", evidenceType: "language" }),
      ev({ key: "packageManager", value: "npm" }),
    ];
    const profile = buildIntelligenceProfile("DETERMINISTIC", evidence, scan());
    expect(profile.category).toBe("Web frontend");
    expect(profile.projectType).toBe("Web application");
    expect(profile.description).toMatch(/TypeScript/);
    expect(profile.confidence).toBe("INFERRED");
  });

  it("classifies an Express backend project", () => {
    const evidence = [ev({ key: "framework", value: "Express" }), ev({ key: "packageManager", value: "npm" })];
    const profile = buildIntelligenceProfile("DETERMINISTIC", evidence, scan());
    expect(profile.category).toBe("Backend / API service");
    expect(profile.projectType).toBe("Service");
  });

  it("classifies a full-stack project when both layers are present", () => {
    const evidence = [ev({ key: "framework", value: "React" }), ev({ key: "framework", value: "Express" })];
    const profile = buildIntelligenceProfile("DETERMINISTIC", evidence, scan());
    expect(profile.category).toBe("Full-stack application");
  });

  it("classifies a plain-ecosystem project with no framework", () => {
    const evidence = [
      ev({ key: "ecosystem", value: "Python" }),
      ev({ key: "packageManager", value: "pip" }),
      ev({ key: "language", value: "Python (5 files)", evidenceType: "language" }),
    ];
    const profile = buildIntelligenceProfile("DETERMINISTIC", evidence, scan());
    expect(profile.category).toBe("Python project");
    expect(profile.projectType).toBe("Application or library");
  });

  it("labels a README-only, low-confidence discovery as documentation-only/unrecognized", () => {
    const evidence = [ev({ key: "readme", value: "README.md", evidenceType: "documentation" })];
    const profile = buildIntelligenceProfile("INFERRED", evidence, scan());
    expect(profile.category).toBe("Documentation-only or unrecognized");
  });

  it("recommends adding a README when none is found", () => {
    const profile = buildIntelligenceProfile("DETERMINISTIC", [ev({ key: "framework", value: "React" })], scan());
    expect(profile.recommendations.some((r) => /README/.test(r.text))).toBe(true);
  });

  it("does not recommend a README when one exists", () => {
    const evidence = [
      ev({ key: "framework", value: "React" }),
      ev({ key: "readme", value: "README.md", evidenceType: "documentation" }),
    ];
    const profile = buildIntelligenceProfile("DETERMINISTIC", evidence, scan());
    expect(profile.recommendations.some((r) => /README/.test(r.text))).toBe(false);
  });

  it("flags low discovery confidence as a recommendation", () => {
    const profile = buildIntelligenceProfile("INFERRED", [], scan());
    expect(profile.recommendations.some((r) => /Confirm whether/.test(r.text))).toBe(true);
  });

  it("flags a truncated scan with a DETERMINISTIC-confidence recommendation", () => {
    const profile = buildIntelligenceProfile("DETERMINISTIC", [], scan({ truncated: true, status: "PARTIAL" }));
    const rec = profile.recommendations.find((r) => /scan size limit/.test(r.text));
    expect(rec).toBeDefined();
    expect(rec?.confidence).toBe("DETERMINISTIC");
  });

  it("never claims Unknown fields as anything more certain than INFERRED", () => {
    const profile = buildIntelligenceProfile("DETERMINISTIC", [], scan());
    expect(profile.category).toBe("Unknown");
    expect(profile.confidence).toBe("INFERRED");
  });
});
