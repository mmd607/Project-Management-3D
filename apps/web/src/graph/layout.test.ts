import { describe, it, expect } from "vitest";
import { fibonacciSphereLayout } from "./layout";

describe("fibonacciSphereLayout", () => {
  it("returns an empty array for zero nodes", () => {
    expect(fibonacciSphereLayout([], 10)).toEqual([]);
  });

  it("places a single node at a fixed, non-origin position", () => {
    const result = fibonacciSphereLayout(["a"], 10);
    expect(result).toHaveLength(1);
    expect(result[0].position).not.toEqual([0, 0, 0]);
  });

  it("produces one distinct position per node, preserving ids", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
    const result = fibonacciSphereLayout(ids, 8);

    expect(result.map((r) => r.id)).toEqual(ids);

    const seen = new Set(result.map((r) => r.position.join(",")));
    expect(seen.size).toBe(ids.length); // no two nodes on top of each other
  });

  it("is deterministic across calls", () => {
    const ids = ["a", "b", "c", "d"];
    const first = fibonacciSphereLayout(ids, 10);
    const second = fibonacciSphereLayout(ids, 10);
    expect(first).toEqual(second);
  });

  it("keeps every node within the given radius", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const result = fibonacciSphereLayout(ids, 10);
    for (const { position } of result) {
      const [x, y, z] = position;
      const distance = Math.sqrt(x * x + y * y + z * z);
      expect(distance).toBeLessThanOrEqual(10 + 1e-6);
    }
  });
});
