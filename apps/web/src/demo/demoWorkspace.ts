/**
 * Demo workspace — four sample folders used by the main view until real scanner data is
 * plugged in. Pure data + a provider object; no component imports this file directly, they
 * only receive a `WorkspaceDataProvider`.
 *
 * Every number here is illustrative. Health scores are labelled "demo data" in the UI and
 * are NOT produced by the real scoring formula in docs/DATA_AND_SCORING.md.
 */
import {
  averageScore,
  type ProjectDetailVM,
  type ProjectNodeVM,
  type WorkspaceDataProvider,
  type WorkspaceVM,
} from "../model/workspaceView";

const MB = 1024 * 1024;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Timestamps are relative to "now" so the demo never looks stale. */
function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

// The "demo data" disclaimer is shown once at section level in the UI; rows carry no method note
// because there is no real method behind them (scan rows carry the scorer's method instead).
function breakdown(codeQuality: number, dependencies: number, documentation: number, tests: number, activity: number) {
  return [
    { key: "codeQuality", label: "Code Quality", score: codeQuality },
    { key: "dependencies", label: "Dependencies", score: dependencies },
    { key: "documentation", label: "Documentation", score: documentation },
    { key: "tests", label: "Tests", score: tests },
    { key: "activity", label: "Activity", score: activity },
  ];
}

const DETAILS: ProjectDetailVM[] = [
  {
    id: "demo-ai-assistant",
    name: "AI Assistant",
    type: "AI Project",
    category: "AI / Automation",
    language: "Python",
    framework: "FastAPI",
    sizeBytes: Math.round(4.8 * MB),
    status: "active",
    accent: "#E84A72",
    description:
      "Conversational assistant that answers questions over internal documents. FastAPI service with a retrieval layer and a small evaluation harness.",
    lastModified: ago(2 * HOUR),
    techStack: ["Python", "FastAPI", "Pydantic", "SQLite", "Docker"],
    healthBreakdown: breakdown(88, 82, 84, 80, 96),
    healthScore: 86,
    components: ["Backend", "Database", "Tests", "Documentation", "Deployment"],
    recentActivity: [
      { id: "a1", text: "Updated requirements.txt", at: ago(2 * HOUR) },
      { id: "a2", text: "Modified app/main.py", at: ago(4 * HOUR) },
      { id: "a3", text: "Added evaluation dataset", at: ago(1 * DAY) },
    ],
    dataSource: "demo",
    missingFields: [],
  },
  {
    id: "demo-portfolio-website",
    name: "Portfolio Website",
    type: "Web Application",
    category: "Frontend",
    language: "TypeScript",
    framework: "Next.js",
    sizeBytes: Math.round(2.3 * MB),
    status: "active",
    accent: "#9B6DFF",
    description: "Personal portfolio and blog. Statically generated pages with a small design system and automated deploys.",
    lastModified: ago(6 * HOUR),
    techStack: ["TypeScript", "Next.js", "React", "Tailwind CSS", "Vercel"],
    healthBreakdown: breakdown(94, 90, 88, 90, 98),
    healthScore: 92,
    components: ["Frontend", "Documentation", "Tests", "Deployment"],
    recentActivity: [
      { id: "b1", text: "Published post: “Designing for focus”", at: ago(6 * HOUR) },
      { id: "b2", text: "Refactored ProjectCard component", at: ago(1 * DAY) },
      { id: "b3", text: "Upgraded Next.js", at: ago(3 * DAY) },
    ],
    dataSource: "demo",
    missingFields: [],
  },
  {
    id: "demo-store-backend",
    name: "Store Backend",
    type: "Backend Service",
    category: "Backend / API",
    language: "Python",
    framework: "Django",
    sizeBytes: Math.round(7.1 * MB),
    status: "needs-attention",
    accent: "#F2A34A",
    description:
      "Order, catalogue and payment API for an online store. Django + PostgreSQL with background jobs; three dependencies are behind their security patches.",
    lastModified: ago(5 * DAY),
    techStack: ["Python", "Django", "PostgreSQL", "Celery", "Redis", "Docker"],
    healthBreakdown: breakdown(78, 62, 70, 68, 92),
    healthScore: 74,
    components: ["Backend", "Database", "Tests", "Deployment", "Documentation"],
    recentActivity: [
      { id: "c1", text: "Dependency audit flagged 3 outdated packages", at: ago(5 * DAY) },
      { id: "c2", text: "Payment webhook tests failing on CI", at: ago(6 * DAY) },
      { id: "c3", text: "Added order export endpoint", at: ago(9 * DAY) },
    ],
    dataSource: "demo",
    missingFields: [],
  },
  {
    id: "demo-data-dashboard",
    name: "Data Dashboard",
    type: "Analytics Project",
    category: "Data",
    language: "TypeScript",
    framework: "React",
    sizeBytes: Math.round(5.6 * MB),
    status: "idle",
    accent: "#46BFEA",
    description: "Interactive analytics dashboard for weekly business metrics. React front end backed by a small Node API and PostgreSQL.",
    lastModified: ago(23 * DAY),
    techStack: ["TypeScript", "React", "Vite", "D3.js", "Node.js", "PostgreSQL"],
    healthBreakdown: breakdown(84, 80, 76, 78, 87),
    healthScore: 81,
    components: ["Frontend", "Backend", "Database", "Documentation"],
    recentActivity: [
      { id: "d1", text: "Adjusted retention chart colours", at: ago(23 * DAY) },
      { id: "d2", text: "Added cohort query", at: ago(31 * DAY) },
      { id: "d3", text: "Initial dashboard layout", at: ago(60 * DAY) },
    ],
    dataSource: "demo",
    missingFields: [],
  },
];

// Guard against the headline score drifting from its own breakdown when someone edits the numbers.
for (const d of DETAILS) {
  const avg = averageScore(d.healthBreakdown);
  if (avg !== d.healthScore) {
    throw new Error(`demo project ${d.id}: healthScore ${d.healthScore} does not match its breakdown average ${avg}`);
  }
}

export const DEMO_WORKSPACE_ID = "demo-workspace";
export const DEMO_WORKSPACE_NAME = "Demo Workspace";

export function demoProjectNodes(): ProjectNodeVM[] {
  // Node summaries carry only the fields the stage needs (no detail-only data).
  return DETAILS.map(
    ({ id, name, type, category, language, framework, sizeBytes, healthScore, status, accent, description }) => ({
      id, name, type, category, language, framework, sizeBytes, healthScore, status, accent, description,
    }),
  );
}

export function demoWorkspace(): WorkspaceVM {
  return { id: DEMO_WORKSPACE_ID, name: DEMO_WORKSPACE_NAME, source: "demo", projects: demoProjectNodes() };
}

export function demoProjectDetail(id: string): ProjectDetailVM | undefined {
  const found = DETAILS.find((d) => d.id === id);
  return found ? { ...found, recentActivity: [...found.recentActivity] } : undefined;
}

/**
 * Provider used by the main view when no real workspace is open. `detailDelayMs` lets the
 * inspector's loading state actually occur (the real API provider is async anyway); tests
 * pass 0.
 */
export function createDemoProvider(detailDelayMs = 250): WorkspaceDataProvider {
  return {
    async getWorkspace() {
      return demoWorkspace();
    },
    async getProjectDetail(projectId: string) {
      if (detailDelayMs > 0) await new Promise((r) => setTimeout(r, detailDelayMs));
      const detail = demoProjectDetail(projectId);
      if (!detail) throw new Error(`Unknown demo project: ${projectId}`);
      return detail;
    },
  };
}
