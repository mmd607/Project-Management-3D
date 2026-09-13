/**
 * Lightweight custom force simulation for node motion.
 *
 * Per Decision K: deliberately NOT a physics-engine dependency (no cannon-es/rapier) — and
 * deliberately not a hand-tuned spring-mass integrator either, which turned out fiddly to
 * make converge quickly without oscillation (see IMPLEMENTATION_DECISION_LOG.md). Instead:
 * - repulsion between nearby nodes accumulates into velocity (gives natural spacing/drift);
 * - return-to-anchor is a frame-rate-independent exponential position blend, which is
 *   mathematically guaranteed to converge monotonically (no overshoot/oscillation possible)
 *   regardless of tuning — the property "must never feel chaotic" is structural, not tuned.
 */
export interface SimNode {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  dragging: boolean;
}

export interface SimulationTuning {
  /** Higher = nodes return to their anchor faster (time constant ~= 1/returnRate seconds). */
  returnRate: number;
  repulsionStrength: number;
  repulsionRadius: number;
  velocityDamping: number;
  maxSpeed: number;
}

export const DEFAULT_TUNING: SimulationTuning = {
  returnRate: 2.2,
  repulsionStrength: 1.1,
  repulsionRadius: 2.2,
  velocityDamping: 0.88,
  maxSpeed: 2.5,
};

export function createSimNode(id: string, anchor: [number, number, number]): SimNode {
  return {
    id,
    x: anchor[0],
    y: anchor[1],
    z: anchor[2],
    vx: 0,
    vy: 0,
    vz: 0,
    anchorX: anchor[0],
    anchorY: anchor[1],
    anchorZ: anchor[2],
    dragging: false,
  };
}

/** Advances the simulation by `dt` seconds, mutating each node's position/velocity in place.
 * Dragging nodes are left untouched — the caller sets their position directly from the
 * pointer, and they rejoin the simulation (with a fresh anchor) once released. */
export function stepSimulation(nodes: SimNode[], dt: number, tuning: SimulationTuning = DEFAULT_TUNING): void {
  const clampedDt = Math.min(dt, 1 / 20); // avoid a huge jump after a stall/tab-switch

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (a.dragging) continue;

    let fx = 0;
    let fy = 0;
    let fz = 0;

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const radiusSq = tuning.repulsionRadius * tuning.repulsionRadius;
      if (distSq > radiusSq || distSq < 1e-6) continue;

      const dist = Math.sqrt(distSq);
      const strength = (tuning.repulsionStrength * (tuning.repulsionRadius - dist)) / dist;
      fx += dx * strength;
      fy += dy * strength;
      fz += dz * strength;
    }

    a.vx = (a.vx + fx * clampedDt) * tuning.velocityDamping;
    a.vy = (a.vy + fy * clampedDt) * tuning.velocityDamping;
    a.vz = (a.vz + fz * clampedDt) * tuning.velocityDamping;

    const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy + a.vz * a.vz);
    if (speed > tuning.maxSpeed) {
      const scale = tuning.maxSpeed / speed;
      a.vx *= scale;
      a.vy *= scale;
      a.vz *= scale;
    }

    a.x += a.vx * clampedDt;
    a.y += a.vy * clampedDt;
    a.z += a.vz * clampedDt;

    // Frame-rate-independent exponential pull toward the anchor — a contraction toward a
    // fixed point every step, so it cannot diverge or oscillate no matter how it's tuned.
    const blend = 1 - Math.exp(-tuning.returnRate * clampedDt);
    a.x += (a.anchorX - a.x) * blend;
    a.y += (a.anchorY - a.y) * blend;
    a.z += (a.anchorZ - a.z) * blend;
  }
}
