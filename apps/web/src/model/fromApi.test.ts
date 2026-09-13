import { describe, expect, it, vi } from "vitest";
import type { ProjectDetail, ProjectListItem, Workspace } from "../api/types";
import { createApiProvider, detailFromApi, nodeFromApi, workspaceFromApi } from "./fromApi";

const workspace: Workspace = { id: "ws1", rootPath: "/tmp/ws", displayName: "ws", createdAt: "2026-01-01T00:00:00Z", lastScanAt: null };

const listItem: ProjectListItem = {
  id: "p1",
  name: "demo-app",
  rootPath: "/tmp/ws/demo-app",
  discoveryConfidence: "DETERMINISTIC",
  intelligenceProfile: {
    id: "ip1",
    description: "A web frontend written primarily in TypeScript.",
    category: "Web frontend",
    projectType: "Web application",
    architectureSummary: "Client-side codebase.",
    healthSummary: "Has a README.",
    providerMode: "deterministic",
    confidence: "INFERRED",
    generatedAt: "2026-02-01T00:00:00Z",
  },
  scanResults: [{ id: "s1", status: "OK", fileCount: 12, directoryCount: 3, totalSizeBytes: 4096, truncated: false, startedAt: "2026-02-01T00:00:00Z", completedAt: "2026-02-01T00:00:10Z", errors: null }],
};

const detail: ProjectDetail = {
  ...listItem,
  evidence: [
    { id: "e1", evidenceType: "manifest", sourcePath: "package.json", key: "framework", value: "react", confidence: "DETERMINISTIC" },
    { id: "e2", evidenceType: "file", sourcePath: "README.md", key: "readme", value: "present", confidence: "DETERMINISTIC" },
    { id: "e3", evidenceType: "dir", sourcePath: "tests/", key: "tests", value: "present", confidence: "DETERMINISTIC" },
  ],
  technologies: [
    { id: "t1", name: "TypeScript", kind: "language", evidenceSource: "ext", confidence: "DETERMINISTIC" },
    { id: "t2", name: "React", kind: "framework", evidenceSource: "package.json", confidence: "DETERMINISTIC" },
  ],
  recommendations: [],
  healthScore: {
    version: "v1",
    computedAt: "2026-02-01T00:00:10Z",
    overallScore: 72,
    coverage: 0.8,
    components: [
      { key: "tests", label: "Tests", weight: 0.25, score: 60, method: "test dir present", evidenceRefs: [] },
      { key: "documentation", label: "Docs", weight: 0.2, score: 80, method: "README present", evidenceRefs: [] },
      { key: "dependencies", label: "Deps", weight: 0.2, score: null, method: "no lockfile", evidenceRefs: [] },
      { key: "structure", label: "Structure", weight: 0.2, score: 70, method: "manifest present", evidenceRefs: [] },
      { key: "activity", label: "Activity", weight: 0.15, score: 85, method: "recent mtime", evidenceRefs: [] },
    ],
  },
};

describe("fromApi adapter", () => {
  it("maps list items to nodes with status derived from the scan result", () => {
    const node = nodeFromApi(listItem);
    expect(node).toMatchObject({ id: "p1", name: "demo-app", type: "Web application", category: "Web frontend", status: "active", sizeBytes: 4096 });
    expect(node.accent).toMatch(/^#/);
    expect(nodeFromApi({ ...listItem, scanResults: [{ ...listItem.scanResults[0], status: "PARTIAL" }] }).status).toBe("needs-attention");
    expect(nodeFromApi({ ...listItem, scanResults: [] }).status).toBe("idle");
  });

  it("maps details: language/framework from technologies, breakdown from health components, N/A preserved", () => {
    const vm = detailFromApi(detail);
    expect(vm.dataSource).toBe("scan");
    expect(vm.language).toBe("TypeScript");
    expect(vm.framework).toBe("React");
    expect(vm.healthScore).toBe(72);
    expect(vm.healthBreakdown.map((b) => [b.label, b.score])).toEqual([
      ["Code Quality", 70],
      ["Dependencies", null],
      ["Documentation", 80],
      ["Tests", 60],
      ["Activity", 85],
    ]);
    expect(vm.components).toEqual(expect.arrayContaining(["Frontend", "Documentation", "Tests"]));
    expect(vm.missingFields).toEqual([]);
    expect(vm.lastModified).toBe("2026-02-01T00:00:10Z");
  });

  it("reports missing fields instead of inventing values", () => {
    const vm = detailFromApi({ ...detail, technologies: [], healthScore: null, scanResults: [], intelligenceProfile: null });
    expect(vm.language).toBeNull();
    expect(vm.healthScore).toBeNull();
    expect(vm.healthBreakdown).toEqual([]);
    expect(vm.missingFields).toEqual(["Primary language", "Framework", "Size", "Last modified", "Project health", "Description"]);
  });

  it("provider delegates detail loading to the injected fetcher", async () => {
    const fetchDetail = vi.fn(async () => detail);
    const provider = createApiProvider(workspace, [listItem], fetchDetail);
    const ws = await provider.getWorkspace();
    expect(ws).toEqual(workspaceFromApi(workspace, [listItem]));
    expect(ws.source).toBe("scan");
    const vm = await provider.getProjectDetail("p1");
    expect(fetchDetail).toHaveBeenCalledWith("p1");
    expect(vm.name).toBe("demo-app");
  });
});
