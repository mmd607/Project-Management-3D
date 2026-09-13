import type { AiInsight, ProjectDetail, ProjectListItem, ScanSummary, Workspace } from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:4310/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (err) {
    throw new ApiError(`Cannot reach the server — is it running? (${(err as Error).message})`, 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? `Request failed with status ${res.status}`, res.status);
  }

  return (await res.json()) as T;
}

export const api = {
  listWorkspaces: () => request<Workspace[]>("/workspaces"),
  selectWorkspace: (rootPath: string) =>
    request<Workspace>("/workspaces", { method: "POST", body: JSON.stringify({ rootPath }) }),
  rescanWorkspace: (workspaceId: string) =>
    request<ScanSummary>(`/workspaces/${workspaceId}/scan`, { method: "POST" }),
  listProjects: (workspaceId: string) => request<ProjectListItem[]>(`/workspaces/${workspaceId}/projects`),
  getProject: (projectId: string) => request<ProjectDetail>(`/projects/${projectId}`),
  explainProject: (projectId: string) => request<AiInsight>(`/projects/${projectId}/explain`, { method: "POST" }),
  listInsights: (projectId: string) => request<AiInsight[]>(`/projects/${projectId}/insights`),
};
