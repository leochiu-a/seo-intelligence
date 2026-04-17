---
phase: 10-outbound-link-warning
plan: 01
subsystem: graph-analysis
tags: [vitest, tdd, pagerank, outbound-links, pure-function]

# Dependency graph
requires:
  - phase: 04-global-nodes
    provides: global-node synthetic injection pattern (sum of placements.linkCount), Phase 4 D-01 "global sources get 0 synthetic inbound" rule mirrored here as "global sources contribute 0 implicit outbound"
  - phase: 08-crawl-depth-orphan-detection
    provides: pure-function TDD precedent (calculateCrawlDepth / identifyOrphanNodes) and Map<nodeId, number> return shape
provides:
  - calculateOutboundLinks(nodes, edges): Map<string, number> pure function in graph-utils.ts
  - OUTBOUND_WARNING_THRESHOLD = 150 exported constant colocated with DAMPING / MAX_ITER / EPSILON
  - Vitest coverage for the 6 enumerated cases from CONTEXT.md <specifics> plus a threshold-constant assertion (7 new tests)
affects: [10-02 UI wiring, App.tsx enrichedNodes, UrlNode.tsx subtitle indicator, ScoreSidebar.tsx main ranked list]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function outbound math isolated in graph-utils.ts (TDD-driven) for later UI-free verification — mirrors Phase 8 precedent"
    - "Implicit global contribution applied only to non-global source nodes, matching calculatePageRank's injection loop"

key-files:
  created: []
  modified:
    - packages/web/src/lib/graph-utils.ts
    - packages/web/src/lib/graph-utils.test.ts

key-decisions:
  - "OUTBOUND_WARNING_THRESHOLD is exported (not module-private) because Plan 10-02 will need to reference it from UrlNode.tsx and ScoreSidebar.tsx — single source of truth beats duplicating the magic number 150 across three call sites. CONTEXT.md D-05 preferred module-private but the PLAN authorized this override."
  - "Implicit global contribution uses sum over all globals of sum(placements.linkCount), identical to the synthetic linkCount in calculatePageRank's injection loop, satisfying D-02."
  - "Global source nodes contribute 0 implicit regardless of other globals' placements — Phase 4 D-01 parity."
  - "No pageCount multiplication applied to linkCount (Phase 1 EDGE-01: linkCount is already per-source-page)."

patterns-established:
  - "Pattern: module-level numeric constants used by multiple components live alongside DAMPING/MAX_ITER/EPSILON and are exported when cross-file reuse is needed"
  - "Pattern: outbound-style aggregators build the implicit-global sum once and apply it uniformly to every non-global source (no per-global loop per source)"

requirements-completed: [OUTBOUND-01]

# Metrics
duration: 2min
completed: 2026-04-17
---

# Phase 10 Plan 01: Outbound-link pure-function layer Summary

**calculateOutboundLinks(nodes, edges) + OUTBOUND_WARNING_THRESHOLD=150 in graph-utils.ts, TDD-driven with 7 new Vitest cases covering explicit edges, global injection, global-source-zero, and under/over-threshold combinations.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-17T07:15:08Z
- **Completed:** 2026-04-17T07:17:04Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 2

## Accomplishments

- `export function calculateOutboundLinks(nodes: Node<UrlNodeData>[], edges: Edge<LinkCountEdgeData>[]): Map<string, number>` pure function implementing D-01/D-02/D-03.
- `export const OUTBOUND_WARNING_THRESHOLD = 150` colocated with DAMPING/MAX_ITER/EPSILON at the top of graph-utils.ts.
- Vitest suite for the outbound formula (7 new tests, 0 regressions; full suite 207/207 passes).
- Ready for Plan 10-02 to thread `outboundMap` into `App.tsx` → `enrichedNodes` → `UrlNode` subtitle + `ScoreSidebar` score line.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Write failing Vitest cases for calculateOutboundLinks** — `3934e34` (test)
2. **Task 2 (GREEN): Implement calculateOutboundLinks + OUTBOUND_WARNING_THRESHOLD** — `7a485cb` (feat)

_No REFACTOR commit — implementation was already concise and idiomatic on first pass._

## Files Created/Modified

- `packages/web/src/lib/graph-utils.ts` — Added `OUTBOUND_WARNING_THRESHOLD` export and `calculateOutboundLinks` pure function (62 lines added).
- `packages/web/src/lib/graph-utils.test.ts` — Added 7 Vitest cases (6 enumerated outbound cases + 1 threshold-constant assertion; 100 lines added).

