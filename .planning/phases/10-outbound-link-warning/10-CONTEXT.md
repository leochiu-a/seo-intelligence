# Phase 10: Outbound Link Warning - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 adds per-node total outbound link calculation (explicit edges + implicit global-node placements), a canvas red warning when the total exceeds 150, and a sidebar count display that highlights in red when over threshold. Requirements in scope: OUTBOUND-01, OUTBOUND-02, OUTBOUND-03.

**Out of scope:** User-configurable threshold (future phase), topical-cluster weighting, anchor-text typing, Screaming Frog / GSC imports, actionable-insights export — all belong to backlog phases 999.x.

</domain>

<decisions>
## Implementation Decisions

### Outbound Count Formula
- **D-01:** Total outbound per node = `sum(edge.linkCount for each explicit outbound edge) + implicit_global_contribution`.
- **D-02:** `implicit_global_contribution` mirrors Phase 4 PageRank injection exactly: for a **non-global** source node, add `sum(placements.linkCount)` for each global node in the graph. For a **global** source node, `implicit_global_contribution = 0` (Phase 4 D-01 established global→global has no synthetic injection).
- **D-03:** Count is a **per-real-page** figure. `edge.linkCount` is already defined as "average number of links a source page places to the destination template" (Phase 1 EDGE-01), so no pageCount multiplication is required.

### Warning Threshold
- **D-04:** Threshold = **150** (per OUTBOUND-02 requirement).
- **D-05:** Threshold exposed as a **module-private constant** in `graph-utils.ts`, colocated with `DAMPING`, `MAX_ITER`, `EPSILON`:
  ```ts
  const OUTBOUND_WARNING_THRESHOLD = 150;
  ```
  No UI knob. Follows existing `const`-style in the file — trivially tweakable by devs. Matches Phase 8's "depth >3" hardcoded-threshold spirit while being DRY since the value is referenced from both canvas and sidebar call sites.

