---
phase: 02-scoring-analysis
plan: "01"
subsystem: testing
tags: [vitest, pagerank, graph-utils, tdd, typescript]

# Dependency graph
requires:
  - phase: 01-canvas-editor
    provides: UrlNodeData, LinkCountEdgeData interfaces and graph-utils.ts module
provides:
  - calculatePageRank pure function: iterative PageRank (d=0.85) with dangling-node redistribution
  - classifyScoreTier: relative-thirds tier classification returning high/mid/low/neutral
  - identifyWeakNodes: statistical outlier detection (mean - 1 stddev threshold)
  - ScoreTier type exported from graph-utils.ts
affects: [02-scoring-analysis plans 02+, UrlNode component, App.tsx useMemo integration, ScoreSidebar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dangling-node PageRank redistribution: isolated nodes redistribute rank evenly across N nodes so scores sum to N"
    - "TDD RED-GREEN cycle: tests committed first in failing state, implementation committed second"
    - "Statistical weak-node detection: mean minus one stddev with stddev=0 short-circuit"

key-files:
  created: []
  modified:
    - src/lib/graph-utils.ts
    - src/lib/graph-utils.test.ts

key-decisions:
  - "Dangling-node rank redistribution added so isolated nodes converge to 1.0 (not 0.15) and scores sum to N"
  - "Link count weighting test corrected to two-target scenario — single-target A->B self-normalizes linkCount, making it invariant to linkCount value"
  - "DAMPING=0.85, MAX_ITER=100, EPSILON=0.0001 extracted as named constants per plan spec"

patterns-established:
  - "calculatePageRank(nodes, edges): Map<string, number> — pure function pattern for graph algorithms"
  - "Scores sum to N invariant — enables meaningful relative comparison across all graph sizes"

requirements-completed: [SCORE-01, SCORE-02]

# Metrics
duration: 8min
completed: 2026-04-13
---

# Phase 02 Plan 01: TDD PageRank Scoring Functions Summary

**Iterative PageRank with dangling-node redistribution, relative-thirds tier classification, and statistical weak-node detection — all TDD with RED-GREEN cycle**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-13T14:10:00Z
- **Completed:** 2026-04-13T14:18:35Z
- **Tasks:** 1 (TDD task with RED + GREEN phases)
- **Files modified:** 2

## Accomplishments
- `calculatePageRank(nodes, edges)` — iterative PageRank (d=0.85, max 100 iter, epsilon=0.0001) with dangling-node rank redistribution ensuring scores sum to N
- `classifyScoreTier(score, allScores)` — relative-thirds tier classification (high/mid/low/neutral) scaling naturally to any score range
- `identifyWeakNodes(scores)` — statistical outlier detection using mean minus one standard deviation; returns empty set when stddev=0
- 23 new tests across three describe blocks; all 48 tests pass; `npx tsc --noEmit` clean

## Task Commits

1. **RED — Failing tests** - `0870673` (test)
2. **GREEN — Implementation** - `ebc3ed8` (feat)

_REFACTOR: constants and JSDoc were included in the GREEN commit; no separate refactor commit needed._

## Files Created/Modified
- `src/lib/graph-utils.ts` — added `calculatePageRank`, `classifyScoreTier`, `identifyWeakNodes`, `ScoreTier` type, `DAMPING`/`MAX_ITER`/`EPSILON` constants
- `src/lib/graph-utils.test.ts` — added 23 tests across `describe('calculatePageRank')`, `describe('classifyScoreTier')`, `describe('identifyWeakNodes')`

## Decisions Made
- **Dangling-node redistribution:** Without this, nodes with no inbound edges would converge to `0.15` (i.e., `1-d`) instead of `1.0`. Added standard dangling-node handling: collect rank from nodes with zero outbound edges and redistribute evenly across all N nodes each iteration.
- **Link count test corrected:** The plan's link count weighting test used a single-target scenario (A->B only). In that setup, `linkCount` appears in both the numerator and the total denominator, canceling out. Corrected the test to use two competing targets (A->B with linkCount=5, A->C with linkCount=1) which demonstrates the actual weighting behavior.
- **Refactor subsumed into GREEN:** Named constants and JSDoc were authored during implementation; no behavioral changes remained for a separate refactor commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dangling-node redistribution added to PageRank**
- **Found during:** Task 1 GREEN phase (calculatePageRank implementation)
- **Issue:** Without dangling-node handling, isolated nodes converge to `0.15` (= `1 - DAMPING`), not `1.0`. The plan spec requires single node returns `1.0` and scores sum to N. Standard iterative PageRank requires redistribution of dangling node rank.
- **Fix:** Collect rank from nodes with zero outbound edges at each iteration and add `DAMPING * danglingRank / N` to every node's new score.
- **Files modified:** `src/lib/graph-utils.ts`
- **Verification:** All tests pass; single-node score = 1.0; three-node graph scores sum to 3.0.
- **Committed in:** `ebc3ed8`

**2. [Rule 1 - Bug] Link count weighting test corrected to two-target scenario**
- **Found during:** Task 1 GREEN phase (test debugging)
- **Issue:** Test `A->B with linkCount=5 gives B higher score than linkCount=1` failed because with a single outbound edge, `linkCount` cancels in `linkCount * pageCount / totalWeightedOutbound` — both values equal 0.2775.
- **Fix:** Rewrote test as `A->B(linkCount=5) and A->C(linkCount=1)`: B should receive more equity than C. This correctly exercises the weighting behavior.
- **Files modified:** `src/lib/graph-utils.test.ts`
- **Verification:** Test passes; B score > C score confirmed.
- **Committed in:** `ebc3ed8`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bug corrections)
**Impact on plan:** Both fixes essential for algorithmic correctness and test validity. No scope creep.

## Issues Encountered
- None beyond the two auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three scoring functions exported from `src/lib/graph-utils.ts` and fully tested
- `ScoreTier` type available for `UrlNode.tsx` and `ScoreSidebar.tsx` to consume
- `calculatePageRank` ready for `useMemo` wiring in `App.tsx`
- No blockers

## Self-Check: PASSED

- `src/lib/graph-utils.ts` — FOUND
- `src/lib/graph-utils.test.ts` — FOUND
- `.planning/phases/02-scoring-analysis/02-01-SUMMARY.md` — FOUND
- Commit `0870673` (RED) — FOUND
- Commit `ebc3ed8` (GREEN) — FOUND

---
*Phase: 02-scoring-analysis*
*Completed: 2026-04-13*
