import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import type { ProjectListItem, ScanSummary, Workspace } from "./api/types";
import { api, ApiError } from "./api/client";
import { WorkspacePicker } from "./components/WorkspacePicker";
import { ProjectList } from "./components/ProjectList";
import { useGraphCapability } from "./graph/useGraphCapability";
import { CommandPalette } from "./graph/CommandPalette";
import type { CoreState } from "./graph/CentralCore";
import { MainView, type StageMode } from "./main/MainView";
import { createDemoProvider, demoWorkspace } from "./demo/demoWorkspace";
import { createApiProvider, workspaceFromApi } from "./model/fromApi";
import type { WorkspaceDataProvider, WorkspaceVM } from "./model/workspaceView";

// Code-split: three.js/@react-three/* only load when the user opens the optional 3D graph.
const GraphScene = lazy(() => import("./graph/GraphScene").then((m) => ({ default: m.GraphScene })));

type ServerState = "checking" | "online" | "offline";
type Source = "demo" | "live";
/** Extra stage renderers available for a real (scanned) workspace. */
type LiveStage = "folders" | "list" | "graph3d";

const DEMO_PROVIDER = createDemoProvider();
const DEMO_WORKSPACE = demoWorkspace();

export default function App() {
  const [serverState, setServerState] = useState<ServerState>("checking");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
  const [appError, setAppError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>("demo");
  const [stageMode, setStageMode] = useState<StageMode>("folders");
  const [liveStage, setLiveStage] = useState<LiveStage>("folders");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectionRequest, setSelectionRequest] = useState<{ id: string; token: number } | null>(null);
  const graphCapability = useGraphCapability();

  // Reopen: remember the most recent real workspace (without rescanning), but land on the
  // demo workspace — the user switches to the scan explicitly from the sidebar.
  useEffect(() => {
    let cancelled = false;
    api
      .listWorkspaces()
      .then(async (workspaces) => {
        if (cancelled) return;
        setServerState("online");
        if (workspaces.length > 0) {
          const mostRecent = workspaces[0];
          setWorkspace(mostRecent);
          const list = await api.listProjects(mostRecent.id);
          if (!cancelled) setProjects(list);
        }
      })
      .catch(() => {
        if (!cancelled) setServerState("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProjects = useCallback(async (workspaceId: string) => {
    setProjects(await api.listProjects(workspaceId));
  }, []);

  const handleSelectWorkspace = useCallback(
    async (rootPath: string) => {
      setWorkspaceBusy(true);
      setAppError(null);
      try {
        const ws = await api.selectWorkspace(rootPath);
        setWorkspace(ws);
        const summary = await api.rescanWorkspace(ws.id);
        setScanSummary(summary);
        await refreshProjects(ws.id);
        setSource("live");
      } catch (err) {
        setAppError(err instanceof ApiError ? err.message : "Failed to open workspace.");
      } finally {
        setWorkspaceBusy(false);
      }
    },
    [refreshProjects],
  );

  const handleRescan = useCallback(async () => {
    if (!workspace) return;
    setWorkspaceBusy(true);
    setAppError(null);
    try {
      const summary = await api.rescanWorkspace(workspace.id);
      setScanSummary(summary);
      await refreshProjects(workspace.id);
    } catch (err) {
      setAppError(err instanceof ApiError ? err.message : "Rescan failed.");
    } finally {
      setWorkspaceBusy(false);
    }
  }, [workspace, refreshProjects]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const liveAvailable = source === "live" && workspace !== null;
  const activeWorkspace: WorkspaceVM = useMemo(
    () => (liveAvailable && workspace ? workspaceFromApi(workspace, projects) : DEMO_WORKSPACE),
    [liveAvailable, workspace, projects],
  );
  const provider: WorkspaceDataProvider = useMemo(
    () => (liveAvailable && workspace ? createApiProvider(workspace, projects, api.getProject) : DEMO_PROVIDER),
    [liveAvailable, workspace, projects],
  );
  const coreState: CoreState = appError ? "error" : workspaceBusy ? "processing" : "idle";
  const graph3dPossible = liveAvailable && graphCapability.supported;

  const sidebar = (
    <>
      <div className="sidebar-section">
        <h2>Workspace</h2>
        <ul className="sidebar-list">
          <li>
            <button type="button" aria-pressed={source === "demo"} onClick={() => setSource("demo")}>
              <span>Demo Workspace</span>
              <span className="workspace-tag demo">Sample</span>
            </button>
          </li>
          <li>
            {/* The real folder's name/path only appears once the user switches to it — the demo
                view never shows personal paths. */}
            <button type="button" aria-pressed={source === "live"} disabled={!workspace} onClick={() => setSource("live")}>
              <span>{workspace ? (source === "live" ? workspace.displayName : "Scanned workspace") : "No scanned workspace"}</span>
              {workspace && <span className="workspace-tag scan">{projects.length}</span>}
            </button>
          </li>
        </ul>
        {source === "demo" && (
          <p className="sidebar-note">
            Sample data only — four illustrative folders with demo health scores. Open a local folder to see real scanner results in the same view.
          </p>
        )}
      </div>

      {liveAvailable && (
        <div className="sidebar-section">
          <h2>Stage</h2>
          <ul className="sidebar-list">
            <li>
              <button type="button" aria-pressed={liveStage === "folders"} onClick={() => setLiveStage("folders")}>
                Folders
              </button>
            </li>
            <li>
              <button type="button" aria-pressed={liveStage === "list"} onClick={() => setLiveStage("list")}>
                List (table)
              </button>
            </li>
            <li>
              <button
                type="button"
                aria-pressed={liveStage === "graph3d"}
                disabled={!graph3dPossible}
                title={graphCapability.reason ?? "3D graph (three.js)"}
                onClick={() => setLiveStage("graph3d")}
              >
                3D graph
              </button>
            </li>
          </ul>
        </div>
      )}

      <div className="sidebar-section">
        <h2>Open a local folder</h2>
        {serverState === "offline" ? (
          <p className="sidebar-note warn">
            The local server is not running, so folders cannot be scanned right now. Start it with <code>npm run dev:server</code>; the demo workspace works without it.
          </p>
        ) : (
          <WorkspacePicker
            currentPath={source === "live" ? workspace?.rootPath : undefined}
            onSelect={handleSelectWorkspace}
            onRescan={handleRescan}
            busy={workspaceBusy || serverState === "checking"}
          />
        )}
        {appError && <p className="sidebar-note warn" role="alert">{appError}</p>}
        {scanSummary && (
          <p className="sidebar-note">
            Last scan: {scanSummary.discoveredProjectCount} project(s) discovered
            {scanSummary.discoveryErrors.length > 0 && `, ${scanSummary.discoveryErrors.length} path(s) unreadable`}.
          </p>
        )}
      </div>

      <div className="sidebar-section">
        <h2>Keyboard</h2>
        <p className="sidebar-note">Tab / arrows move between folders · Enter selects · Esc clears · Ctrl+K opens the command palette.</p>
      </div>
    </>
  );

  return (
    <>
      <MainView
        workspace={activeWorkspace}
        provider={provider}
        sidebar={sidebar}
        stageMode={stageMode}
        onStageModeChange={setStageMode}
        selectionRequest={selectionRequest}
        stageOverride={
          liveAvailable && workspace && liveStage !== "folders"
            ? ({ selectedId, select, clear }) =>
                liveStage === "list" ? (
                  <div className="stage-scroll">
                    <ProjectList projects={projects} selectedId={selectedId} onSelect={select} />
                  </div>
                ) : (
                  <Suspense fallback={<p className="empty-state-hint stage-loading">Loading 3D graph…</p>}>
                    <GraphScene
                      workspaceName={workspace.displayName}
                      projects={projects}
                      selectedId={selectedId}
                      onSelect={select}
                      onDeselect={clear}
                      coreState={coreState}
                    />
                  </Suspense>
                )
            : undefined
        }
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        projects={liveAvailable ? projects : []}
        onSelectProject={(id) => {
          setSource("live");
          setLiveStage("folders");
          setSelectionRequest((prev) => ({ id, token: (prev?.token ?? 0) + 1 }));
        }}
        onSwitchToGraph={() => {
          if (graph3dPossible) setLiveStage("graph3d");
        }}
        onSwitchToList={() => {
          if (liveAvailable) setLiveStage("list");
        }}
        onRescan={handleRescan}
        graphAvailable={graph3dPossible}
      />
    </>
  );
}
