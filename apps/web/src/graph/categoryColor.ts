/**
 * Deterministic category → color mapping (Decision L). Category is real data (the same
 * field already used for clustering) — this never invents a category, only assigns a
 * stable visual color to whatever categories actually exist in the current workspace.
 */
const PALETTE = [
  "#8B5CF6", // purple
  "#22D3EE", // cyan
  "#38BDF8", // blue
  "#4ADE80", // green
  "#F59E0B", // amber
  "#D946EF", // magenta
  "#F43F8E", // pink
];

const UNKNOWN_COLOR = "#6b6b6e"; // neutral gray — "we don't know" is distinct from "we know and it's X"
const UNKNOWN_CATEGORIES = new Set(["unknown", "uncategorized", "documentation-only or unrecognized"]);

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

export function colorForCategory(category: string): string {
  const normalized = category.trim().toLowerCase();
  if (!normalized || UNKNOWN_CATEGORIES.has(normalized)) return UNKNOWN_COLOR;
  return PALETTE[hashString(normalized) % PALETTE.length];
}
