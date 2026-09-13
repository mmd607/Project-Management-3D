import type { ProjectListItem } from "../api/types";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface Props {
  projects: ProjectListItem[];
  selectedId: string | null;
  onSelect: (projectId: string) => void;
}

export function ProjectList({ projects, selectedId, onSelect }: Props) {
  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <p>No projects discovered yet in this workspace.</p>
        <p className="empty-state-hint">
          Select a workspace and scan it, or check that the folder contains recognizable
          projects (a manifest, a .git repository, or at least a README).
        </p>
      </div>
    );
  }

  return (
    <table className="project-list">
      <thead>
        <tr>
          <th>Project</th>
          <th>Category</th>
          <th>Discovery</th>
          <th>Last scan</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => {
          const lastScan = p.scanResults[0];
          return (
            <tr
              key={p.id}
              className={p.id === selectedId ? "selected" : ""}
              onClick={() => onSelect(p.id)}
              tabIndex={0}
              role="button"
            >
              <td>{p.name}</td>
              <td>{p.intelligenceProfile?.category ?? "—"}</td>
              <td>
                <ConfidenceBadge confidence={p.discoveryConfidence} />
              </td>
              <td>
                {lastScan ? (
                  lastScan.status === "OK" ? (
                    "OK"
                  ) : (
                    <span className="scan-status-warning">{lastScan.status}</span>
                  )
                ) : (
                  "not scanned"
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
