import { useEffect, useState } from "react";

const MIN_WIDTH_FOR_GRAPH = 820;

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface GraphCapability {
  supported: boolean;
  reason: string | null;
}

function evaluateCapability(): GraphCapability {
  if (!detectWebGL()) {
    return { supported: false, reason: "WebGL is not available in this browser." };
  }
  if (window.innerWidth < MIN_WIDTH_FOR_GRAPH) {
    return { supported: false, reason: "Graph Mode needs a wider screen." };
  }
  return { supported: true, reason: null };
}

/** Feature-detects whether Graph Mode should be offered at all: WebGL support and a
 * viewport wide enough for a 3D graph to be usable rather than cramped. Narrow screens and
 * WebGL-less environments fall back to List Mode instead of forcing the 3D view.
 *
 * Both checks are synchronous (canvas context probe, window.innerWidth), so the initial
 * value is computed directly in the state initializer — no "checking…" placeholder state
 * that could be misread as "unsupported" by a consumer before the real check runs
 * (this caused Graph Mode to incorrectly flash to List on load — see Decision L follow-up). */
export function useGraphCapability(): GraphCapability {
  const [capability, setCapability] = useState<GraphCapability>(evaluateCapability);

  useEffect(() => {
    function handleResize() {
      setCapability(evaluateCapability());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return capability;
}