### Canvas Indicator
- **D-06:** Warning renders **inline in the subtitle line** of the node card, consistent with weak/orphan/depth indicators.
- **D-07:** Format: red `TriangleAlert` icon (`lucide-react`, size 11, `text-red-500`) + label `167 links` in `text-red-500`. Example subtitle: `1 page · ⚠ 167 links`.
- **D-08:** Indicator is **only shown when over threshold** (>150). Under threshold → nothing on canvas subtitle.
- **D-09:** Coexists with weak/orphan/depth indicators — they are orthogonal (outbound measures outbound load; the others measure inbound / reachability). Show in this order when multiple apply: orphan/unreachable → weak → depth → over-linked. (Claude's discretion on exact separator spacing.)

### Sidebar Indicator
- **D-10:** Outbound count shows **inline on the score line**, mirroring Phase 8 depth display: `0.1523 · Depth 2 · 167 links`.
- **D-11:** Count is **always visible** when any node has nodes in the main ranked list (no separate section). When `outbound > 150`, the `167 links` span renders in `text-red-500`; otherwise muted (no warning styling).
- **D-12:** No dedicated "Over-linked Pages" section at the top — outbound is an optimization warning, not a structural alarm like orphan/unreachable.

### Claude's Discretion
- Exact function name for the pure utility (suggested: `calculateOutboundLinks(nodes, edges): Map<string, number>`)
- Exact Tailwind separator spacing in subtitle when multiple indicators stack
- Whether to add outbound count and `isOverLinked` to `enrichedNodes` useMemo (likely yes — mirror `crawlDepth` / `isOrphan` pattern in `App.tsx`)
- Export JSON/CSV inclusion — probably yes for JSON (include `outboundCount` alongside existing fields), not required for CSV unless trivially additive
- TDD coverage for `calculateOutboundLinks` including: no-edges node (0), non-global with 2 globals each having 3 placements summing to (10 + 20), explicit edges mixed with global injection, global source node (no implicit contribution)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — OUTBOUND-01, OUTBOUND-02, OUTBOUND-03 (all in scope for Phase 10)

### Existing Codebase
- `packages/web/src/lib/graph-utils.ts` — Add `OUTBOUND_WARNING_THRESHOLD` constant, add `calculateOutboundLinks(nodes, edges)` pure function next to `calculatePageRank`. Reuse the inbound/outbound adjacency-build pattern from `calculatePageRank` (lines ~141–177).
- `packages/web/src/components/UrlNode.tsx` — Extend `UrlNodeExtendedData` with `outboundCount?: number` and `isOverLinked?: boolean`. Add red `TriangleAlert` + count in subtitle block (around line 133), respecting coexistence order with weak/orphan/depth.
- `packages/web/src/components/ScoreSidebar.tsx` — Extend `ScoreSidebarProps` with `outboundMap: Map<string, number>`. Add inline `167 links` span in the main ranked-list score line (around line 185–199), red when over threshold.
- `packages/web/src/App.tsx` — Compute `outboundMap` via `useMemo` near existing `depthMap`/`orphanNodes` (lines ~393–411). Thread into `enrichedNodes` useMemo (~414–437), `styledNodes`, and `ScoreSidebar` props (~615–625).
- `packages/web/src/App.tsx` — Add `outboundMap: Object.fromEntries(outboundMap)` to the JSON export payload (~505) if we decide to include it.

### Prior Phase Decisions
- `.planning/phases/02-scoring-analysis/02-CONTEXT.md` — Weak node warning pattern (amber `TriangleAlert`, subtitle line); outbound follows the same visual grammar but in red.
- `.planning/phases/04-global-nodes/04-CONTEXT.md` *(if present)* — Global injection math: synthetic `sum(placements.linkCount)` edge from every non-global source to every global node. **D-01: Global nodes do NOT receive synthetic inbound from other global nodes.** Phase 10 outbound formula mirrors this: global source nodes contribute 0 to their own implicit-global outbound total.
- `.planning/phases/08-crawl-depth-orphan-detection/08-CONTEXT.md` — Established the enrichedNodes + subtitle-line + ScoreSidebar inline pattern. Phase 10 is the same pattern applied to outbound data. Depth-warning icon (Layers amber) is visually complementary to over-linked (TriangleAlert red).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calculatePageRank` in `graph-utils.ts` — already builds `outbound: Map<sourceId, Array<{ targetId, linkCount }>>` including synthetic global edges (lines ~142–177). `calculateOutboundLinks` can use the same construction approach or, more simply, iterate edges + global-placement sums directly to avoid coupling.
- `TriangleAlert` from `lucide-react` — already imported and used (amber for weak). Reuse with `text-red-500` for over-linked.
- `enrichedNodes` useMemo in `App.tsx` — Phase 8 already extended it with `isOrphan`, `isUnreachable`, `crawlDepth`. Add `outboundCount`, `isOverLinked` the same way.
- `identifyWeakNodes` / `identifyOrphanNodes` signature pattern — `calculateOutboundLinks` returns `Map<nodeId, number>`; a derived `isOverLinked = count > OUTBOUND_WARNING_THRESHOLD` is computed inline in `enrichedNodes` (no separate `Set`).

### Established Patterns
- Pure-function TDD in `graph-utils.ts` with Vitest (Phase 2, 4, 8 precedents). Write `graph-utils.test.ts` cases BEFORE implementation.
- UrlNode subtitle accumulates indicators in a single flex row using `·` separators and `size={11}` icons. Order: orphan/unreachable > weak > depth > (new) over-linked.
- ScoreSidebar main ranked list already conditionally renders depth inline using an IIFE (`(() => { ... })()` pattern, lines 187–199). Mirror that for outbound.

### Integration Points
- `graph-utils.ts`: add `OUTBOUND_WARNING_THRESHOLD` and `calculateOutboundLinks` exports.
- `App.tsx`: compute `outboundMap` in useMemo; thread into `enrichedNodes`, `ScoreSidebar` props, and JSON export.
- `UrlNode.tsx`: add subtitle-line indicator respecting coexistence ordering.
- `ScoreSidebar.tsx`: extend props and render inline count in main ranked list.
- No change needed for localStorage/scenario persistence — outbound is a derived value, not stored.
- CSV export (`url_template, page_count, score`): leave unchanged unless a new column is explicitly requested (not required by OUTBOUND-03).

</code_context>

<specifics>
## Specific Ideas

- Red warning uses `text-red-500` to match existing orphan/unreachable palette — stays within the red/amber semantic system (red = severe, amber = advisory).
- Icon choice: `TriangleAlert` (reuse existing import) rather than introducing a new icon like `LinkIcon` or `AlertOctagon` — keeps icon vocabulary tight.
- In subtitle, separator between indicators is `·` in muted text (matches Phase 8 pattern: `1 page · ⚠ Weak · Depth 5 ⚠`).
- TDD cases worth enumerating:
  1. Node with no outbound edges and no globals → 0
  2. Node with two explicit edges (linkCount 3 + 5) → 8
  3. Non-global node + one global node with placements [10, 20] → explicit + 30
  4. Global source node with explicit edges → explicit only (no implicit contribution)
  5. Mixed: non-global source, 2 globals (sum 30 and sum 15), explicit edges summing 100 → 145 (under threshold)
  6. Same as above but explicit sum = 110 → 155 (over threshold)

</specifics>

<deferred>
## Deferred Ideas

- **User-configurable threshold UI** — surfaces in OUTBOUND's discussion but adds scope. Can be a small future phase if PMs ask for it.
- **CSV export column for outbound count** — not required by OUTBOUND-03; only do it if user requests.
- **"Suggested fixes" output** — e.g., "Reduce Footer placement linkCount from 40 → 20 to bring X under 150". Belongs to backlog 999.9 (actionable-insights export).

</deferred>

---

*Phase: 10-outbound-link-warning*
*Context gathered: 2026-04-17 via /gsd:discuss-phase*
