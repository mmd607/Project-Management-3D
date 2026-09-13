import type { ProjectListItem } from "../api/types";

interface Props {
  project: ProjectListItem;
  x: number;
  y: number;
  containerRect: DOMRect;
}

export function GraphTooltip({ project, x, y, containerRect }: Props) {
  const left = Math.min(x - containerRect.left + 14, containerRect.width - 220);
  const top = Math.max(y - containerRect.top - 90, 8);

  return (
    <div className="graph-tooltip" style={{ left, top }}>
      <h4>{project.name}</h4>
      <p className="tooltip-line">{project.intelligenceProfile?.category ?? "Uncategorized"}</p>
      <p className="tooltip-line">
        Discovery: {project.discoveryConfidence === "DETERMINISTIC" ? "strong evidence" : "low confidence"}
      </p>
      {project.scanResults[0] && <p className="tooltip-line">Last scan: {project.scanResults[0].status}</p>}
      <p className="tooltip-hint">Click to open</p>
    </div>
  );
}
