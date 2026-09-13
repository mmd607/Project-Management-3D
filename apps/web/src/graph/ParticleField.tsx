import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points } from "three";

interface Props {
  count: number;
  radius: number;
  animate: boolean;
}

/**
 * Sparse atmospheric particle field (Phase 2 §2). Deliberately cheap and restrained: a
 * single Points draw call, no per-particle simulation, very low opacity, slow whole-field
 * rotation only (not per-particle drift) — a backdrop, never competing with the graph
 * itself. Count and `animate` are governed by the performance tier / reduced-motion state.
 */
export function ParticleField({ count, radius, animate }: Props) {
  const pointsRef = useRef<Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Random point in a spherical shell well outside the graph itself, so particles
      // read as distant atmosphere rather than part of the data.
      const r = radius * (1.3 + Math.random() * 0.9);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);

  useFrame((_state, delta) => {
    if (!animate || !pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.015;
  });

  if (count === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8a5a62" size={0.035} transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}
