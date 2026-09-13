import { useState } from "react";

interface Props {
  currentPath?: string;
  onSelect: (rootPath: string) => void;
  onRescan: () => void;
  busy: boolean;
}

export function WorkspacePicker({ currentPath, onSelect, onRescan, busy }: Props) {
  const [pathInput, setPathInput] = useState(currentPath ?? "");

  return (
    <div className="workspace-picker">
      <label htmlFor="workspace-path">Local project folder</label>
      <div className="workspace-picker-row">
        <input
          id="workspace-path"
          type="text"
          placeholder="e.g. C:\Users\you\Projects or /home/you/projects"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          disabled={busy || pathInput.trim().length === 0}
          onClick={() => onSelect(pathInput.trim())}
        >
          Open workspace
        </button>
        {currentPath && (
          <button type="button" disabled={busy} onClick={onRescan}>
            Rescan
          </button>
        )}
      </div>
      {currentPath && <p className="workspace-current">Current: {currentPath}</p>}
    </div>
  );
}
