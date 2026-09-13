import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGraphCapability } from "./useGraphCapability";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  vi.unstubAllGlobals();
});

describe("useGraphCapability", () => {
  it("reports unsupported when WebGL is unavailable", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as never;
    vi.stubGlobal("innerWidth", 1400);

    const { result } = renderHook(() => useGraphCapability());
    await waitFor(() => expect(result.current.supported).toBe(false));
    expect(result.current.reason).toMatch(/WebGL/);
  });

  it("reports unsupported on a narrow viewport even with WebGL available", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({}) as never;
    vi.stubGlobal("innerWidth", 500);

    const { result } = renderHook(() => useGraphCapability());
    await waitFor(() => expect(result.current.supported).toBe(false));
    expect(result.current.reason).toMatch(/wider screen/);
  });

  it("reports supported when WebGL is available and the viewport is wide", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({}) as never;
    vi.stubGlobal("innerWidth", 1400);

    const { result } = renderHook(() => useGraphCapability());
    await waitFor(() => expect(result.current.supported).toBe(true));
    expect(result.current.reason).toBeNull();
  });

  it("reports the correct value on the very first render — no 'checking' placeholder that a consumer could misread as unsupported (regression: this caused Graph Mode to flash to List on load)", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({}) as never;
    vi.stubGlobal("innerWidth", 1400);

    const { result } = renderHook(() => useGraphCapability());
    // Deliberately no waitFor/await — asserting the *synchronous* first-render value.
    expect(result.current.supported).toBe(true);
    expect(result.current.reason).toBeNull();
  });
});
