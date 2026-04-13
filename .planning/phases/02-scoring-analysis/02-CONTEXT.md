# Phase 2: Scoring & Analysis - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 adds PageRank-style scoring to the existing canvas. Every graph change triggers automatic score recalculation. Scores are encoded visually on nodes (left accent border color + optional size scaling) and surfaced in a ranked sidebar with weak-page warning flags. Clicking a sidebar row highlights the corresponding canvas node.

Scenario management and export are NOT in scope — those belong to Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Score-to-Color Mapping
- **D-01:** Left accent border color encodes score level (carried forward from Phase 1 D-04 — this was explicitly planned).
- **D-02:** Color scale: **green → amber → red** (high → medium → low). Use Tailwind colors:
  - High (top third): `border-l-green-500`
  - Medium (middle third): `border-l-amber-500`
  - Low (bottom third): `border-l-red-400`
  - Single node or all equal scores: `border-l-indigo-500` (neutral, same as Phase 1 default)
- **D-03:** Color tiers are based on **relative thirds** of the score range — not absolute thresholds. This scales naturally regardless of graph size or score magnitudes.

### Score-to-Size Scaling
- **D-04:** **Claude's discretion** — user did not specify. Recommended approach: keep card width fixed (prevents layout jumps), vary only `min-height` or a subtle font-size step for the URL template label. Avoid dramatic size changes that would break the grid. Maximum 2 size steps (normal vs. slightly larger for top tier).

### Weak Page Threshold
- **D-05:** **Claude's discretion** — user left this to Claude. Recommended: flag nodes whose score is below **the mean score minus one standard deviation** (i.e., statistically low outliers). This avoids the "bottom 25% always flagged even when all pages are healthy" problem, and is more meaningful than raw bottom quartile in small graphs. Fallback: if standard deviation is 0 (all equal), flag nodes with zero inbound edges.
- **D-06:** Weak page visual on canvas node: **warning icon inside the node card** (top-left corner, small ⚠ icon from lucide-react `TriangleAlert`). Visible at a glance without altering the accent border color.
- **D-07:** Warning indicator appears in **both** the sidebar row AND the canvas node (per SIDEBAR-02 requirement).

### Sidebar Design
- **D-08:** **Claude's discretion** — user did not specify. Recommended: add a **right-side panel** for the score ranking, keeping the existing left palette sidebar unchanged. Right panel shows nodes ranked high→low with URL template, score value (formatted to 4 decimal places), and ⚠ icon for weak pages. Clicking a row calls `fitView` on that node and triggers React Flow's selection state.
- **D-09:** Right sidebar width: 240px fixed. Collapsible in a later phase if needed — not in Phase 2 scope.

### PageRank Algorithm
- **D-10:** Iterative PageRank with dampening factor **d = 0.85** (standard). Convergence condition: max delta across all nodes < **0.0001** per iteration, max **100 iterations**.
- **D-11:** Weighting: each node's outbound link equity is divided by its total weighted outbound link count. Link count (`linkCount` on each edge) acts as a multiplier — a node with `linkCount=5` passes 5× more equity per edge. Page count (`pageCount` on each node) scales the node's total equity pool.
- **D-12:** Algorithm lives in a **new pure function** `calculatePageRank(nodes, edges): Map<nodeId, score>` in `src/lib/graph-utils.ts` (extends the existing utility module from Phase 1). This enables TDD.
- **D-13:** Score recalculation triggers on **every `nodes` or `edges` state change** via `useMemo` in App.tsx — no manual recalculate button.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Codebase
- `src/lib/graph-utils.ts` — existing pure functions + data interfaces (`UrlNodeData`, `LinkCountEdgeData`); Phase 2 adds `calculatePageRank` here
- `src/components/UrlNode.tsx` — node component to extend with score color + weak flag
- `src/App.tsx` — canvas shell; Phase 2 adds `useMemo` score computation + right sidebar render
- `src/lib/graph-utils.test.ts` — existing test file; Phase 2 TDD tests go here or in a new file

### Project Requirements
- `.planning/REQUIREMENTS.md` — SCORE-01~04, SIDEBAR-01~03 are all in scope for Phase 2

### Phase 1 Decisions
- `.planning/phases/01-canvas-editor/01-CONTEXT.md` — D-01 through D-14 establish node/edge patterns Phase 2 must preserve

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `graph-utils.ts` — already exports `UrlNodeData`, `LinkCountEdgeData`, and immutable update helpers; `calculatePageRank` adds to this module
- `lucide-react` — already installed (added in Phase 1 as Rule 3 fix); `TriangleAlert` icon available for weak flag
- `useNodesState`/`useEdgesState` in App.tsx — Phase 2 derives scores from these via `useMemo`

### Established Patterns
- Pure function + TDD pattern (Phase 1 precedent): algorithm logic goes in `graph-utils.ts`, tested with Vitest
- `UrlNode.tsx` accepts score via `data` prop or React context — prefer passing via node `data` field so React Flow rerenders correctly
- Left accent border uses Tailwind `border-l-{color}` — Phase 2 switches this dynamically based on score tier

### Integration Points
- `App.tsx`: add `useMemo(() => calculatePageRank(nodes, edges), [nodes, edges])` and pass scores down to nodes via `data` field update or a React context
- `UrlNode.tsx`: add score tier prop → switch `border-l-*` class; add `TriangleAlert` icon when `isWeak` is true
- New file: `src/components/ScoreSidebar.tsx` — right-side ranked list panel

</code_context>

<specifics>
## Specific Ideas

- PageRank formula: `PR(u) = (1 - d) + d * Σ(PR(v) * linkCount(v→u) * pageCount(u) / totalWeightedOutbound(v))` — weight by both link count and page count
- Score formatting: 4 decimal places (e.g. `0.1523`) in the sidebar
- Weak flag icon: `lucide-react` `TriangleAlert` at 14×14px, `text-amber-500`, top-left corner of node card

</specifics>

<deferred>
## Deferred Ideas

None — all discussed items are within Phase 2 scope.

</deferred>

---

*Phase: 02-scoring-analysis*
*Context gathered: 2026-04-13 via /gsd:discuss-phase*
