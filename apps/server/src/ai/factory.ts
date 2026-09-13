import type { Env } from "../config/env.js";
import type { AiProvider } from "./provider.js";
import { MockProvider } from "./mockProvider.js";
import { AnthropicProvider } from "./anthropicProvider.js";

export function createAiProvider(env: Env): AiProvider {
  if (env.AI_PROVIDER === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY");
    }
    return new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL });
  }
  return new MockProvider();
}
