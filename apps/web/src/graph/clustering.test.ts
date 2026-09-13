import { describe, it, expect } from "vitest";
import { computeClusteredLayout } from "./clustering";

describe("computeClusteredLayout", () => {
  it("groups projects by their real category, not invented ones", () => {
    const projects = [
      { id: "a", category: "Web frontend" },
      { id: "b", category: "Web frontend" },
      { id: "c", category: "Backend / API service" },
    ];
    const { clusters } = computeClusteredLayout(projects, 10, 3);
    const categories = clusters.map((c) => c.category).sort();
    expect(categories).toEqual(["Backend / API service", "Web frontend"]);

    const frontendCluster = clusters.find((c) => c.category === "Web frontend")!;
    expect(new Set(frontendCluster.nodeIds)).toEqual(new Set(["a", "b"]));
  });

  it("falls back to an explicit Uncategorized bucket for blank categories, never fabricating one", () => {
    const projects = [
      { id: "a", category: "" },
      { id: "b", category: "  " },
    ];
    const { clusters } = computeClusteredLayout(projects, 10, 3);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].category).toBe("Uncategorized");
    expect(clusters[0].nodeIds).toEqual(["a", "b"]);
  });

  it("returns one position per project, matching input ids", () => {
    const projects = [
      { id: "a", category: "X" },
      { id: "b", category: "X" },
      { id: "c", category: "Y" },
    ];
    const { positions } = computeClusteredLayout(projects, 10, 3);
    expect([...positions.keys()].sort()).toEqual(["a", "b", "c"]);
  });

  it("places members of the same cluster closer to each other than to another cluster's members", () => {
    const projects = [
      { id: "a1", category: "X" },
      { id: "a2", category: "X" },
      { id: "b1", category: "Y" },
    ];
    const { positions } = computeClusteredLayout(projects, 10, 1.5);

    function dist(p: string, q: string) {
      const [x1, y1, z1] = positions.get(p)!;
      const [x2, y2, z2] = positions.get(q)!;
      return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2);
    }

    expect(dist("a1", "a2")).toBeLessThan(dist("a1", "b1"));
  });

  it("is deterministic for the same input", () => {
    const projects = [
      { id: "a", category: "X" },
      { id: "b", category: "Y" },
    ];
    const first = computeClusteredLayout(projects, 10, 3);
    const second = computeClusteredLayout(projects, 10, 3);
    expect([...first.positions.entries()]).toEqual([...second.positions.entries()]);
  });

  it("handles an empty project list", () => {
    const { positions, clusters } = computeClusteredLayout([], 10, 3);
    expect(positions.size).toBe(0);
    expect(clusters).toEqual([]);
  });
});
