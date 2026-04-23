---
phase: 12-unified-pages-panel
plan: 01
subsystem: ui
tags: [react, typescript, vitest, graph-analytics, hooks, tdd]

# Dependency graph
requires:
  - phase: 10-outbound-link-warning
    provides: calculateOutboundLinks pattern (Map<nodeId, number>, default-0 invariant, globals-skip-implicit guard) that calculateInboundLinks mirrors
  - phase: 08-crawl-depth-orphan-detection
    provides: identifyOrphanNodes synthetic-global inbound formula (+nonGlobalCount per global) that calculateInboundLinks parallels
  - phase: 04-global-nodes
    provides: D-01 no-global-to-global synthetic injection — enforced in the new helper
provides:
  - calculateInboundLinks(nodes, edges) pure helper in graph-analysis.ts — exported, memoizable, React-free
  - inboundMap: Map<string, number> field on GraphAnalyticsResult from useGraphAnalytics
  - 8 unit tests covering empty graph, default-0 invariant, edge counting, implicit global contribution, global→global exclusion, combined semantics, linkCount independence, and unknown-target guard
affects: [12-unified-pages-panel Plan 02 (PagesPanel UI consumer), 13-inbound-outbound-highlight]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD for pure graph helpers: RED test block → minimal implementation → full regression — mirrors Phase 10 calculateOutboundLinks workflow"
    - "Separate inbound count (edge-count semantic) from outbound count (linkCount-weighted semantic) — two independently useful metrics, not unified"
    - "Data-layer plan isolated from UI plan: hook return type stabilizes before UI consumer is built, letting Plan 02 ship against a typed contract"

key-files:
  created: []
  modified:
    - packages/web/src/lib/graph-analysis.ts
    - packages/web/src/lib/graph-utils.test.ts
    - packages/web/src/hooks/useGraphAnalytics.ts

key-decisions:
  - "Edge-count semantics for inbound (not linkCount-weighted) — matches identifyOrphanNodes orphan definition and CONTEXT D-20"
  - "identifyOrphanNodes NOT refactored to read from inboundMap — D-21 marks this refactor OPTIONAL; kept orphan derivation independent to preserve existing tests"
  - "calculateInboundLinks placed in graph-analysis.ts (not graph-pagerank.ts) alongside identifyOrphanNodes because it shares the edge-count/synthetic-global inbound formula"
  - "Test block lives in graph-utils.test.ts immediately after describe('calculateOutboundLinks') — symmetric placement mirrors the data-model pairing"

patterns-established:
  - "inboundMap/outboundMap symmetry on GraphAnalyticsResult: both use Map<nodeId, number>, both default every node to 0, both skip implicit-global contribution for global sources"
  - "When a data-layer helper is added for a UI plan, add it in a separate plan with TDD so the typed contract stabilizes before UI assembly"

requirements-completed: [TBD-12-INBOUND-MAP]

# Metrics
duration: 3min
completed: 2026-04-21
---

# Phase 12 Plan 01: Inbound Map Data Source Summary

**Added `calculateInboundLinks` pure helper (edge-count + synthetic-global semantics, parallel to `calculateOutboundLinks`) and exposed `inboundMap: Map<string, number>` on `useGraphAnalytics` so Plan 02's `PagesPanel` can render `in {count}` per row without re-implementing inbound counting.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-21T14:06:31Z
- **Completed:** 2026-04-21T14:09:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- New exported pure helper `calculateInboundLinks(nodes, edges): Map<string, number>` in `graph-analysis.ts` — zero React dependency, fully unit-testable, mirrors `calculateOutboundLinks` shape.
- Extended `GraphAnalyticsResult` with `inboundMap: Map<string, number>`; hook memoizes it via `useMemo(() => calculateInboundLinks(nodes, edges), [nodes, edges])` at line 69 — exact parallel to the existing `outboundMap` memo on line 65.
- 8 new unit tests in `graph-utils.test.ts` cover every branch of the helper (empty graph, every-node-present invariant, explicit edge counting, implicit global contribution, global→global exclusion, combined semantics, linkCount-independence, unknown-target guard).
- Full regression: 20 test files / 390 tests pass; `tsc --noEmit` exits 0. No existing caller breaks — `inboundMap` is additive and `App.tsx` destructure remains a valid subset.

### Final signature (as exported from `graph-analysis.ts`)

