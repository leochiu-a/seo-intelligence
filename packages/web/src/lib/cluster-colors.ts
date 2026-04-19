/**
 * Cluster color palette + deterministic hash lookup for Phase 999.5 topical tags.
 *
 * Same tag name always maps to the same palette entry across scenarios/reloads
 * because the hash (DJB2) is pure and the palette is a frozen tuple.
 *
 * Excluded colors (overloaded by existing UI):
 *   - green  → Phase 2 high tier
 *   - amber  → Phase 2 mid tier / Phase 8 depth warning / Phase 8 weak
 *   - red    → Phase 2 low tier / Phase 8 orphan / Phase 10 over-linked
 *   - indigo → Phase 2 neutral tier + selected edges
 *   - blue   → Phase 4 global badge
 *   - violet → Phase 8 root badge
 */

export interface ClusterColor {
  /** Tailwind class for sidebar dots and inline tag chip color dot */
  dot: string;
}

export const CLUSTER_PALETTE: readonly ClusterColor[] = Object.freeze([
  { dot: "bg-teal-400" },
  { dot: "bg-cyan-400" },
  { dot: "bg-sky-400" },
  { dot: "bg-pink-400" },
  { dot: "bg-rose-400" },
  { dot: "bg-orange-400" },
  { dot: "bg-lime-400" },
  { dot: "bg-fuchsia-400" },
]);

/**
 * DJB2 string hash (Dan Bernstein) — deterministic, collision-resistant enough
 * for an 8-entry palette, zero deps. Pure function.
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i); // hash * 33 + c
  }
  return hash >>> 0; // unsigned 32-bit
}

/**
 * Maps a tag string to a deterministic cluster color. Same tag name → same
 * ClusterColor object reference across calls. Empty string is valid input
 * and returns a palette entry (hash of empty string = 5381 → index 5381 % N).
 */
export function getClusterColor(tag: string): ClusterColor {
  const index = djb2(tag) % CLUSTER_PALETTE.length;
  return CLUSTER_PALETTE[index];
}
