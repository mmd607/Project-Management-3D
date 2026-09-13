import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { ProjectNodeVM, WorkspaceVM } from "../model/workspaceView";
import { STATUS_LABEL } from "../model/workspaceView";
import { FolderIcon } from "./FolderIcon";
import { StatusBadge } from "./StatusBadge";
import { layoutAround, type NodePosition } from "./layoutAround";

interface Props {
  workspace: WorkspaceVM;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  reducedMotion: boolean;
}


export function FolderUniverse({ workspace, selectedId, onSelect, onClear, reducedMotion }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pulseId, setPulseId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // One short pulse when the selection changes; not a continuous animation.
  useEffect(() => {
    if (!selectedId || reducedMotion) {
      setPulseId(null);
      return;
    }
    setPulseId(selectedId);
    const timer = setTimeout(() => setPulseId(null), 700);
    return () => clearTimeout(timer);
  }, [selectedId, reducedMotion]);

  const positions = useMemo(
    () => layoutAround(workspace.projects.length, size.width, size.height),
    [workspace.projects.length, size.width, size.height],
  );

  const handleStageClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // Only a click on the empty stage clears the selection; clicks on nodes stop here.
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.stageBackground === "true") onClear();
    },
    [onClear],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const nodes = Array.from(stageRef.current?.querySelectorAll<HTMLButtonElement>(".folder-node") ?? []);
      if (nodes.length === 0) return;
      const index = nodes.findIndex((n) => n === document.activeElement);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nodes[(index + 1 + nodes.length) % nodes.length]?.focus();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
      } else if (e.key === "Escape") {
        onClear();
      }
    },
    [onClear],
  );

  const ready = size.width > 0 && size.height > 0;
  const cx = size.width / 2;
  const cy = size.height / 2;

  return (
    <div
      ref={stageRef}
      className={`folder-universe${reducedMotion ? " reduced-motion" : ""}`}
      data-stage-background="true"
      onClick={handleStageClick}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label={`${workspace.name}: ${workspace.projects.length} projects`}
    >
      {ready && (
        <svg className="universe-links" width={size.width} height={size.height} aria-hidden="true" data-stage-background="true">
          {workspace.projects.map((p, i) => {
            const pos = positions[i];
            const active = p.id === selectedId;
            return (
              <line
                key={p.id}
                x1={cx}
                y1={cy}
                x2={pos.x}
                y2={pos.y}
                stroke={active ? p.accent : "var(--line)"}
                strokeOpacity={active ? 0.55 : 0.35}
                strokeWidth={active ? 1.5 : 1}
                strokeDasharray={active ? undefined : "2 6"}
              />
            );
          })}
        </svg>
      )}

      <WorkspaceCore name={workspace.name} count={workspace.projects.length} source={workspace.source} />

      {ready &&
        workspace.projects.map((p, i) => (
          <FolderNode
            key={p.id}
            project={p}
            index={i}
            position={positions[i]}
            selected={p.id === selectedId}
            pulsing={p.id === pulseId}
            dimmed={selectedId !== null && p.id !== selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

interface CoreProps {
  name: string;
  count: number;
  source: WorkspaceVM["source"];
}

/** Small geometric core: one shape, one thin ring, a soft halo — CSS/SVG only. */
function WorkspaceCore({ name, count, source }: CoreProps) {
  return (
    <div className="workspace-core" data-stage-background="true" aria-hidden="true">
      <div className="workspace-core-halo" data-stage-background="true" />
      <svg className="workspace-core-shape" viewBox="0 0 64 64" width="56" height="56" data-stage-background="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="var(--core-ring)" strokeWidth="1" />
        <path d="M32 10 52 32 32 54 12 32z" fill="url(#coreGradient)" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinejoin="round" />
        <path d="M32 10v44M12 32h40" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        <defs>
          <linearGradient id="coreGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff7d9d" />
            <stop offset="0.55" stopColor="#E84A72" />
            <stop offset="1" stopColor="#7d2f6e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="workspace-core-label" data-stage-background="true">
        <strong>{name}</strong>
        <span>
          {count} project{count === 1 ? "" : "s"}
          {source === "demo" ? " · demo" : ""}
        </span>
      </div>
    </div>
  );
}

interface NodeProps {
  project: ProjectNodeVM;
  index: number;
  position: NodePosition;
  selected: boolean;
  pulsing: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}

function FolderNode({ project, index, position, selected, pulsing, dimmed, onSelect }: NodeProps) {
  const className = ["folder-node", selected ? "selected" : "", pulsing ? "pulse" : "", dimmed ? "dimmed" : ""].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className={className}
      style={{ left: position.x, top: position.y, ["--accent" as string]: project.accent, ["--float-delay" as string]: `${index * 0.9}s` }}
      aria-pressed={selected}
      aria-label={`${project.name}, ${project.category}, ${STATUS_LABEL[project.status]}`}
      data-project-id={project.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(project.id);
      }}
    >
      <span className="folder-node-halo" aria-hidden="true" />
      <span className="folder-node-icon">
        <FolderIcon accent={project.accent} size={68} />
      </span>
      <span className="folder-node-name">{project.name}</span>
      <span className="folder-node-category">{project.category}</span>
      <StatusBadge status={project.status} compact />
    </button>
  );
}
