import { describe, it, expect } from "vitest";
import { MockProvider } from "../src/ai/mockProvider.js";
import type { ExplainProjectContext } from "../src/ai/provider.js";

const context: ExplainProjectContext = {
  projectName: "demo-app",
  category: "Web frontend",
  projectType: "Web application",
  description: "A web frontend written primarily in TypeScript.",
  architectureSummary: "Appears to be a client-side/UI-focused codebase.",
  healthSummary: "Git repository detected. Has a README.",
  technologies: [{ name: "TypeScript", kind: "language" }, { name: "React", kind: "framework" }],
  evidence: [{ key: "framework", value: "React", evidenceType: "manifest" }],
};

describe("MockProvider", () => {
  it("is deterministic, offline, and clearly labels itself as mock", async () => {
    const provider = new MockProvider();
    const controller = new AbortController();
    const first = await provider.explainProject(context, { signal: controller.signal });
    const second = await provider.explainProject(context, { signal: controller.signal });

    expect(first.providerMode).toBe("mock");
    expect(first.text).toBe(second.text); // deterministic
    expect(first.text).toContain("demo-app");
    expect(first.text.toLowerCase()).toContain("mock");
  });

  it("does not fabricate technologies not present in the context", async () => {
    const provider = new MockProvider();
    const controller = new AbortController();
    const result = await provider.explainProject(
      { ...context, technologies: [] },
      { signal: controller.signal },
    );
    expect(result.text).toMatch(/no clearly detected technologies/);
  });
});
