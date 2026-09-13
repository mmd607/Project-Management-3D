/**
 * Adapter: real server data (`api/types.ts`) → main-view view-model (`workspaceView.ts`).
 *
 * This is the seam that lets the same folder UI show scanner results instead of the demo
 * workspace. Nothing is invented: unknown values become null / "missingFields" entries and
 * the inspector renders them as "not available".
 */
import type { HealthComponentResult, ProjectDetail, ProjectListItem, Workspace } from "../api/types";
import { colorForCategory } from "../graph/categoryColor";
import type {
  ActivityItem,
  HealthBreakdownItem,
  ProjectComponentKind,
  ProjectDetailVM,
  ProjectNodeVM,
  ProjectStatus,
  WorkspaceDataProvider,
  WorkspaceVM,
} from "./workspaceView";

function statusFor(item: ProjectListItem): ProjectStatus {
  const scan = item.scanResults[0];
  if (!scan) return "idle";
  if (scan.status === "FAILED" || scan.status === "PARTIAL") return "needs-attention";
  return "active";
}

function technologyOfKind(item: ProjectDetail, kind: string): string | null {
  const found = item.technologies.find((t) => t.kind === kind);
  return found ? found.name : null;
}

export function nodeFromApi(item: ProjectListItem, healthScore: number | null = null): ProjectNodeVM {
  const category = item.intelligenceProfile?.category ?? "Uncategorized";
  const scan = item.scanResults[0];
  return {
    id: item.id,
    name: item.name,
    type: item.intelligenceProfile?.projectType ?? "Project",
    category,
    language: null,
    framework: null,
    sizeBytes: scan ? scan.totalSizeBytes : null,
    healthScore,
    status: statusFor(item),
    accent: colorForCategory(category),
    description: item.intelligenceProfile?.description ?? null,
  };
}

const BREAKDOWN_LABELS: Record<string, string> = {
  structure: "Code Quality",
  dependencies: "Dependencies",
  documentation: "Documentation",
  tests: "Tests",
  activity: "Activity",
};

function breakdownFromApi(components: HealthComponentResult[]): HealthBreakdownItem[] {
  const order = ["structure", "dependencies", "documentation", "tests", "activity"];
  const byKey = new Map(components.map((c) => [c.key as string, c]));
  return order.map((key) => {
    const c = byKey.get(key);
    return {
      key: key === "structure" ? "codeQuality" : key,
      label: BREAKDOWN_LABELS[key],
      score: c ? c.score : null,
      note: c ? `${c.method} (weight ${c.weight})` : "Not computed by the scanner.",
    };
  });
}

function componentsFromEvidence(detail: ProjectDetail): ProjectComponentKind[] {
  const text = detail.evidence
    .map((e) => `${e.key} ${e.value} ${e.sourcePath}`.toLowerCase())
    .join("\n");
  const has = (...needles: string[]) => needles.some((n) => text.includes(n));
  const out: ProjectComponentKind[] = [];
  const category = (detail.intelligenceProfile?.category ?? "").toLowerCase();
  if (has("react", "vue", "svelte", "next", "frontend", "index.html", "vite") || category.includes("frontend") || category.includes("full-stack")) out.push("Frontend");
  if (has("express", "fastapi", "django", "flask", "backend", "server", "api") || category.includes("backend") || category.includes("full-stack")) out.push("Backend");
  if (has("prisma", "sqlite", "postgres", "mysql", "mongo", "database", "migration")) out.push("Database");
  if (has("readme", "docs/", "documentation")) out.push("Documentation");
  if (has("test", "spec", "vitest", "jest", "pytest")) out.push("Tests");
  if (has("dockerfile", "docker-compose", "deploy", "workflow", "ci", "vercel", "netlify")) out.push("Deployment");
  return out;
}

function activityFromApi(detail: ProjectDetail): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const scan of detail.scanResults.slice(0, 3)) {
    items.push({
      id: `scan-${scan.id}`,
      text: `Scanned ${scan.fileCount} files (${scan.status.toLowerCase()})`,
      at: scan.completedAt ?? scan.startedAt,
    });
  }
  if (detail.intelligenceProfile) {
    items.push({ id: `profile-${detail.intelligenceProfile.id}`, text: "Intelligence profile generated", at: detail.intelligenceProfile.generatedAt });
  }
  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
}

export function detailFromApi(detail: ProjectDetail): ProjectDetailVM {
  const overall = detail.healthScore?.overallScore ?? null;
  const node = nodeFromApi(detail, overall);
  const language = technologyOfKind(detail, "language");
  const framework = technologyOfKind(detail, "framework");
  const scan = detail.scanResults[0];
  const missingFields: string[] = [];
  if (!language) missingFields.push("Primary language");
  if (!framework) missingFields.push("Framework");
  if (!scan) missingFields.push("Size", "Last modified");
  if (!detail.healthScore) missingFields.push("Project health");
  if (!detail.intelligenceProfile) missingFields.push("Description");
  return {
    ...node,
    language,
    framework,
    lastModified: scan ? (scan.completedAt ?? scan.startedAt) : null,
    techStack: detail.technologies.map((t) => t.name),
    healthBreakdown: detail.healthScore ? breakdownFromApi(detail.healthScore.components) : [],
    components: componentsFromEvidence(detail),
    recentActivity: activityFromApi(detail),
    dataSource: "scan",
    missingFields,
  };
}

export function workspaceFromApi(workspace: Workspace, projects: ProjectListItem[]): WorkspaceVM {
  return {
    id: workspace.id,
    name: workspace.displayName,
    source: "scan",
    projects: projects.map((p) => nodeFromApi(p)),
  };
}

/** Provider backed by the real server. `fetchDetail` is injected so tests can stub it. */
export function createApiProvider(
  workspace: Workspace,
  projects: ProjectListItem[],
  fetchDetail: (projectId: string) => Promise<ProjectDetail>,
): WorkspaceDataProvider {
  return {
    async getWorkspace() {
      return workspaceFromApi(workspace, projects);
    },
    async getProjectDetail(projectId: string) {
      return detailFromApi(await fetchDetail(projectId));
    },
  };
}
