import type { WorkspaceVM } from "../model/workspaceView";
import { STATUS_LABEL } from "../model/workspaceView";
import { FolderIcon } from "./FolderIcon";
import { StatusBadge } from "./StatusBadge";

interface Props {
  workspace: WorkspaceVM;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Plain grid of folder cards — the alternative to the radial stage on narrow screens (or by
 * choice). Same data, same selection, no positioning maths. */
export function WorkspaceGrid({ workspace, selectedId, onSelect }: Props) {
  return (
    <ul className="workspace-grid" aria-label={`${workspace.name}: ${workspace.projects.length} projects`}>
      {workspace.projects.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            className={`grid-card${p.id === selectedId ? " selected" : ""}`}
            style={{ ["--accent" as string]: p.accent }}
            aria-pressed={p.id === selectedId}
            aria-label={`${p.name}, ${p.category}, ${STATUS_LABEL[p.status]}`}
            data-project-id={p.id}
            onClick={() => onSelect(p.id)}
          >
            <FolderIcon accent={p.accent} size={44} />
            <span className="grid-card-text">
              <span className="folder-node-name">{p.name}</span>
              <span className="folder-node-category">{p.category}</span>
            </span>
            <StatusBadge status={p.status} compact />
          </button>
        </li>
      ))}
    </ul>
  );
}
