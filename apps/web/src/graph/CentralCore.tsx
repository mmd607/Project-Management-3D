import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Color, type Mesh, type MeshStandardMaterial } from "three";

export type CoreState = "idle" | "processing" | "error";

interface Props {
  label: string;
  /** Real counts only (Decision L) — never invented. */
  projectCount: number;
  categoryCount: number;
  state: CoreState;
  reducedMotion: boolean;
}

const STATE_COLOR: Record<CoreState, string> = {
  idle: "#8a2432",
  processing: "#c23b4d",
  error: "#8a5a24",
};

/**
 * The central node representing the open workspace — the heart of the system (Phase 2 §4).
 * `state` reflects only real signals (a scan or AI call actually in flight, or a real
 * surfaced error) — never a fabricated "activity" animation.
 */
export function CentralCore({ label, projectCount, categoryCount, state, reducedMotion }: Props) {
  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const targetColor = useMemo(() => new Color(), []);

  useFrame((_frameState, delta) => {
    const speedScale = reducedMotion ? 0 : state === "processing" ? 2.2 : 1;
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.15 * speedScale;
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.08 * speedScale;
    if (innerRef.current) innerRef.current.rotation.y -= delta * 0.25 * speedScale;

    if (meshRef.current) {
      const mat = meshRef.current.material as MeshStandardMaterial;
      const targetPulse = state === "processing" ? 0.55 : state === "error" ? 0.4 : 0.32;
      mat.emissiveIntensity += (targetPulse - mat.emissiveIntensity) * 0.08;
      targetColor.set(STATE_COLOR[state]);
      mat.emissive.lerp(targetColor, 0.05);
    }
  });

  return (
    <group name={`core:${label}`}>
      <mesh ref={innerRef} scale={0.55}>
        <icosahedronGeometry args={[1.6, 0]} />
        <meshBasicMaterial color="#2a1216" wireframe transparent opacity={0.5} />
      </mesh>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial
          color="#1a1013"
          emissive={STATE_COLOR[state]}
          emissiveIntensity={0.35}
          roughness={0.25}
          metalness={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[2.15, 0.02, 8, 96]} />
        <meshBasicMaterial color="#c23b4d" transparent opacity={0.55} />
      </mesh>
      <pointLight color={STATE_COLOR[state]} intensity={8} distance={12} decay={2} />

      {/* Real counts only — see IMPLEMENTATION_DECISION_LOG.md Decision L.
          pointerEvents:none on the Html wrapper itself (not just the inner div) — its
          bounding box sits over the busiest part of the scene and must never intercept
          clicks meant for project nodes underneath/around it. */}
      <Html center distanceFactor={9} zIndexRange={[1, 0]} occlude={false} style={{ pointerEvents: "none" }}>
        <div
          style={{
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "none",
            textShadow: "0 1px 6px rgba(0,0,0,0.85)",
            transform: "translateY(56px)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.06em", color: "#f2eef0" }}>
            {label.toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: "#c9a8ae", marginTop: 2 }}>
            {projectCount} project{projectCount === 1 ? "" : "s"} · {categoryCount} categor
            {categoryCount === 1 ? "y" : "ies"}
          </div>
        </div>
      </Html>
    </group>
  );
}
