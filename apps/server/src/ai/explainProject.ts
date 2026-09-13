/**
 * "Explain this project" — the single v0 AI feature (Decision E).
 * Source: ai-project-workspace-phase0/05-ai/AI_SPEC.md
 *
 * Rules enforced here:
 * - context built only from already-collected scanner evidence/profile, never raw file reads;
 * - bounded context (avoid uploading unbounded evidence lists);
 * - cancellation/timeout;
 * - AI output is stored and returned as AI_INFERRED, never blurred with deterministic fields;
 * - failures are typed so the product stays usable when no/failing provider is configured.
 */
import { createHash } from "node:crypto";
import type { Env } from "../config/env.js";
import { createAiProvider } from "./factory.js";
import { AiProviderError, type ExplainProjectContext } from "./provider.js";
import { prisma } from "../storage/prisma.js";
import { getProjectDetail } from "../workspace/projectQueries.js";

const MAX_EVIDENCE_ITEMS_IN_CONTEXT = 25;
const REQUEST_TIMEOUT_MS = 30_000;

export class ProjectNotFoundError extends Error {}
export class ExplainTimeoutError extends Error {}

function buildContext(project: NonNullable<Awaited<ReturnType<typeof getProjectDetail>>>): ExplainProjectContext {
  const profile = project.intelligenceProfile;
  return {
    projectName: project.name,
    category: profile?.category ?? "Unknown",
    projectType: profile?.projectType ?? "Unknown",
    description: profile?.description ?? "No deterministic description available.",
    architectureSummary: profile?.architectureSummary ?? "No architecture summary available.",
    healthSummary: profile?.healthSummary ?? "No health summary available.",
    technologies: project.technologies.slice(0, MAX_EVIDENCE_ITEMS_IN_CONTEXT).map((t) => ({ name: t.name, kind: t.kind })),
    evidence: project.evidence.slice(0, MAX_EVIDENCE_ITEMS_IN_CONTEXT).map((e) => ({
      key: e.key,
      value: e.value,
      evidenceType: e.evidenceType,
    })),
  };
}

function digestContext(context: ExplainProjectContext): string {
  return createHash("sha256").update(JSON.stringify(context)).digest("hex");
}

export async function explainProject(env: Env, projectId: string) {
  const project = await getProjectDetail(projectId);
  if (!project) throw new ProjectNotFoundError(`Project not found: ${projectId}`);

  const context = buildContext(project);
  const provider = createAiProvider(env);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const result = await provider.explainProject(context, { signal: controller.signal });

    const insight = await prisma.aiInsight.create({
      data: {
        projectId,
        kind: "explain_project",
        providerMode: result.providerMode,
        inputDigest: digestContext(context),
        outputText: result.text,
        confidence: "AI_INFERRED",
      },
    });

    return insight;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ExplainTimeoutError(`AI provider timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    if (err instanceof AiProviderError) throw err;
    throw new AiProviderError("Unexpected error calling AI provider", err);
  } finally {
    clearTimeout(timeout);
  }
}

export async function listInsightsForProject(projectId: string) {
  return prisma.aiInsight.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
}
