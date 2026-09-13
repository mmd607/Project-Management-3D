import { describe, it, expect } from "vitest";
import { formatBytes } from "./formatBytes";

describe("formatBytes", () => {
  it("shows bytes under 1024 as-is", () => {
    expect(formatBytes(512)).toBe("512 B");
  });
  it("converts to KB", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
  it("converts to MB", () => {
    expect(formatBytes(3 * 1024 * 1024)).toBe("3 MB");
  });
});
