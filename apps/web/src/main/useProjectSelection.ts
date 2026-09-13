import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectDetailVM, WorkspaceDataProvider } from "../model/workspaceView";

export type InspectorState =
  | { kind: "empty" }
  | { kind: "loading"; projectId: string }
  | { kind: "error"; projectId: string; message: string }
  | { kind: "ready"; projectId: string; detail: ProjectDetailVM };

const STORAGE_KEY = "piw.selectedProjectId";

/**
 * Owns the "which project is selected" state and the async detail load behind it.
 * - Selection survives re-renders and resizes (it's plain React state) and a page reload
 *   (sessionStorage, scoped to the workspace id).
 * - Stale responses are ignored: selecting A then B quickly never shows A's detail.
 */
export function useProjectSelection(provider: WorkspaceDataProvider, workspaceId: string, validIds: string[]) {
  const [selectedId, setSelectedId] = useState<string | null>(() => restore(workspaceId));
  const [state, setState] = useState<InspectorState>({ kind: "empty" });
  const requestSeq = useRef(0);

  const clear = useCallback(() => {
    requestSeq.current += 1;
    setSelectedId(null);
    setState({ kind: "empty" });
    persist(workspaceId, null);
  }, [workspaceId]);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      persist(workspaceId, id);
    },
    [workspaceId],
  );

  // Drop a restored/previous selection that no longer exists in this workspace.
  useEffect(() => {
    if (selectedId && validIds.length > 0 && !validIds.includes(selectedId)) clear();
  }, [selectedId, validIds, clear]);

  useEffect(() => {
    if (!selectedId) return;
    const seq = ++requestSeq.current;
    setState({ kind: "loading", projectId: selectedId });
    provider
      .getProjectDetail(selectedId)
      .then((detail) => {
        if (seq === requestSeq.current) setState({ kind: "ready", projectId: selectedId, detail });
      })
      .catch((err: unknown) => {
        if (seq === requestSeq.current) {
          setState({ kind: "error", projectId: selectedId, message: err instanceof Error ? err.message : "Could not load project details." });
        }
      });
  }, [selectedId, provider]);

  const retry = useCallback(() => {
    if (selectedId) select(selectedId);
    // Re-trigger the effect even if the id is unchanged.
    setState((s) => (s.kind === "error" ? { kind: "loading", projectId: s.projectId } : s));
    requestSeq.current += 1;
    if (selectedId) {
      const seq = requestSeq.current;
      provider
        .getProjectDetail(selectedId)
        .then((detail) => seq === requestSeq.current && setState({ kind: "ready", projectId: selectedId, detail }))
        .catch((err: unknown) =>
          seq === requestSeq.current &&
          setState({ kind: "error", projectId: selectedId, message: err instanceof Error ? err.message : "Could not load project details." }),
        );
    }
  }, [selectedId, select, provider]);

  return { selectedId, state, select, clear, retry };
}

function restore(workspaceId: string): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { workspaceId: string; id: string };
    return parsed.workspaceId === workspaceId ? parsed.id : null;
  } catch {
    return null;
  }
}

function persist(workspaceId: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ workspaceId, id }));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode etc.) — selection still works for the session */
  }
}
