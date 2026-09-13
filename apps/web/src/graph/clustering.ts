/**
 * Spatial clustering by real category data (never invented categories — see
 * IMPLEMENTATION_DECISION_LOG.md Decision K, section 6 of the Phase 2 prompt).
 *
 * Groups project nodes by their existing `intelligenceProfile.category` value, places each
 * cluster's center on a coarse Fibonacci sphere, and distributes each cluster's own members
 * on a smaller Fibonacci sphere around that center. Purely deterministic — no simulation.
 */
import { fibonacciSphereLayout } from "./layout";

export interface ClusterableProject {
  id: string;
  category: string;
}

export interface ClusterInfo {
  category: string;
  center: [number, number, number];
  nodeIds: string[];
}

export interface ClusteredLayoutResult {
  positions: Map<string, [number, number, number]>;
  clusters: ClusterInfo[];
}

const UNCATEGORIZED_LABEL = "Uncategorized";

export function computeClusteredLayout(
  projects: ClusterableProject[],
  clusterRadius: number,
  memberRadius: number,
): ClusteredLayoutResult {
  const byCategory = new Map<string, string[]>();
  for (const p of projects) {
    const key = p.category?.trim() || UNCATEGORIZED_LABEL;
    const list = byCategory.get(key);
    if (list) list.push(p.id);
    else byCategory.set(key, [p.id]);
  }

  const categories = [...byCategory.keys()].sort(); // stable, deterministic ordering
  const centers = fibonacciSphereLayout(categories, clusterRadius);
  const centerByCategory = new Map(centers.map((c) => [c.id, c.position]));

  const positions = new Map<string, [number, number, number]>();
  const clusters: ClusterInfo[] = [];

  for (const category of categories) {
    const center = centerByCategory.get(category)!;
    const nodeIds = byCategory.get(category)!;
    const memberOffsets = fibonacciSphereLayout(nodeIds, memberRadius);

    for (const { id, position } of memberOffsets) {
      positions.set(id, [center[0] + position[0], center[1] + position[1], center[2] + position[2]]);
    }

    clusters.push({ category, center, nodeIds });
  }

  return { positions, clusters };
}
