---
phase: quick-260420-lwu
plan: 01
subsystem: lib
tags: [refactor, graph-utils, code-organization, barrel-exports]
dependency_graph:
  requires: []
  provides: [graph-pagerank.ts, graph-analysis.ts, graph-io.ts]
  affects: [all 28 consumers of graph-utils via unchanged import paths]
tech_stack:
  added: []
  patterns: [barrel re-export, per-concern module split]
key_files:
  created:
    - packages/web/src/lib/graph-pagerank.ts
    - packages/web/src/lib/graph-analysis.ts
    - packages/web/src/lib/graph-io.ts
  modified:
    - packages/web/src/lib/graph-utils.ts
decisions:
  - barrel re-export pattern chosen so zero consumer files need modification
  - graph-pagerank.ts imports types-only from graph-utils.ts (no circular value imports)
  - graph-analysis.ts imports thresholds from graph-pagerank.ts (one-way dependency)
  - graph-io.ts imports thresholds from graph-pagerank.ts and types from graph-utils.ts
metrics:
  duration_minutes: 9
  completed_date: "2026-04-20"
  tasks_completed: 3
  files_modified: 4
---

# Quick Task 260420-lwu: Split graph-utils.ts into 4 focused modules

**One-liner:** Split 1032-line grab-bag graph-utils.ts into 4 focused modules (graph-pagerank, graph-analysis, graph-io) with barrel re-exports preserving all 28 consumer import paths.

## Before / After Line Counts

| File | Before | After |
|------|--------|-------|
| `packages/web/src/lib/graph-utils.ts` | 1032 | 134 |
| `packages/web/src/lib/graph-pagerank.ts` | — | 245 |
| `packages/web/src/lib/graph-analysis.ts` | — | 273 |
| `packages/web/src/lib/graph-io.ts` | — | 215 |

Total lines across all 4 files: ~867 (savings from removed duplication).

## Symbol Distribution

### graph-pagerank.ts
- Types: `ScoreTier`
- Constants (exported): `OUTBOUND_WARNING_THRESHOLD`, `DEPTH_WARNING_THRESHOLD`
- Constants (private): `DAMPING`, `MAX_ITER`, `EPSILON`, `CLUSTER_BONUS_FACTOR`
- Functions: `hasSameCluster`, `calculatePageRank`, `calculateOutboundLinks`, `classifyScoreTier`, `identifyWeakNodes`

### graph-analysis.ts
- Types: `HealthStatus`, `PlacementGroup`, `ClusterGroup`, `UrlTreeNode`
- Functions: `getHealthStatus`, `hasAnyWarning`, `buildTooltipContent`, `collectPlacementGroups`, `collectClusterGroups`, `calculateCrawlDepth`, `identifyOrphanNodes`, `collectPlacementSuggestions`, `collectClusterSuggestions`, `getConnectedElements`, `buildUrlTree`

### graph-io.ts
- Types: `CopyForAIInput`
- Constants: `HANDLE_IDS`
- Functions (public): `getClosestHandleIds`, `parseImportJson`, `buildCopyForAIText`
- Functions (private): `formatNodeLine`, `formatEdgeLine`

### graph-utils.ts (remains)
- Types: `Placement`, `UrlNodeData`, `LinkCountEdgeData`
- Functions: `resetNodeIdCounter`, `syncNodeIdCounter`, `createDefaultNode`, `updateNodeData`, `updateEdgeLinkCount`, `validateNodeData`, `validateLinkCount`, `formatPageCount`
- Barrel: `export * from "./graph-pagerank"`, `export * from "./graph-analysis"`, `export * from "./graph-io"`

## Consumer Files — No Changes Made

All 28 consumer files continue to import from `../lib/graph-utils` or `./lib/graph-utils` with zero source modifications. Spot-checked:

- `src/App.tsx` — unchanged
- `src/components/FilterPanel.tsx` — unchanged
- `src/components/ImportDialog.tsx` — unchanged
- `src/components/ScoreTierBadge.tsx` — unchanged

## Verification Results

- `pnpm --filter web type-check` — zero errors
- `pnpm --filter web test` (graph-utils.test.ts specifically) — 196 tests, all passed
- Full test suite: 376 passed, 6 pre-existing failures in `EditPopover.test.tsx` and `HealthPanel.test.tsx` (confirmed pre-existing by running against original code before changes)
- `pnpm --filter web lint` — 0 warnings, 0 errors
- `wc -l packages/web/src/lib/graph-utils.ts` — 134 lines (down from 1032)

## Deviations from Plan

**1. [Rule 3 - Blocking] classifyScoreTier and identifyWeakNodes straddled section boundary**

- **Found during:** Task 1
- **Issue:** In the original file, `classifyScoreTier` and `identifyWeakNodes` appeared after the `// Phase 11.1: PM Health Check` section divider but logically belong to graph-pagerank (they're pure scoring functions). The plan listed them as Section 3 (lines 130-489). After the Task 1 deletion removed only the lines up to the health-check divider, these two functions remained in graph-utils.ts still referencing `ScoreTier` which had moved.
- **Fix:** Explicitly deleted `classifyScoreTier` and `identifyWeakNodes` from graph-utils.ts after creating graph-pagerank.ts (they were already included in graph-pagerank.ts as planned).
- **Files modified:** `packages/web/src/lib/graph-utils.ts`
- **Commit:** 831b489

**2. Task commits merged into single commit**

- **Reason:** Tasks 1, 2, 3 have a sequential dependency — typecheck only passes once all three are done (graph-utils.ts sections reference symbols that are being moved). Making individual commits after each task would produce intermediate states with type errors.
- **Action:** Executed all three tasks, verified the complete split, then committed once.

## Known Stubs

None — this is a pure code-motion refactoring with no UI or data changes.

## Follow-up Opportunities

Consumers that frequently use only one module's symbols could update their imports to the more focused module path (e.g., `import { calculatePageRank } from "@/lib/graph-pagerank"` instead of `@/lib/graph-utils`). This is optional — the barrel re-export makes it unnecessary for correctness but would make dependencies more explicit per-file.

## Self-Check: PASSED

- `packages/web/src/lib/graph-pagerank.ts` exists: FOUND
- `packages/web/src/lib/graph-analysis.ts` exists: FOUND
- `packages/web/src/lib/graph-io.ts` exists: FOUND
- `packages/web/src/lib/graph-utils.ts` is 134 lines: CONFIRMED
- Commit 831b489: FOUND
