import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { ProjectListItem } from "../api/types";
import { SceneContents } from "./SceneContents";
import { GraphTooltip } from "./GraphTooltip";
import { useReducedMotion } from "./useReducedMotion";
import type { CoreState } from "./CentralCore";

interface Props {
  workspaceName: string;
  projects: ProjectListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  coreState: CoreState;
}

export function GraphScene({ workspaceName, projects, selectedId, onSelect, onDeselect, coreState }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const osReducedMotion = useReducedMotion();
  const reducedMotion = osReducedMotion || motionPaused;

  // Esc returns to the overview per Task 03's interaction spec — only when a node is
  // actually selected, so Esc doesn't fight other uses of the key elsewhere in the app.
  useEffect(() => {
    if (!selectedId) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDeselect();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, onDeselect]);

  const hoveredProject = hoveredId ? projects.find((p) => p.id === hoveredId) : null;

  if (projects.length === 0) {
    return (
      <div className="graph-empty-state">
        <h3>No project nodes</h3>
        <p>This workspace has no discovered projects yet.</p>
        <p className="empty-state-hint">Rescan, or check your exclusions, to populate the graph.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
      onPointerLeave={() => {
        setHoveredId(null);
        setHoverPos(null);
      }}
    >
      <Canvas className="graph-canvas" camera={{ position: [0, 4, 15], fov: 50 }}>
        <SceneContents
          workspaceName={workspaceName}
          projects={projects}
          selectedId={selectedId}
          hoveredId={hoveredId}
          reducedMotion={reducedMotion}
          coreState={coreState}
          resetToken={resetToken}
          onSelect={onSelect}
          onHover={(id, clientX, clientY) => {
            setHoveredId(id);
            if (id && clientX !== undefined && clientY !== undefined) {
              setHoverPos({ x: clientX, y: clientY });
            } else {
              setHoverPos(null);
            }
          }}
        />
      </Canvas>

      {hoveredProject && hoverPos && containerRef.current && (
        <GraphTooltip
          project={hoveredProject}
          x={hoverPos.x}
          y={hoverPos.y}
          containerRect={containerRef.current.getBoundingClientRect()}
        />
      )}

      <p className="graph-hint-overlay">
        Drag to orbit · scroll to zoom · drag a node to reposition it · click to open · Esc to return
        {reducedMotion && " · reduced motion is on"}
      </p>

      <div className="graph-controls-bar">
        <button
          type="button"
          onClick={() => {
            onDeselect();
            setResetToken((t) => t + 1);
          }}
        >
          Reset view
        </button>
        <button type="button" onClick={() => setMotionPaused((p) => !p)} aria-pressed={motionPaused}>
          {motionPaused ? "Resume motion" : "Pause motion"}
        </button>
      </div>
    </div>
  );
}
