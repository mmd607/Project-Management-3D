import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MainView } from "./MainView";
import { ProjectInspector } from "./ProjectInspector";
import { createDemoProvider, demoWorkspace } from "../demo/demoWorkspace";
import type { ProjectDetailVM, WorkspaceDataProvider } from "../model/workspaceView";

// jsdom has no layout: give the stage a size so the radial layout renders nodes.
function stubStageSize(width = 1000, height = 700) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => height });
}

const demoProvider = createDemoProvider(0);

function renderMain(provider: WorkspaceDataProvider = demoProvider) {
  return render(<MainView workspace={demoWorkspace()} provider={provider} sidebar={<div>sidebar</div>} stageMode="folders" onStageModeChange={() => {}} />);
}

/** Text of the <dd> under the given <dt> label inside the inspector facts list. */
function factValue(container: HTMLElement, label: string): string | null {
  const dt = Array.from(container.querySelectorAll("dt")).find((el) => el.textContent === label);
  return dt?.nextElementSibling?.textContent ?? null;
}

beforeEach(() => {
  sessionStorage.clear();
  stubStageSize();
  window.innerWidth = 1440;
});

describe("MainView (demo workspace)", () => {
  it("renders exactly four folder nodes and the Demo Workspace tag", () => {
    renderMain();
    expect(screen.getAllByRole("button", { pressed: false }).filter((b) => b.classList.contains("folder-node"))).toHaveLength(4);
    expect(screen.getByTestId("workspace-tag")).toHaveTextContent("Demo Workspace");
    expect(screen.getByTestId("inspector-empty")).toBeInTheDocument();
  });

  it("clicking each folder updates the inspector with that project", async () => {
    renderMain();
    const names = ["AI Assistant", "Portfolio Website", "Store Backend", "Data Dashboard"];
    for (const name of names) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name},`) }));
      const panel = await screen.findByTestId("inspector-ready");
      expect(within(panel).getByRole("heading", { level: 2 })).toHaveTextContent(name);
      expect(screen.getByRole("button", { name: new RegExp(`^${name},`) })).toHaveAttribute("aria-pressed", "true");
    }
    const panel = screen.getByTestId("inspector-ready");
    expect(factValue(panel, "Framework")).toBe("React"); // last selected: Data Dashboard
  });

  it("shows framework, health and components for the selected folder", async () => {
    renderMain();
    fireEvent.click(screen.getByRole("button", { name: /^Store Backend,/ }));
    const panel = await screen.findByTestId("inspector-ready");
    expect(factValue(panel, "Framework")).toBe("Django");
    expect(factValue(panel, "Primary Language")).toBe("Python");
    expect(within(panel).getByText("74%")).toBeInTheDocument();
    expect(within(panel).getByText("Needs Attention")).toBeInTheDocument();
    expect(within(panel).getByText("demo data")).toBeInTheDocument();
    const components = within(panel).getByRole("list", { name: "Project components" });
    expect(within(components).getAllByRole("listitem").map((li) => li.textContent?.replace(/^[^A-Za-z]+/, ""))).toEqual(["Backend", "Database", "Tests", "Deployment", "Documentation"]);
    expect(within(panel).getAllByRole("progressbar")).toHaveLength(5);
  });

  it("keyboard: Enter selects the focused folder; clicking the empty stage clears", async () => {
    renderMain();
    const node = screen.getByRole("button", { name: /^AI Assistant,/ });
    node.focus();
    fireEvent.keyDown(node, { key: "Enter" });
    fireEvent.click(node); // jsdom does not synthesise click from Enter on buttons
    await screen.findByTestId("inspector-ready");
    expect(node).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("group", { name: /Demo Workspace: 4 projects/ }));
    expect(await screen.findByTestId("inspector-empty")).toBeInTheDocument();
    expect(node).toHaveAttribute("aria-pressed", "false");
  });

  it("arrow keys move focus between folders", () => {
    renderMain();
    const first = screen.getByRole("button", { name: /^AI Assistant,/ });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Portfolio Website,/ }));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(first);
  });

  it("selection survives a re-render / resize", async () => {
    const view = renderMain();
    fireEvent.click(screen.getByRole("button", { name: /^Data Dashboard,/ }));
    await screen.findByTestId("inspector-ready");
    stubStageSize(800, 600);
    window.innerWidth = 1200;
    fireEvent(window, new Event("resize"));
    view.rerender(<MainView workspace={demoWorkspace()} provider={demoProvider} sidebar={<div>sidebar</div>} stageMode="folders" onStageModeChange={() => {}} />);
    expect(screen.getByRole("button", { name: /^Data Dashboard,/ })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByTestId("inspector-ready")).toHaveTextContent("Data Dashboard");
  });

  it("View Full Details opens an accessible dialog that Esc closes", async () => {
    renderMain();
    fireEvent.click(screen.getByRole("button", { name: /^Portfolio Website,/ }));
    await screen.findByTestId("inspector-ready");
    fireEvent.click(screen.getByRole("button", { name: "View Full Details" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("heading", { level: 2 })).toHaveTextContent("Portfolio Website");
    expect(within(dialog).getAllByText(/demo workspace/i).length).toBeGreaterThan(0);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("falls back to the grid on narrow viewports and offers the inspector as a drawer", async () => {
    window.innerWidth = 600;
    renderMain();
    expect(screen.getByRole("list", { name: /Demo Workspace: 4 projects/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Assistant|Website|Backend|Dashboard/ })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /^AI Assistant,/ }));
    await screen.findByTestId("inspector-ready");
    expect(screen.getByTestId("drawer-backdrop")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close project details" }));
    expect(await screen.findByTestId("inspector-empty")).toBeInTheDocument();
  });
});

describe("ProjectInspector states", () => {
  const detail: ProjectDetailVM = {
    id: "x",
    name: "Partial Project",
    type: "Project",
    category: "Uncategorized",
    language: null,
    framework: null,
    sizeBytes: null,
    healthScore: null,
    status: "idle",
    accent: "#46BFEA",
    description: null,
    lastModified: null,
    techStack: [],
    healthBreakdown: [],
    components: [],
    recentActivity: [],
    dataSource: "scan",
    missingFields: ["Primary language", "Framework", "Size"],
  };

  it("renders empty, loading, error and incomplete states", () => {
    const { rerender } = render(<ProjectInspector state={{ kind: "empty" }} onRetry={() => {}} />);
    expect(screen.getByTestId("inspector-empty")).toBeInTheDocument();
    rerender(<ProjectInspector state={{ kind: "loading", projectId: "x" }} projectName="Partial Project" onRetry={() => {}} />);
    expect(screen.getByTestId("inspector-loading")).toHaveTextContent("Loading “Partial Project”");
    const onRetry = vi.fn();
    rerender(<ProjectInspector state={{ kind: "error", projectId: "x", message: "boom" }} projectName="Partial Project" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
    rerender(<ProjectInspector state={{ kind: "ready", projectId: "x", detail }} onRetry={() => {}} />);
    expect(screen.getByTestId("inspector-incomplete")).toHaveTextContent("Primary language, Framework, Size");
    expect(screen.getAllByText("Not available").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("surfaces provider failures as the error state", async () => {
    const failing: WorkspaceDataProvider = {
      getWorkspace: async () => demoWorkspace(),
      getProjectDetail: async () => {
        throw new Error("network down");
      },
    };
    renderMain(failing);
    fireEvent.click(screen.getByRole("button", { name: /^AI Assistant,/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("network down");
  });
});
