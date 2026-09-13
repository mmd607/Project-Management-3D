import { useEffect, useState } from "react";

/** Respects the OS/browser-level prefers-reduced-motion setting (Phase 2 spec §17). When
 * true, Graph Mode should disable idle drift/physics/particle motion and camera pulses,
 * and shorten camera transitions rather than easing them. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(query.matches);
    handler();
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}
