/**
 * View-model for the main workspace screen.
 *
 * The UI (FolderUniverse, ProjectInspector, WorkspaceGrid) renders ONLY these shapes. Where the
 * data comes from is a separate concern: `demo/demoWorkspace.ts` provides the four sample
 * folders, `model/fromApi.ts` adapts real scanner results from the server. Swapping one for
 * the other never touches a component.
 */

export type ProjectStatus = "active" | "idle" | "needs-attention";

export type DataSource = "demo" | "scan";

export type ProjectComponentKind = "Frontend" | "Backend" | "Database" | "Documentation" | "Tests" | "Deployment";

export interface ProjectNodeVM {
  id: string;
  name: string;
  /** e.g. "AI Project", "Web Application" */
  type: string;
  /** e.g. "AI / Automation", "Frontend" */
  category: string;
  language: string | null;
  framework: string | null;
  sizeBytes: number | null;
  /** 0–100, or null when it cannot be computed (never a fabricated zero). */
  healthScore: number | null;
  status: ProjectStatus;
  /** Hex accent colour used for the folder tint and halo. */
  accent: string;
  description: string | null;
}

export interface HealthBreakdownItem {
  key: string;
  label: string;
  score: number | null;
  /** Short explanation of how the number was produced (or that it is demo data). */
  note?: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  /** ISO timestamp. */
  at: string;
}

export interface ProjectDetailVM extends ProjectNodeVM {
  /** ISO timestamp, or null when unknown. */
  lastModified: string | null;
  techStack: string[];
  healthBreakdown: HealthBreakdownItem[];
  components: ProjectComponentKind[];
  recentActivity: ActivityItem[];
  dataSource: DataSource;
  /** Field names the provider could not fill in. Rendered as an "incomplete data" notice. */
  missingFields: string[];
}

export interface WorkspaceVM {
  id: string;
  name: string;
  source: DataSource;
  projects: ProjectNodeVM[];
}

export interface WorkspaceDataProvider {
  getWorkspace(): Promise<WorkspaceVM>;
  getProjectDetail(projectId: string): Promise<ProjectDetailVM>;
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  idle: "Idle",
  "needs-attention": "Needs Attention",
};

/** Average of the available breakdown scores, rounded; null when nothing is scored. */
export function averageScore(items: HealthBreakdownItem[]): number | null {
  const scored = items.filter((i) => typeof i.score === "number") as { score: number }[];
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, i) => sum + i.score, 0) / scored.length);
}
