---
phase: quick
plan: 260421-l3o
subsystem: graph-pagerank, useGraphAnalytics
tags: [pagerank, root-node, score-tier, bug-fix]
dependency_graph:
  requires: []
  provides: [root-node-pagerank-boost]
  affects: [score-tier-classification, health-panel-score-tier-section]
tech_stack:
  added: []
  patterns: [synthetic-inbound-injection, optional-parameter-backward-compatible]
key_files:
  created:
    - packages/web/src/lib/graph-pagerank.test.ts
  modified:
    - packages/web/src/lib/graph-pagerank.ts
    - packages/web/src/hooks/useGraphAnalytics.ts
decisions:
  - "Root node injection uses fixed linkCount=1 (no placement weighting) to mirror real-web convention that root is linked from everywhere"
  - "Guard: skip root injection if root is also global AND has effective placements (totalPlacementLinks > 0) to avoid double-counting"
  - "rootId memo moved above scores memo in useGraphAnalytics to satisfy dependency ordering before passing as useMemo dep"
metrics:
  duration: 5
  completed: 2026-04-21
  tasks: 2
  files: 3
---

# Quick Task 260421-l3o: Fix /zh-tw Root Node Classified as "Low" Score Tier

**One-liner:** Fixed PageRank bug where root node (/zh-tw) always received "low" score tier by injecting synthetic inbound from all non-root nodes into the root, mirroring global-node injection pattern.

## What Was Built

Root cause: `calculatePageRank` only injected synthetic inbound for global nodes with `totalPlacementLinks > 0`. A node that is both `isRoot` and `isGlobal` but has no placements was silently skipped. The `isRoot` flag was entirely absent from PageRank logic.

Fix: Added optional `rootId` parameter to `calculatePageRank`. After the existing global injection block, a new root injection block fires for every non-root node, adding a `linkCount=1` synthetic inbound edge pointing to the root. This ensures the root always accumulates meaningful rank, escaping the bottom 1/3 percentile threshold that marks a node "low".

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add rootId parameter + root injection to calculatePageRank + tests | 14ef6bc |
| 2 | Thread rootId into useGraphAnalytics and pass to calculatePageRank | 7357c37 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused makeEdge helper from test file to fix TS build error**
- **Found during:** Task 2 verification (pnpm build)
- **Issue:** graph-pagerank.test.ts defined `makeEdge` but never called it (all test cases use empty edges arrays); TypeScript emitted TS6133 error during `tsc -b`
- **Fix:** Removed `makeEdge` function and cleaned up import of `Edge` type (re-added since it's still used for typed empty array annotations)
- **Files modified:** packages/web/src/lib/graph-pagerank.test.ts
- **Commit:** 7357c37 (bundled with Task 2)

## Verification

- `pnpm --filter web test`: 386/386 tests pass across 21 test files
- `pnpm --filter web build`: TypeScript clean, Vite build succeeds (720 kB JS bundle)

## Self-Check: PASSED

- packages/web/src/lib/graph-pagerank.test.ts — exists
- packages/web/src/lib/graph-pagerank.ts — modified
- packages/web/src/hooks/useGraphAnalytics.ts — modified
- Commit 14ef6bc — exists
- Commit 7357c37 — exists
