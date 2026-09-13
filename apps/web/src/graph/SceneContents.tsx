import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import type { Group } from "three";
import type { ProjectListItem } from "../api/types";
import { computeClusteredLayout } from "./clustering";
import { createSimNode, stepSimulation, DEFAULT_TUNING, type SimNode } from "./forceSimulation";
import { CentralCore, type CoreState } from "./CentralCore";
import { ProjectNode, type FocusLevel } from "./ProjectNode";
import { Connection, type ConnectionHandle } from "./Connection";
import { ConnectionPulse } from "./ConnectionPulse";
import { ParticleField } from "./ParticleField";
import { usePerformanceGovernor } from "./usePerformanceGovernor";

interface Props {
  workspaceName: string;
  projects: ProjectListItem[];
  selectedId: string | null;
  reducedMotion: boolean;
  coreState: CoreState;
  /** Incrementing this forces the camera back to the overview even if selectedId hasn't
   * changed (e.g. the user orbited/zoomed away without selecting anything) — Task 03's
   * "reset/fit all" control. */
  resetToken: number;
  onHover: (id: string | null, clientX?: number, clientY?: number) => void;
  onSelect: (id: string) => void;
  hoveredId: string | null;
}

const CLUSTER_RADIUS = 6;
const MEMBER_RADIUS = 1.7;
const OVERVIEW_CAMERA: [number, number, number] = [0, 4, 15];
const OVERVIEW_TARGET: [number, number, number] = [0, 0, 0];

