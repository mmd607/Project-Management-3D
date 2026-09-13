import type { ProjectDetail as ProjectDetailType } from "../api/types";
import { ProjectDetail } from "../components/ProjectDetail";

interface Props {
  project: ProjectDetailType;
  onClose: () => void;
  onExplainInFlightChange?: (inFlight: boolean) => void;
}

/** Glassmorphism floating panel wrapping the existing (unmodified) ProjectDetail
 * component — reused, not duplicated, per Decision J. */
export function GraphDetailPanel({ project, onClose, onExplainInFlightChange }: Props) {
  return (
    <>
      <div className="graph-panel-backdrop" onClick={onClose} />
      <div className="graph-panel">
        <button type="button" className="graph-panel-close" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
        <ProjectDetail project={project} onExplainInFlightChange={onExplainInFlightChange} />
      </div>
    </>
  );
}
