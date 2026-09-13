/**
 * Workspace selection + scan orchestration.
 * Source: ai-project-workspace-phase0/00-overview/MASTER_SPEC.md §3 "Workspace" / "Reduced scanner"
 *         ai-project-workspace-phase0/02-ux/USER_FLOW.md (manual rescan, visible errors)
 */
import { existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { prisma } from "../storage/prisma.js";
import { discoverProjects, DEFAULT_DISCOVERY_OPTIONS, type ProjectCandidate } from "../discovery/discover.js";
import { scanProject, type ScanOutcome } from "../scanner/scan.js";
import { buildIntelligenceProfile } from "../intelligence/buildProfile.js";
import { defaultExclusionPolicy } from "../security/exclusions.js";

export class WorkspacePathError extends Error {}

function assertValidRoot(rootPath: string): string {
  const resolved = resolve(rootPath);
  if (!existsSync(resolved)) {
    throw new WorkspacePathError(`Path does not exist: ${resolved}`);
  }
  const st = statSync(resolved);
  if (!st.isDirectory()) {
    throw new WorkspacePathError(`Path is not a directory: ${resolved}`);
  }
  return resolved;
}

export async function selectWorkspace(rootPath: string) {
  const resolved = assertValidRoot(rootPath);
  const workspace = await prisma.workspace.upsert({
    where: { rootPath: resolved },
    update: {},
    create: {
      rootPath: resolved,
      displayName: basename(resolved) || resolved,
    },
  });
  return workspace;
}

export async function listWorkspaces() {
  return prisma.workspace.findMany({ orderBy: { createdAt: "desc" } });
}

interface PerProjectScanSummary {
  projectId: string;
  name: string;
  rootPath: string;
  status: ScanOutcome["status"];
  fileCount: number;
  directoryCount: number;
  errors: { path: string; message: string }[];
}

export interface WorkspaceScanSummary {
  workspaceId: string;
  discoveredProjectCount: number;
  discoveryErrors: { path: string; message: string }[];
  projects: PerProjectScanSummary[];
}

async function persistProjectScan(
  workspaceId: string,
  candidate: ProjectCandidate,
): Promise<PerProjectScanSummary> {
  const exclusions = defaultExclusionPolicy();

  const project = await prisma.project.upsert({
    where: { workspaceId_rootPath: { workspaceId, rootPath: candidate.rootPath } },
    update: { name: candidate.name, discoveryConfidence: candidate.confidence, lastScannedAt: new Date() },
    create: {
      workspaceId,
      rootPath: candidate.rootPath,
      name: candidate.name,
      discoveryConfidence: candidate.confidence,
      lastScannedAt: new Date(),
    },
  });

  const scan = scanProject(candidate.rootPath, exclusions);
  const profile = buildIntelligenceProfile(candidate.confidence, scan.evidence, scan);

  await prisma.$transaction([
    prisma.evidence.deleteMany({ where: { projectId: project.id } }),
    prisma.evidence.createMany({
      data: scan.evidence.map((e) => ({
        projectId: project.id,
        evidenceType: e.evidenceType,
        sourcePath: e.sourcePath,
        key: e.key,
        value: e.value,
        confidence: e.confidence,
      })),
    }),
    prisma.technology.deleteMany({ where: { projectId: project.id } }),
    prisma.technology.createMany({
      data: profile.technologies.map((t) => ({
        projectId: project.id,
        name: t.name,
        kind: t.kind,
        evidenceSource: t.evidenceSource,
        confidence: t.confidence,
      })),
    }),
    prisma.recommendation.deleteMany({ where: { projectId: project.id } }),
    prisma.recommendation.createMany({
      data: profile.recommendations.map((r) => ({
        projectId: project.id,
        text: r.text,
        rationale: r.rationale,
        confidence: r.confidence,
      })),
    }),
    prisma.intelligenceProfile.upsert({
      where: { projectId: project.id },
      update: {
        description: profile.description,
        category: profile.category,
        projectType: profile.projectType,
        architectureSummary: profile.architectureSummary,
        healthSummary: profile.healthSummary,
        providerMode: "deterministic",
        confidence: profile.confidence,
        generatedAt: new Date(),
      },
      create: {
        projectId: project.id,
        description: profile.description,
        category: profile.category,
        projectType: profile.projectType,
        architectureSummary: profile.architectureSummary,
        healthSummary: profile.healthSummary,
        providerMode: "deterministic",
        confidence: profile.confidence,
      },
    }),
    prisma.scanResult.create({
      data: {
        projectId: project.id,
        status: scan.status,
        completedAt: new Date(),
        fileCount: scan.fileCount,
        directoryCount: scan.directoryCount,
        totalSizeBytes: scan.totalSizeBytes,
        truncated: scan.truncated,
        errors: JSON.stringify(scan.errors),
      },
    }),
  ]);

  return {
    projectId: project.id,
    name: project.name,
    rootPath: project.rootPath,
    status: scan.status,
    fileCount: scan.fileCount,
    directoryCount: scan.directoryCount,
    errors: scan.errors,
  };
}

export async function rescanWorkspace(workspaceId: string): Promise<WorkspaceScanSummary> {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const exclusions = defaultExclusionPolicy();

  const { projects: candidates, errors: discoveryErrors } = discoverProjects(workspace.rootPath, {
    ...DEFAULT_DISCOVERY_OPTIONS,
    exclusions,
  });

  const projectSummaries: PerProjectScanSummary[] = [];
  for (const candidate of candidates) {
    try {
      projectSummaries.push(await persistProjectScan(workspaceId, candidate));
    } catch (err) {
      projectSummaries.push({
        projectId: "",
        name: candidate.name,
        rootPath: candidate.rootPath,
        status: "FAILED",
        fileCount: 0,
        directoryCount: 0,
        errors: [{ path: candidate.rootPath, message: (err as Error).message }],
      });
    }
  }

  await prisma.workspace.update({ where: { id: workspaceId }, data: { lastScanAt: new Date() } });

  return {
    workspaceId,
    discoveredProjectCount: candidates.length,
    discoveryErrors,
    projects: projectSummaries,
  };
}
