import { describe, expect, it } from "vitest";
import { createDemoProvider, demoWorkspace } from "./demoWorkspace";
import { averageScore } from "../model/workspaceView";
import { layoutAround } from "../main/layoutAround";

describe("demo workspace", () => {
  it("has exactly the four sample folders with the specified facts", () => {
    const ws = demoWorkspace();
    expect(ws.source).toBe("demo");
    expect(ws.projects).toHaveLength(4);
    expect(ws.projects.map((p) => p.name)).toEqual(["AI Assistant", "Portfolio Website", "Store Backend", "Data Dashboard"]);
    const byName = Object.fromEntries(ws.projects.map((p) => [p.name, p]));
    expect(byName["AI Assistant"]).toMatchObject({ type: "AI Project", category: "AI / Automation", language: "Python", framework: "FastAPI", healthScore: 86, status: "active" });
    expect(byName["Portfolio Website"]).toMatchObject({ type: "Web Application", category: "Frontend", language: "TypeScript", framework: "Next.js", healthScore: 92, status: "active" });
    expect(byName["Store Backend"]).toMatchObject({ type: "Backend Service", category: "Backend / API", language: "Python", framework: "Django", healthScore: 74, status: "needs-attention" });
    expect(byName["Data Dashboard"]).toMatchObject({ type: "Analytics Project", category: "Data", language: "TypeScript", framework: "React", healthScore: 81, status: "idle" });
    expect(byName["AI Assistant"].sizeBytes).toBeCloseTo(4.8 * 1024 * 1024, -3);
    expect(byName["Store Backend"].sizeBytes).toBeCloseTo(7.1 * 1024 * 1024, -3);
  });

  it("uses a distinct accent per folder and never exposes a filesystem path", () => {
    const ws = demoWorkspace();
    expect(new Set(ws.projects.map((p) => p.accent)).size).toBe(4);
    for (const p of ws.projects) {
      expect(JSON.stringify(p)).not.toMatch(/[A-Za-z]:\\|\/home\/|\/Users\//);
    }
  });

  it("provides details whose headline score equals the breakdown average and whose components are a known subset", async () => {
    const provider = createDemoProvider(0);
    const ws = await provider.getWorkspace();
    for (const p of ws.projects) {
      const d = await provider.getProjectDetail(p.id);
      expect(d.dataSource).toBe("demo");
      expect(d.healthBreakdown.map((b) => b.label)).toEqual(["Code Quality", "Dependencies", "Documentation", "Tests", "Activity"]);
      expect(averageScore(d.healthBreakdown)).toBe(d.healthScore);
      expect(d.components.length).toBeGreaterThan(0);
      for (const c of d.components) expect(["Frontend", "Backend", "Database", "Documentation", "Tests", "Deployment"]).toContain(c);
      expect(d.recentActivity.length).toBeGreaterThan(0);
      expect(d.techStack.length).toBeGreaterThan(0);
      expect(d.missingFields).toEqual([]);
    }
    await expect(provider.getProjectDetail("nope")).rejects.toThrow(/Unknown demo project/);
  });
});

describe("layoutAround", () => {
  it("places four nodes in a diamond around the centre without overlap", () => {
    const pos = layoutAround(4, 1000, 800);
    expect(pos).toHaveLength(4);
    const cx = 500;
    const cy = 400;
    expect(pos[0].x).toBeLessThan(cx); // top-left
    expect(pos[0].y).toBeLessThan(cy);
    expect(pos[1].x).toBeGreaterThan(cx); // top-right
    expect(pos[1].y).toBeLessThan(cy);
    expect(pos[2].x).toBeGreaterThan(cx); // bottom-right
    expect(pos[2].y).toBeGreaterThan(cy);
    expect(pos[3].x).toBeLessThan(cx); // bottom-left
    expect(pos[3].y).toBeGreaterThan(cy);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y)).toBeGreaterThan(200);
  });
});
