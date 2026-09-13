import { describe, it, expect } from "vitest";
import { colorForCategory } from "./categoryColor";

describe("colorForCategory", () => {
  it("is deterministic for the same category", () => {
    expect(colorForCategory("Web frontend")).toBe(colorForCategory("Web frontend"));
  });

  it("maps unknown/uncategorized categories to a neutral gray, not a palette color", () => {
    expect(colorForCategory("Unknown")).toBe("#6b6b6e");
    expect(colorForCategory("Uncategorized")).toBe("#6b6b6e");
    expect(colorForCategory("Documentation-only or unrecognized")).toBe("#6b6b6e");
    expect(colorForCategory("")).toBe("#6b6b6e");
  });

  it("gives different real categories different colors most of the time", () => {
    const colors = new Set(
      ["Web frontend", "Backend / API service", "Python project", "PHP project", "Full-stack application"].map(
        colorForCategory,
      ),
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  it("is case-insensitive", () => {
    expect(colorForCategory("Python project")).toBe(colorForCategory("python project"));
  });
});
