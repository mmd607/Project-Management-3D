import { prisma } from "../storage/prisma.js";
import { computeHealthScore } from "../intelligence/healthScore.js";
import type { Confidence } from "../domain/confidence.js";

export async function listProjectsForWorkspace(workspaceId: string) {
  return prisma.project.findMany({
    where: { workspaceId },
    include: { intelligenceProfile: true, scanResults: { orderBy: { startedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
}

/** Health score is computed live from currently-stored evidence/scan state, not persisted —
 * so changing the formula (docs/DATA_AND_SCORING.md) or rescanning immediately reflects in
 * every subsequent read, with no migration needed. */
export async function getProjectDetail(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      intelligenceProfile: true,
      evidence: true,
      technologies: true,
      recommendations: true,
      scanResults: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });
  if (!project) return null;

  const latestScan = project.scanResults[0];
  const healthScore = latestScan
    ? computeHealthScore(
        project.evidence.map((e) => ({
          evidenceType: e.evidenceType,
          sourcePath: e.sourcePath,
          key: e.key,
          value: e.value,
          confidence: e.confidence as Confidence,
        })),
        {
          status: latestScan.status as "OK" | "PARTIAL" | "FAILED",
          truncated: latestScan.truncated,
          errors: latestScan.errors ? JSON.parse(latestScan.errors) : [],
        },
      )
    : null;

  return { ...project, healthScore };
}