```typescript
/**
 * Total inbound links per node (edge count semantics — parallels identifyOrphanNodes):
 *   - Explicit: +1 per edge where edge.target === n.id.
 *   - Implicit global: for every global node G, +nonGlobalCount
 *     (every non-global implicitly links to every global; global-to-global
 *     is NOT synthetically injected, per Phase 4 D-01).
 *
 * `e.data?.linkCount` is NOT applied here — inbound is rendered as "in {N}" and
 * a page-count concept, matching identifyOrphanNodes. Use calculateOutboundLinks
 * for the linkCount-weighted outbound total.
 *
 * Returns Map<nodeId, totalInbound>. Every node in `nodes` is present (default 0).
 * Edges whose target is not in `nodes` are silently ignored.
 */
export function calculateInboundLinks(
  nodes: Node<UrlNodeData>[],
  edges: Edge[],
): Map<string, number>;
```

### `inboundMap` memo location in `useGraphAnalytics.ts`

Line 69 — immediately after the `outboundMap` memo on line 65, keeping related maps together.

## Task Commits

Each task was committed atomically (TDD produced two commits for Task 1):

1. **Task 1 RED: failing tests for calculateInboundLinks** — `9a53362` (test)
2. **Task 1 GREEN: implement calculateInboundLinks helper** — `24884e5` (feat)
3. **Task 2: expose inboundMap from useGraphAnalytics hook** — `82dd18f` (feat)

_TDD Refactor step: not needed — implementation was already minimal and mirrored the existing `calculateOutboundLinks` shape; no cleanup required._

## Files Created/Modified

- `packages/web/src/lib/graph-analysis.ts` — Added `calculateInboundLinks` export (42 lines inserted after `identifyOrphanNodes`, before `collectPlacementSuggestions`).
- `packages/web/src/lib/graph-utils.test.ts` — Added `calculateInboundLinks` to existing `./graph-analysis` import; appended `describe("calculateInboundLinks", ...)` block with 8 tests immediately after `describe("calculateOutboundLinks", ...)`.
- `packages/web/src/hooks/useGraphAnalytics.ts` — Added `calculateInboundLinks` to `./graph-analysis` import; extended `GraphAnalyticsResult` with `inboundMap: Map<string, number>`; added memo on line 69; included `inboundMap` in the hook's return object.

## Decisions Made

- **Edge-count, not linkCount-weighted.** Per CONTEXT D-20 and parallel to `identifyOrphanNodes`, `inboundMap` counts one per incoming edge. The `e.data?.linkCount` multiplier is reserved for outbound (total link volume); inbound is rendered as "in {N}" in Plan 02, a page-count concept. The two helpers are independently useful and are intentionally NOT unified.
- **`identifyOrphanNodes` NOT refactored.** D-21 marks the refactor to source orphan detection from `inboundMap` as OPTIONAL. Skipped to keep diff blast radius minimal and avoid regressing the existing orphan test suite. Both helpers compute inbound counts independently; the duplication is small (roughly 10 lines) and each has distinct call-site semantics (orphan set uses `rootId` exclusion; `inboundMap` does not).
- **File placement: `graph-analysis.ts`, not `graph-pagerank.ts`.** `calculateInboundLinks` shares the edge-count + synthetic-global inbound formula with `identifyOrphanNodes` (which lives in `graph-analysis.ts`), so co-locating keeps related inbound-counting logic together. `calculateOutboundLinks` stays in `graph-pagerank.ts` because it uses the linkCount-weighted semantics of the PageRank module.

## Deviations from Plan

None — plan executed exactly as written. Commit cadence, file placement, exact identifiers, test wording, and insertion points all followed the plan verbatim. All 7 acceptance-criteria greps from Task 1 and all 7 from Task 2 pass.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 (PagesPanel UI) can now consume `inboundMap` from `useGraphAnalytics` via prop drilling (App.tsx → SidePanel → PagesPanel). The typed contract is stable.
- No blockers. `tsc --noEmit` clean, full vitest suite (390 tests) green.

## Self-Check: PASSED

Verified:
- FOUND: `packages/web/src/lib/graph-analysis.ts` line 257 — `export function calculateInboundLinks`
- FOUND: `packages/web/src/lib/graph-utils.test.ts` — `describe("calculateInboundLinks", ...)` block with 8 tests; import present on updated `./graph-analysis` destructuring
- FOUND: `packages/web/src/hooks/useGraphAnalytics.ts` line 27 — `inboundMap: Map<string, number>;` on interface; line 69 — useMemo; line 129 — return field
- FOUND commit `9a53362` in git log (test RED)
- FOUND commit `24884e5` in git log (feat GREEN)
- FOUND commit `82dd18f` in git log (Task 2 hook wiring)
- `pnpm --filter @seo-intelligence/web exec tsc --noEmit` exits 0
- `pnpm --filter @seo-intelligence/web exec vitest run` — 20 files / 390 tests pass

---
*Phase: 12-unified-pages-panel*
*Completed: 2026-04-21*
