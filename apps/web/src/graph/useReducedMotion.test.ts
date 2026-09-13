import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "./useReducedMotion";

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    matches,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useReducedMotion", () => {
  it("returns false when the user has no reduced-motion preference", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion is set", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });
});
