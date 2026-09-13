/**
 * Performance governor — pure decision logic (Phase 2 spec §15, mandatory).
 * Downgrades visual quality under sustained low frame rate, with hysteresis so it doesn't
 * flap between tiers on every noisy sample. The hook that samples real frame times lives in
 * usePerformanceGovernor.ts; this file is the pure, directly testable policy.
 */
export type QualityTier = "high" | "medium" | "low";

const DOWNGRADE_THRESHOLD: Record<QualityTier, number> = {
  high: 45, // drop out of "high" if avg fps < 45
  medium: 25, // drop out of "medium" (into "low") if avg fps < 25
  low: -Infinity, // nowhere lower to go
};

const UPGRADE_THRESHOLD: Record<QualityTier, number | null> = {
  low: 40, // climb back to "medium" only once comfortably above the low threshold
  medium: 55, // climb back to "high" only once comfortably above the medium threshold
  high: null,
};

/** Given the current tier and a recently-observed average FPS, decide the next tier.
 * Hysteresis (different up/down thresholds) prevents rapid oscillation near a boundary. */
export function nextQualityTier(current: QualityTier, avgFps: number): QualityTier {
  if (avgFps < DOWNGRADE_THRESHOLD[current]) {
    return current === "high" ? "medium" : "low";
  }
  const upgradeAt = UPGRADE_THRESHOLD[current];
  if (upgradeAt !== null && avgFps >= upgradeAt) {
    return current === "low" ? "medium" : "high";
  }
  return current;
}

export interface QualitySettings {
  particleCount: number;
  enableDrift: boolean;
  enableSimulation: boolean;
  enableConnectionPulse: boolean;
}

export const QUALITY_SETTINGS: Record<QualityTier, QualitySettings> = {
  high: { particleCount: 400, enableDrift: true, enableSimulation: true, enableConnectionPulse: true },
  medium: { particleCount: 150, enableDrift: true, enableSimulation: true, enableConnectionPulse: false },
  low: { particleCount: 0, enableDrift: false, enableSimulation: false, enableConnectionPulse: false },
};
