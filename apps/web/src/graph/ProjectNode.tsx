import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Plane, Vector3, type Group, type Mesh } from "three";
import type { Confidence } from "../api/types";
import { colorForCategory } from "./categoryColor";

export type FocusLevel = "bright" | "medium" | "dim";

interface Props {
  id: string;
  name: string;
  category: string;
  confidence: Confidence;
  selected: boolean;
  focusLevel: FocusLevel;
  registerGroup: (id: string, group: Group | null) => void;
  onHover: (id: string | null, clientX?: number, clientY?: number) => void;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, position: [number, number, number]) => void;
  onDragEnd: (id: string, position: [number, number, number]) => void;
}

// Confidence no longer determines the node's color (category does, Decision L) — it now
// modulates brightness only, so the real DETERMINISTIC-vs-inferred distinction is still
// visible without competing with the category color for the same visual channel.
const INTENSITY_BY_CONFIDENCE: Record<Confidence, number> = {
  DETERMINISTIC: 1,
  INFERRED: 0.7,
  AI_INFERRED: 0.7,
  UNKNOWN: 0.5,
};

const FOCUS_OPACITY: Record<FocusLevel, number> = {
  bright: 1,
  medium: 0.75,
  dim: 0.28,
};

/**
 * A single project node. Its position is set imperatively every frame by the parent
 * simulation (SceneContents) via the registered group ref — this component owns no
 * per-frame drift/physics of its own, only visual reaction to hover/selection/focus and
 * drag input (Phase 2 §1, §6-7; Decision K).
 */
export function ProjectNode({
  id,
  name,
  category,
  confidence,
  selected,
  focusLevel,
  registerGroup,
  onHover,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const groupRef = useRef<Group | null>(null);
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { camera } = useThree();

  const dragPlane = useMemo(() => new Plane(), []);
  const planeHit = useMemo(() => new Vector3(), []);
  const planeNormal = useMemo(() => new Vector3(), []);

  const color = colorForCategory(category);
  const confidenceIntensity = INTENSITY_BY_CONFIDENCE[confidence];
  const opacity = FOCUS_OPACITY[focusLevel];

  // Discrete, quick hover/selection feedback — not ambient motion, so it isn't gated by
  // reduced-motion (that setting concerns continuous background drift/pulses, per §17).
  useFrame(() => {
    if (!meshRef.current) return;
    const targetScale = selected ? 1.5 : hovered ? 1.25 : 1;
    const next = meshRef.current.scale.x + (targetScale - meshRef.current.scale.x) * 0.18;
    meshRef.current.scale.setScalar(next);
  });

  return (
    <group
      ref={(g) => {
        groupRef.current = g;
        registerGroup(id, g);
      }}
    >
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          if (dragging) return;
          e.stopPropagation();
          setHovered(true);
          onHover(id, e.nativeEvent.clientX, e.nativeEvent.clientY);
          document.body.style.cursor = "pointer";
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (dragging) {
            if (e.ray.intersectPlane(dragPlane, planeHit)) {
              onDragMove(id, [planeHit.x, planeHit.y, planeHit.z]);
            }
            return;
          }
          if (hovered) onHover(id, e.nativeEvent.clientX, e.nativeEvent.clientY);
        }}
        onPointerOut={(e) => {
          if (dragging) return;
          e.stopPropagation();
          setHovered(false);
          onHover(null);
          document.body.style.cursor = "default";
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          camera.getWorldDirection(planeNormal);
          const current = groupRef.current?.position ?? planeHit;
          dragPlane.setFromNormalAndCoplanarPoint(planeNormal, current);
          setDragging(true);
          document.body.style.cursor = "grabbing";
          onDragStart(id);
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          e.stopPropagation();
          (e.target as Element).releasePointerCapture?.(e.pointerId);
          setDragging(false);
          document.body.style.cursor = "default";
          const p = groupRef.current?.position;
          if (p) onDragEnd(id, [p.x, p.y, p.z]);
        }}
        onClick={(e) => {
          if (dragging) return;
          e.stopPropagation();
          onSelect(id);
        }}
      >
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial
          color="#141014"
          emissive={color}
          emissiveIntensity={(hovered || selected ? 1.1 : 0.55) * confidenceIntensity}
          roughness={0.35}
          metalness={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Plain DOM text via drei's Html — no remote font/glyph fetching (unlike drei's
          <Text>/troika-three-text), which matters for a local-first, offline-capable app. */}
      <Html center distanceFactor={8} zIndexRange={[1, 0]} occlude={false} style={{ opacity, pointerEvents: "none" }}>
        <span
          style={{
            display: "block",
            transform: "translateY(28px)",
            fontSize: "12px",
            fontFamily: "system-ui, sans-serif",
            color: hovered || selected ? "#f2eef0" : "#a9a4a8",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          {name}
        </span>
      </Html>
    </group>
  );
}

export type { Props as ProjectNodeProps };
