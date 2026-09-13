/**
 * Real provider adapter — Anthropic Messages API.
 * Only used when AI_PROVIDER=anthropic and ANTHROPIC_API_KEY is set (see src/config/env.ts).
 * Never called by default and never called in the test suite.
 */
import { z } from "zod";
import { AiProvider, AiProviderError, AiProviderResult, ExplainProjectContext } from "./provider.js";

const AnthropicResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })).min(1),
});

function buildPrompt(context: ExplainProjectContext): { system: string; user: string } {
  const system =
    "You explain software projects to their owner from structured scanner evidence only. " +
    "Never invent facts not supported by the evidence provided. Clearly mark anything uncertain " +
    "as uncertain. Keep the explanation under 150 words, plain prose, no markdown headers.";

  const user = JSON.stringify(
    {
      projectName: context.projectName,
      category: context.category,
      projectType: context.projectType,
      deterministicDescription: context.description,
      architectureSummary: context.architectureSummary,
      healthSummary: context.healthSummary,
      technologies: context.technologies,
      evidence: context.evidence,
    },
    null,
    2,
  );

  return { system, user };
}

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export class AnthropicProvider implements AiProvider {
  readonly mode = "anthropic" as const;

  constructor(private readonly opts: AnthropicProviderOptions) {}

  async explainProject(context: ExplainProjectContext, opts: { signal: AbortSignal }): Promise<AiProviderResult> {
    const { system, user } = buildPrompt(context);
    const baseUrl = this.opts.baseUrl ?? "https://api.anthropic.com";

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        signal: opts.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.opts.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.opts.model,
          max_tokens: 400,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err; // let caller classify timeout vs abort
      throw new AiProviderError("Failed to reach Anthropic API", err);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new AiProviderError(`Anthropic API returned ${response.status}: ${bodyText.slice(0, 300)}`);
    }

    const json = await response.json().catch((err) => {
      throw new AiProviderError("Anthropic API returned malformed JSON", err);
    });

    const parsed = AnthropicResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new AiProviderError("Anthropic API response did not match expected schema", parsed.error);
    }

    const text = parsed.data.content.find((block) => block.type === "text")?.text;
    if (!text) {
      throw new AiProviderError("Anthropic API response contained no text block");
    }

    return { text, providerMode: "anthropic" };
  }
}