export function SceneContents({
  workspaceName,
  projects,
  selectedId,
  hoveredId,
  reducedMotion,
  coreState,
  resetToken,
  onHover,
  onSelect,
}: Props) {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const groupRefs = useRef<Map<string, Group>>(new Map());
  const connectionRefs = useRef<Map<string, ConnectionHandle>>(new Map());

  const { settings } = usePerformanceGovernor();

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.intelligenceProfile?.category ?? "Uncategorized");
    return map;
  }, [projects]);

  const { positions: anchorPositions, clusters } = useMemo(
    () =>
      computeClusteredLayout(
        projects.map((p) => ({ id: p.id, category: categoryById.get(p.id) ?? "Uncategorized" })),
        CLUSTER_RADIUS,
        MEMBER_RADIUS,
      ),
    [projects, categoryById],
  );

  // Real counts only — never invented (Decision L).
  const categoryCount = useMemo(() => new Set(categoryById.values()).size, [categoryById]);

  // Reconcile the simulation's node set with the current project list / cluster anchors.
  useEffect(() => {
    const sim = simNodesRef.current;
    const currentIds = new Set(projects.map((p) => p.id));

    for (const id of [...sim.keys()]) {
      if (!currentIds.has(id)) sim.delete(id);
    }
    for (const id of currentIds) {
      const anchor = anchorPositions.get(id);
      if (!anchor) continue;
      const existing = sim.get(id);
      if (!existing) {
        sim.set(id, createSimNode(id, anchor));
      } else {
        existing.anchorX = anchor[0];
        existing.anchorY = anchor[1];
        existing.anchorZ = anchor[2];
      }
    }
  }, [projects, anchorPositions]);

  const clusterByNodeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clusters) for (const id of c.nodeIds) map.set(id, c.category);
    return map;
  }, [clusters]);

  const focusLevelById = useMemo((): Map<string, FocusLevel> => {
    const map = new Map<string, FocusLevel>();
    if (!selectedId) {
      for (const p of projects) map.set(p.id, "bright");
      return map;
    }
    const selectedCluster = clusterByNodeId.get(selectedId);
    for (const p of projects) {
      if (p.id === selectedId) map.set(p.id, "bright");
      else if (selectedCluster && clusterByNodeId.get(p.id) === selectedCluster) map.set(p.id, "medium");
      else map.set(p.id, "dim");
    }
    return map;
  }, [projects, selectedId, clusterByNodeId]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const duration = reducedMotion ? false : true; // drei/camera-controls: false = snap, true = eased

    if (selectedId) {
      const node = simNodesRef.current.get(selectedId);
      if (node) {
        const dir = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z) || 1;
        const camDistance = 3.2;
        controls.setLookAt(
          node.x + (node.x / dir) * camDistance,
          node.y + 1,
          node.z + (node.z / dir) * camDistance,
          node.x,
          node.y,
          node.z,
          duration,
        );
        return;
      }
    }
    controls.setLookAt(...OVERVIEW_CAMERA, ...OVERVIEW_TARGET, duration);
  }, [selectedId, reducedMotion, resetToken]);

  const tuning = useMemo(
    () => (reducedMotion ? { ...DEFAULT_TUNING, repulsionStrength: 0 } : DEFAULT_TUNING),
    [reducedMotion],
  );

  useFrame((_state, delta) => {
    const sim = [...simNodesRef.current.values()];
    if (settings.enableSimulation) stepSimulation(sim, delta, tuning);

    for (const node of sim) {
      const group = groupRefs.current.get(node.id);
      if (group) group.position.set(node.x, node.y, node.z);
      const conn = connectionRefs.current.get(node.id);
      if (conn) conn.setEndpoints([0, 0, 0], [node.x, node.y, node.z]);
    }
  });

  const activeConnectionId = hoveredId ?? selectedId;

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 8, 5]} intensity={0.4} color="#e6e0e2" />

      <ParticleField count={settings.particleCount} radius={CLUSTER_RADIUS} animate={!reducedMotion} />

      <CentralCore
        label={workspaceName}
        projectCount={projects.length}
        categoryCount={categoryCount}
        state={coreState}
        reducedMotion={reducedMotion}
      />

      {projects.map((p) => (
        <Connection
          key={`line-${p.id}`}
          ref={(el) => {
            if (el) connectionRefs.current.set(p.id, el);
            else connectionRefs.current.delete(p.id);
          }}
          color={p.id === hoveredId || p.id === selectedId ? "#c23b4d" : "#5a2530"}
          opacity={p.id === hoveredId || p.id === selectedId ? 0.9 : 0.32}
        />
      ))}

      {projects.map((p) => (
        <ProjectNode
          key={p.id}
          id={p.id}
          name={p.name}
          category={categoryById.get(p.id) ?? "Uncategorized"}
          confidence={p.discoveryConfidence}
          selected={p.id === selectedId}
          focusLevel={focusLevelById.get(p.id) ?? "bright"}
          registerGroup={(id, group) => {
            if (group) groupRefs.current.set(id, group);
            else groupRefs.current.delete(id);
          }}
          onHover={onHover}
          onSelect={onSelect}
          onDragStart={(id) => {
            const node = simNodesRef.current.get(id);
            if (node) node.dragging = true;
            // CameraControls listens on the canvas directly (outside R3F's own event
            // system), so stopPropagation() in the node's handler doesn't stop it from
            // also orbiting during a drag — disable it explicitly for the duration.
            if (controlsRef.current) controlsRef.current.enabled = false;
          }}
          onDragMove={(id, pos) => {
            const node = simNodesRef.current.get(id);
            if (!node) return;
            node.x = pos[0];
            node.y = pos[1];
            node.z = pos[2];
            node.vx = 0;
            node.vy = 0;
            node.vz = 0;
          }}
          onDragEnd={(id, pos) => {
            const node = simNodesRef.current.get(id);
            if (!node) return;
            node.dragging = false;
            // Settle toward where it was dropped, not back to the original cluster slot —
            // "after dragging, the node should smoothly settle into its new position" (§1).
            node.anchorX = pos[0];
            node.anchorY = pos[1];
            node.anchorZ = pos[2];
            if (controlsRef.current) controlsRef.current.enabled = true;
          }}
        />
      ))}

      {activeConnectionId && settings.enableConnectionPulse && !reducedMotion && (
        <ConnectionPulse
          getEndpoints={() => {
            const node = simNodesRef.current.get(activeConnectionId);
            return { from: [0, 0, 0], to: node ? [node.x, node.y, node.z] : [0, 0, 0] };
          }}
        />
      )}

      <CameraControls ref={controlsRef} minDistance={2} maxDistance={30} dollySpeed={0.6} />
    </>
  );
}
