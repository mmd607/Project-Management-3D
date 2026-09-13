import { describe, it, expect } from "vitest";
import { nextQualityTier } from "./performanceGovernor";

describe("nextQualityTier", () => {
  it("downgrades from high to medium under sustained moderate frame drops", () => {
    expect(nextQualityTier("high", 40)).toBe("medium");
  });

  it("downgrades from medium to low under severe frame drops", () => {
    expect(nextQualityTier("medium", 20)).toBe("low");
  });

  it("does not downgrade on a small dip that's still above the threshold", () => {
    expect(nextQualityTier("high", 50)).toBe("high");
  });

  it("upgrades back only once comfortably above the threshold (hysteresis)", () => {
    // 46 fps is above the high-tier downgrade threshold (45) but below the medium-tier
    // upgrade threshold (55) — should stay at medium, not immediately bounce back to high.
    expect(nextQualityTier("medium", 46)).toBe("medium");
    expect(nextQualityTier("medium", 56)).toBe("high");
  });

  it("has nowhere lower to go from low", () => {
    expect(nextQualityTier("low", 1)).toBe("low");
  });

  it("has nowhere higher to go from high on a great frame rate", () => {
    expect(nextQualityTier("high", 120)).toBe("high");
  });
});
