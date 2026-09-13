import { describe, it, expect } from "vitest";
import { createSimNode, stepSimulation, DEFAULT_TUNING, type SimNode } from "./forceSimulation";

function distance(a: SimNode, b: SimNode): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

describe("stepSimulation", () => {
  it("keeps a single node at its anchor (no forces to move it)", () => {
    const node = createSimNode("a", [3, 0, 0]);
    for (let i = 0; i < 60; i++) stepSimulation([node], 1 / 60);
    expect(node.x).toBeCloseTo(3, 1);
    expect(node.y).toBeCloseTo(0, 1);
    expect(node.z).toBeCloseTo(0, 1);
  });

  it("pushes two overlapping nodes apart (repulsion)", () => {
    const a = createSimNode("a", [0, 0, 0]);
    const b = createSimNode("b", [0.05, 0, 0]); // start almost on top of each other
    const nodes = [a, b];
    const initialDistance = distance(a, b);

    for (let i = 0; i < 30; i++) stepSimulation(nodes, 1 / 60);

    expect(distance(a, b)).toBeGreaterThan(initialDistance);
  });

  it("settles to its anchor after a displacement, without ever overshooting past it", () => {
    // Isolated node (no neighbor within repulsion radius) displaced from its anchor.
    const a = createSimNode("a", [5, 0, 0]);
    a.x = 7; // displaced 2 units away
    const nodes = [a];

    let overshot = false;
    for (let i = 0; i < 180; i++) {
      stepSimulation(nodes, 1 / 60);
      if (a.x < 5) overshot = true; // would mean it swung past the anchor — not allowed
    }

    expect(overshot).toBe(false);
    expect(a.x).toBeCloseTo(5, 2);
  });

  it("reaches a stable equilibrium for two close anchors (gap stops changing, doesn't grow forever)", () => {
    const a = createSimNode("a", [0, 0, 0]);
    const b = createSimNode("b", [0.1, 0, 0]);
    const nodes = [a, b];

    for (let i = 0; i < 100; i++) stepSimulation(nodes, 1 / 60);
    const distAt100 = distance(a, b);
    for (let i = 0; i < 100; i++) stepSimulation(nodes, 1 / 60);
    const distAt200 = distance(a, b);

    expect(Math.abs(distAt200 - distAt100)).toBeLessThan(0.01);
  });

  it("never exceeds the configured max speed", () => {
    const a = createSimNode("a", [0, 0, 0]);
    const b = createSimNode("b", [0.01, 0, 0]);
    const nodes = [a, b];

    for (let i = 0; i < 5; i++) {
      stepSimulation(nodes, 1 / 60);
      const speed = Math.sqrt(a.vx ** 2 + a.vy ** 2 + a.vz ** 2);
      expect(speed).toBeLessThanOrEqual(DEFAULT_TUNING.maxSpeed + 1e-6);
    }
  });

  it("does not move a dragging node", () => {
    const a = createSimNode("a", [0, 0, 0]);
    a.dragging = true;
    a.x = 5;
    a.y = 5;
    a.z = 5;
    const before = { x: a.x, y: a.y, z: a.z };

    stepSimulation([a], 1 / 60);

    expect(a.x).toBe(before.x);
    expect(a.y).toBe(before.y);
    expect(a.z).toBe(before.z);
  });

  it("remains numerically stable over many steps (no NaN/Infinity blow-up)", () => {
    const nodes = Array.from({ length: 15 }, (_, i) => createSimNode(`n${i}`, [Math.cos(i), Math.sin(i), 0]));
    for (let i = 0; i < 500; i++) stepSimulation(nodes, 1 / 60);
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(Number.isFinite(n.z)).toBe(true);
    }
  });
});