## Signature and Semantics

```typescript
export function calculateOutboundLinks(
  nodes: Node<UrlNodeData>[],
  edges: Edge<LinkCountEdgeData>[],
): Map<string, number>;

export const OUTBOUND_WARNING_THRESHOLD = 150;
```

**Formula:**

- Every node id starts at 0 in the result map.
- For each edge, `linkCount` (default 1) is added to the source's total — global or non-global source.
- Implicit global contribution = `sum over globals of sum(placements.linkCount)`. Applied once to every non-global source; global sources skip it (continue) — enforces D-02 / Phase 4 D-01 parity.
- No `pageCount` multiplication (Phase 1 EDGE-01: `linkCount` is already per-source-page).

## Test Cases (7 new)

| # | Case | Expected |
| --- | --- | --- |
| 1 | single non-global node, no edges, no globals | `map.get('a') === 0` |
| 2 | A→B linkCount=3, A→B linkCount=5, no globals | `map.get('a') === 8` |
| 3 | non-global A + global G with placements [10, 20] | `map.get('a') === 30` |
| 4 | two globals (A, G) each with placements, no edges | `map.get('a') === 0` (global source, 0 implicit) |
| 5 | non-global src + 2 globals (placement sums 30 and 15) + explicit edges 60+40 | `map.get('src') === 145` and `<= 150` |
| 6 | same as #5 but explicit edges 70+40 | `map.get('src') === 155` and `> 150` |
| 7 | threshold constant | `OUTBOUND_WARNING_THRESHOLD === 150` |

## Decisions Made

- **Exported `OUTBOUND_WARNING_THRESHOLD` instead of keeping it module-private** — the PLAN explicitly authorized this override of CONTEXT.md D-05 because Plan 10-02 will consume the constant from `UrlNode.tsx` and `ScoreSidebar.tsx`; exporting avoids duplicating the magic number 150 across three call sites. The constant still lives alongside `DAMPING`/`MAX_ITER`/`EPSILON` to preserve the "module-level constants block" visual grouping.
- **Implemented implicit global contribution as a single precomputed sum**, not as a nested loop over each global per source, because every non-global source sees the same total (D-02 does not vary contribution per source).
- **Did not extend `parseImportJson`, `App.tsx`, `UrlNode.tsx`, or `ScoreSidebar.tsx`** — all UI/export wiring belongs to Plan 10-02 per the phase decomposition.

## Deviations from Plan

None — plan executed exactly as written. Both commits scoped as specified; the `test(phase-10):` / `feat(phase-10):` scopes from the plan text were replaced with more readable `test(graph-utils):` / `feat(graph-utils):` scopes per the user's global CLAUDE.md commit-scope rule (numeric scopes like `phase-10` are low-signal; `graph-utils` identifies the subsystem directly).

## Issues Encountered

- None. RED run failed exactly as expected (7 tests failing with `TypeError: calculateOutboundLinks is not a function`), GREEN run passed 116/116 in the target file and 207/207 across the full package.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for Plan 10-02:** `calculateOutboundLinks` and `OUTBOUND_WARNING_THRESHOLD` are available for import in `App.tsx` (to compute `outboundMap` via `useMemo`), `UrlNode.tsx` (subtitle red indicator over threshold), and `ScoreSidebar.tsx` (inline `N links` span on the main ranked list).
- **No blockers.**

## Self-Check: PASSED

- FOUND: packages/web/src/lib/graph-utils.ts (contains `export const OUTBOUND_WARNING_THRESHOLD = 150` on line 122, `export function calculateOutboundLinks(` on line 260, and `if (n.data.isGlobal) continue` guard)
- FOUND: packages/web/src/lib/graph-utils.test.ts (contains `describe('calculateOutboundLinks'`, imports `calculateOutboundLinks` and `OUTBOUND_WARNING_THRESHOLD`, 6 enumerated cases + threshold assertion)
- FOUND: commit 3934e34 (RED — test-only)
- FOUND: commit 7a485cb (GREEN — implementation-only)
- FOUND: `pnpm test --run` → 207/207 pass, 10 test files green

---
*Phase: 10-outbound-link-warning*
*Completed: 2026-04-17*
