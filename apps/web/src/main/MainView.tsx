import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { WorkspaceDataProvider, WorkspaceVM } from "../model/workspaceView";
import { useReducedMotion } from "../graph/useReducedMotion";
import { FolderUniverse } from "./FolderUniverse";
import { WorkspaceGrid } from "./WorkspaceGrid";
import { ProjectInspector } from "./ProjectInspector";
import { useProjectSelection } from "./useProjectSelection";

export type StageMode = "folders" | "grid";

export interface StageContext {
  selectedId: string | null;
  select: (id: string) => void;
  clear: () => void;
}

interface Props {
  workspace: WorkspaceVM;
  provider: WorkspaceDataProvider;
  /** Rendered inside the collapsible left sidebar (workspace picker, mode switches, notices). */
  sidebar: ReactNode;
  /** Optional alternative stage (e.g. the table or the 3D scene) sharing the same selection. */
  stageOverride?: (ctx: StageContext) => ReactNode;
  stageMode: StageMode;
  onStageModeChange: (mode: StageMode) => void;
  /** Programmatic selection (command palette): a new token applies the id once. */
  selectionRequest?: { id: string; token: number } | null;
}

const NARROW_STAGE = 640;
const DRAWER_BREAKPOINT = 980;

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

/**
 * Main screen: header · collapsible sidebar · stage (folders / grid) · inspector.
 * Selection state lives in useProjectSelection so it survives resizes and re-renders.
 */
export function MainView({ workspace, provider, sidebar, stageOverride, stageMode, onStageModeChange, selectionRequest }: Props) {
  const reducedMotion = useReducedMotion();
  const viewportWidth = useViewportWidth();
  const validIds = useMemo(() => workspace.projects.map((p) => p.id), [workspace.projects]);
  const { selectedId, state, select, clear, retry } = useProjectSelection(provider, workspace.id, validIds);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => viewportWidth < DRAWER_BREAKPOINT);
  const isDrawer = viewportWidth < DRAWER_BREAKPOINT;
  const forceGrid = viewportWidth < NARROW_STAGE || workspace.projects.length > 12;
  const effectiveMode: StageMode = forceGrid ? "grid" : stageMode;
  const selectedProject = selectedId ? workspace.projects.find((p) => p.id === selectedId) ?? null : null;

  useEffect(() => {
    if (selectionRequest && validIds.includes(selectionRequest.id)) select(selectionRequest.id);
  }, [selectionRequest, validIds, select]);

  // On narrow screens the inspector is a drawer: Esc closes it.
  useEffect(() => {
    if (!isDrawer || !selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawer, selectedId, clear]);

  return (
    <div className={`main-view${sidebarCollapsed ? " sidebar-collapsed" : ""}${isDrawer ? " drawer-layout" : ""}`} data-reduced-motion={reducedMotion ? "true" : "false"}>
      <header className="main-header">
        <button
          type="button"
          className="btn icon sidebar-toggle"
          onClick={() => setSidebarCollapsed((c) => !c)}
          aria-expanded={!sidebarCollapsed}
          aria-controls="main-sidebar"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <h1>Project Intelligence Workspace</h1>
        </div>
        <span className={`workspace-tag ${workspace.source}`} data-testid="workspace-tag">
          {workspace.source === "demo" ? "Demo Workspace" : "Local scan"}
        </span>
        <div className="header-spacer" />
        <div className="segmented" role="group" aria-label="Stage layout">
          <button type="button" aria-pressed={effectiveMode === "folders"} disabled={forceGrid} onClick={() => onStageModeChange("folders")}>
            Folders
          </button>
          <button type="button" aria-pressed={effectiveMode === "grid"} onClick={() => onStageModeChange("grid")}>
            Grid
          </button>
        </div>
      </header>

      <nav id="main-sidebar" className="main-sidebar" aria-label="Workspace">
        {sidebar}
      </nav>

      <section className="main-stage" aria-label="Workspace stage">
        {!reducedMotion && !stageOverride && (
          <div className="stage-particles" aria-hidden="true">
            <span style={{ left: "12%", top: "18%" }} />
            <span style={{ left: "78%", top: "22%" }} />
            <span style={{ left: "64%", top: "72%" }} />
            <span style={{ left: "24%", top: "80%" }} />
            <span style={{ left: "88%", top: "58%" }} />
            <span style={{ left: "42%", top: "10%" }} />
          </div>
        )}
        {stageOverride
          ? stageOverride({ selectedId, select, clear })
          : effectiveMode === "grid" ? (
            <WorkspaceGrid workspace={workspace} selectedId={selectedId} onSelect={select} />
          ) : (
            <FolderUniverse workspace={workspace} selectedId={selectedId} onSelect={select} onClear={clear} reducedMotion={reducedMotion} />
          )}
      </section>

      {isDrawer && selectedId && <div className="drawer-backdrop" onClick={clear} data-testid="drawer-backdrop" />}
      <div className={`inspector-slot${isDrawer ? " drawer" : ""}${isDrawer && !selectedId ? " hidden" : ""}`}>
        <ProjectInspector state={state} projectName={selectedProject?.name ?? null} onRetry={retry} onClose={isDrawer ? clear : undefined} />
      </div>
    </div>
  );
}
