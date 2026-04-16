---
phase: 08-crawl-depth-orphan-detection
plan: 01
subsystem: testing
tags: [bfs, graph-utils, crawl-depth, orphan-detection, tdd, vitest]

# Dependency graph
requires:
  - phase: 07-placement-centric-filter
    provides: graph-utils.ts with UrlNodeData, calculatePageRank, identifyWeakNodes
provides:
  - calculateCrawlDepth(nodes, edges, rootId): Map<string, number> — BFS shortest-path from root
  - identifyOrphanNodes(nodes, edges, rootId): Set<string> — zero-inbound detection excluding root
  - isRoot?: boolean field on UrlNodeData interface
affects:
  - 08-02 UI work — depends on calculateCrawlDepth and identifyOrphanNodes for sidebar and node display

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BFS with adjacency list and synthetic global edges — same global injection pattern as PageRank
    - Pure function TDD in graph-utils.ts — behavior specs drive test cases before implementation

key-files:
  created: []
  modified:
    - src/lib/graph-utils.ts
    - src/lib/graph-utils.test.ts

key-decisions:
  - "calculateCrawlDepth returns empty Map when rootId not found — avoids partial state with no valid starting point"
  - "identifyOrphanNodes counts synthetic global inbound — global nodes with non-global neighbors are never orphans"
  - "Both functions share the synthetic-edge pattern from calculatePageRank: all non-global nodes implicitly link to each global node"

patterns-established:
  - "Pure function + TDD in graph-utils.ts — new graph computations follow red-green cycle before UI"
  - "Synthetic global edges applied consistently in BFS (same as PageRank injection)"

requirements-completed:
  - DEPTH-01
  - DEPTH-05
  - ORPHAN-01

# Metrics
duration: 5min
completed: 2026-04-16
---

# Phase 08 Plan 01: BFS Crawl Depth & Orphan Detection — Core Functions Summary

**BFS crawl depth calculator and orphan detector as pure exported functions in graph-utils.ts, with 19 new TDD test cases (109 total passing)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-16T13:14:05Z
- **Completed:** 2026-04-16T13:19:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `isRoot?: boolean` to `UrlNodeData` interface — enables root designation for BFS starting point
- Implemented `calculateCrawlDepth(nodes, edges, rootId)` with BFS traversal following directed edges + synthetic global edges; returns depth 0 for root, Infinity for unreachable nodes
- Implemented `identifyOrphanNodes(nodes, edges, rootId)` counting explicit + synthetic inbound per node; excludes root; global nodes receive synthetic inbound from all non-global nodes
- 19 new test cases covering edge cases: empty inputs, root exclusion, chains, branches, diamond paths, direction-only traversal, global synthetic edges, isolated nodes, cycles

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isRoot to UrlNodeData + implement calculateCrawlDepth with TDD** - `bbdc32a` (feat)
2. **Task 2: Implement identifyOrphanNodes with TDD** - `f3c52ba` (feat)

## Files Created/Modified

- `src/lib/graph-utils.ts` — Added `isRoot?: boolean` to UrlNodeData, implemented `calculateCrawlDepth` and `identifyOrphanNodes` exports
- `src/lib/graph-utils.test.ts` — Added `calculateCrawlDepth` (11 tests) and `identifyOrphanNodes` (8 tests) describe blocks, imported both new functions

## Decisions Made

- Both functions apply the same synthetic global edge pattern as `calculatePageRank`: every non-global node implicitly links to every global node. This ensures consistent crawl behavior across all graph algorithms.
- `identifyOrphanNodes` uses raw inbound edge counts (not reachability from root) — a node is orphan if nobody links to it, regardless of whether it can be found via BFS. This matches D-10 distinction: orphan ≠ unreachable.
- Both functions co-implemented in same commit cycle: `identifyOrphanNodes` was added alongside `calculateCrawlDepth` implementation to resolve the import binding issue in the shared test file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Implemented identifyOrphanNodes in Task 1 to resolve named import**
- **Found during:** Task 1 (RED phase)
- **Issue:** Test file imports both `calculateCrawlDepth` and `identifyOrphanNodes` at the top. With `identifyOrphanNodes` undefined, vitest's esbuild transform silently skipped the new `calculateCrawlDepth` describe block (tests were parsed but not collected — 90 tests instead of 101).
- **Fix:** Added full `identifyOrphanNodes` implementation in Task 1 to make the named import resolve. Task 2 then added the identifyOrphanNodes test describe block.
- **Files modified:** src/lib/graph-utils.ts
- **Verification:** 109 tests pass (101 after Task 1, 109 after Task 2)
- **Committed in:** bbdc32a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking import resolution)
**Impact on plan:** No scope creep. Both functions were planned for this plan. Implementation order shifted slightly — implementation came before Task 2 tests rather than as a stub.

## Issues Encountered

- Vitest test collection silently skipped new describe blocks when a named import from the same module was `undefined` at runtime. Vitest's esbuild transform does not error on missing named exports — they become `undefined`. The fix was ensuring all imported symbols are valid exports before the test suite runs.

## Next Phase Readiness

- `calculateCrawlDepth` and `identifyOrphanNodes` are exported, tested, and ready for Plan 02 UI integration
- `isRoot?: boolean` field on `UrlNodeData` ready for EditPopover root toggle (Plan 02)
- No blockers for Plan 02

---
*Phase: 08-crawl-depth-orphan-detection*
*Completed: 2026-04-16*

## Self-Check: PASSED

- FOUND: src/lib/graph-utils.ts
- FOUND: src/lib/graph-utils.test.ts
- FOUND: .planning/phases/08-crawl-depth-orphan-detection/08-01-SUMMARY.md
- FOUND: commit bbdc32a (Task 1)
- FOUND: commit f3c52ba (Task 2)
