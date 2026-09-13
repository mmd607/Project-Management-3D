/**
 * AI provider abstraction.
 * Source: ai-project-workspace-phase0/05-ai/PROVIDER_ABSTRACTION.md, 05-ai/AI_SPEC.md
 *
 * Independent design for this product — not reused from any other repository. Callers only
 * ever depend on this interface, never on a concrete provider.
 */
export interface ExplainProjectContext {
  projectName: string;
  category: string;
  projectType: string;
  description: string;
  architectureSummary: string;
  healthSummary: string;
  technologies: { name: string; kind: string }[];
  evidence: { key: string; value: string; evidenceType: string }[];
}

export interface AiProviderResult {
  text: string;
  providerMode: "mock" | "anthropic";
}

export interface AiProvider {
  readonly mode: "mock" | "anthropic";
  explainProject(context: ExplainProjectContext, opts: { signal: AbortSignal }): Promise<AiProviderResult>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export class AiProviderTimeoutError extends AiProviderError {}
