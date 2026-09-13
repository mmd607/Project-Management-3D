/**
 * Deterministic node layout for Graph Mode.
 *
 * Per Decision J (ai-project-workspace-phase0/11-decisions/DECISION_LOG.md): no physics
 * engine, no simulation — positions are computed once from a fixed formula (a Fibonacci
 * sphere distribution), not iteratively relaxed. Any floating motion applied later in
 * rendering is a per-frame cosmetic offset around this fixed base position, not a change to
 * the underlying layout.
 */
export interface NodePosition {
  id: string;
  position: [number, number, number];
}

/**
 * Distributes `count` points evenly across a sphere of the given radius using the
 * Fibonacci sphere method — a standard, deterministic, non-iterative even-spacing formula
 * (no relaxation/simulation involved).
 */
export function fibonacciSphereLayout(ids: string[], radius: number): NodePosition[] {
  const count = ids.length;
  if (count === 0) return [];
  if (count === 1) {
    return [{ id: ids[0], position: [radius, 0, 0] }];
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const positions: NodePosition[] = [];

  for (let i = 0; i < count; i++) {
    // y spans [-1, 1] across the full node set, biased slightly upward so the core reads
    // as the visual center rather than nodes clustering at the poles.
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    positions.push({
      id: ids[i],
      position: [x * radius, y * radius * 0.6, z * radius],
    });
  }

  return positions;
}
