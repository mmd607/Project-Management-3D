import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

interface Props {
  getEndpoints: () => { from: [number, number, number]; to: [number, number, number] };
}

/**
 * A single small glowing pulse traveling along the connection to the currently
 * hovered/selected node — an honest stand-in for "data flow" per Phase 2 §3: since v0 has
 * no real event stream (no watcher/continuity yet — see Decision K), this is deliberately
 * ambient and tied only to real user interaction (hover/selection), not simulated business
 * activity.
 */
export function ConnectionPulse({ getEndpoints }: Props) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const { from, to } = getEndpoints();
    const t = (Math.sin(state.clock.elapsedTime * 1.4) + 1) / 2; // 0..1..0, smooth
    meshRef.current.position.set(
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
    );
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color="#e07a8c" />
    </mesh>
  );
}
