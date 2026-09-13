export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Evenly spaced positions on an ellipse around the centre. With exactly four nodes this
 * yields the classic diamond (top-left, top-right, bottom-right, bottom-left). Pure, so
 * it can be unit-tested without a DOM.
 */
export function layoutAround(count: number, width: number, height: number): NodePosition[] {
  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.min(width * 0.31, 400);
  const ry = Math.min(height * 0.28, 260);
  const out: NodePosition[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 - Math.PI / count + (i * 2 * Math.PI) / count;
    out.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  return out;
}
