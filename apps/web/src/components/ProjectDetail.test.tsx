import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectDetail } from "./ProjectDetail";
import type { ProjectDetail as ProjectDetailType } from "../api/types";
import { api, ApiError } from "../api/client";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    api: {
      listInsights: vi.fn(),
      explainProject: vi.fn(),
    },
  };
});

const project: ProjectDetailType = {
  id: "p1",
  name: "demo-app",
  rootPath: "/x/demo-app",
  discoveryConfidence: "DETERMINISTIC",
  intelligenceProfile: {
    id: "ip1",
    description: "A web frontend written primarily in TypeScript.",
    category: "Web frontend",
    projectType: "Web application",
    architectureSummary: "Client-side codebase.",
    healthSummary: "Has a README.",
    providerMode: "deterministic",
    confidence: "INFERRED",
    generatedAt: new Date().toISOString(),
  },
  scanResults: [
    {
      id: "s1",
      status: "OK",
      fileCount: 12,
      directoryCount: 3,
      totalSizeBytes: 4096,
      truncated: false,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      errors: null,
    },
  ],
  evidence: [
    { id: "e1", evidenceType: "manifest", sourcePath: "/x/package.json", key: "framework", value: "React", confidence: "DETERMINISTIC" },
  ],
  technologies: [],
  recommendations: [
    { id: "r1", text: "Add a README.", rationale: "None found.", confidence: "INFERRED" },
  ],
  healthScore: {
    version: "v1",
    computedAt: new Date().toISOString(),
    overallScore: 70,
    coverage: 0.8,
    components: [
      { key: "tests", label: "Tests", weight: 30, score: 0, method: "No test directory found.", evidenceRefs: [] },
      { key: "documentation", label: "Documentation", weight: 20, score: 70, method: "README found.", evidenceRefs: ["readme"] },
      { key: "dependencies", label: "Dependencies", weight: 20, score: null, method: "No package manager detected.", evidenceRefs: [] },
      { key: "structure", label: "Structure & scan health", weight: 20, score: 100, method: "Scan completed cleanly.", evidenceRefs: [] },
      { key: "activity", label: "Documented activity", weight: 10, score: 0, method: "No Git repository detected.", evidenceRefs: [] },
    ],
  },
};

describe("ProjectDetail", () => {
  beforeEach(() => {
    vi.mocked(api.listInsights).mockResolvedValue([]);
  });

  it("renders facts, AI interpretation, and recommendations with confidence labels", async () => {
    render(<ProjectDetail project={project} />);

    expect(await screen.findByText(/React/)).toBeInTheDocument();
    expect(screen.getByText(/A web frontend written primarily in TypeScript/)).toBeInTheDocument();
    expect(screen.getByText(/Add a README/)).toBeInTheDocument();
    expect(screen.getAllByText("Detected fact").length).toBeGreaterThan(0);
    // Both the intelligence-profile description and the recommendation are INFERRED.
    expect(screen.getAllByText("Inferred (rule-based)").length).toBe(2);
  });

  it("shows the AI-generated insight after a successful explain call", async () => {
    vi.mocked(api.explainProject).mockResolvedValue({
      id: "i1",
      projectId: "p1",
      kind: "explain_project",
      providerMode: "mock",
      outputText: "This is a mock explanation.",
      confidence: "AI_INFERRED",
      createdAt: new Date().toISOString(),
    });

    render(<ProjectDetail project={project} />);
    fireEvent.click(screen.getByText("Explain this project"));

    expect(await screen.findByText(/This is a mock explanation/)).toBeInTheDocument();
    expect(screen.getByText("AI-generated")).toBeInTheDocument();
  });

  it("shows the health score with N/A rendered as text, not just a color, for missing evidence", async () => {
    render(<ProjectDetail project={project} />);
    expect(await screen.findByText("70")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    expect(screen.getByText(/No package manager detected/)).toBeInTheDocument();
  });

  it("shows an error banner instead of crashing when the AI call fails (offline-AI state)", async () => {
    vi.mocked(api.explainProject).mockRejectedValue(new ApiError("Cannot reach the server", 0));

    render(<ProjectDetail project={project} />);
    fireEvent.click(screen.getByText("Explain this project"));

    expect(await screen.findByText(/Cannot reach the server/)).toBeInTheDocument();
    // Button must return to a usable state, not stay stuck on "Asking AI…".
    expect(screen.getByText("Explain this project")).not.toBeDisabled();
  });
});
