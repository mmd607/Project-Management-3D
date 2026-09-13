import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { nextQualityTier, QUALITY_SETTINGS, type QualityTier } from "./performanceGovernor";

/**
 * Samples real frame time (must be used inside the R3F Canvas tree) and evaluates the
 * quality tier roughly once a second, via the pure/tested policy in performanceGovernor.ts.
 * Mandatory per Phase 2 §15 — never lets visual effects make the app unusable.
 */
export function usePerformanceGovernor() {
  const [tier, setTier] = useState<QualityTier>("high");
  const samples = useRef<number[]>([]);
  const lastEval = useRef(0);

  useFrame((state, delta) => {
    samples.current.push(delta);
    if (samples.current.length > 90) samples.current.shift();

    if (state.clock.elapsedTime - lastEval.current >= 1) {
      lastEval.current = state.clock.elapsedTime;
      const avgDt = samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
      const avgFps = avgDt > 0 ? 1 / avgDt : 60;
      setTier((prev) => nextQualityTier(prev, avgFps));
    }
  });

  return { tier, settings: QUALITY_SETTINGS[tier] };
}
