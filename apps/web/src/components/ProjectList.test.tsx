import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProjectList } from "./ProjectList";
import type { ProjectListItem } from "../api/types";

const sampleProject: ProjectListItem = {
  id: "p1",
  name: "demo-app",
  rootPath: "/x/demo-app",
  discoveryConfidence: "DETERMINISTIC",
  intelligenceProfile: {
    id: "ip1",
    description: "desc",
    category: "Web frontend",
    projectType: "Web application",
    architectureSummary: "arch",
    healthSummary: "health",
    providerMode: "deterministic",
    confidence: "INFERRED",
    generatedAt: new Date().toISOString(),
  },
  scanResults: [
    {
      id: "s1",
      status: "OK",
      fileCount: 10,
      directoryCount: 2,
      totalSizeBytes: 2048,
      truncated: false,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      errors: null,
    },
  ],
};

describe("ProjectList", () => {
  it("renders an empty state with guidance when there are no projects", () => {
    render(<ProjectList projects={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/No projects discovered yet/i)).toBeInTheDocument();
  });

  it("renders a populated list and reports selection", () => {
    const onSelect = vi.fn();
    render(<ProjectList projects={[sampleProject]} selectedId={null} onSelect={onSelect} />);

    expect(screen.getByText("demo-app")).toBeInTheDocument();
    expect(screen.getByText("Web frontend")).toBeInTheDocument();

    fireEvent.click(screen.getByText("demo-app"));
    expect(onSelect).toHaveBeenCalledWith("p1");
  });

  it("highlights the selected row", () => {
    render(<ProjectList projects={[sampleProject]} selectedId="p1" onSelect={() => {}} />);
    expect(screen.getByText("demo-app").closest("tr")).toHaveClass("selected");
  });
});
