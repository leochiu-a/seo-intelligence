---
phase: quick-260419-snh
plan: 01
subsystem: scoring / legend
tags: [scoring, percentile, tier, legend-dialog, graph-utils]
dependency_graph:
  requires: []
  provides: [percentile-score-tier-classification, relative-ranking-copy-in-legend-dialog]
  affects: [useGraphAnalytics, buildCopyForAIText, LegendDialog, all canvas node tier badges]
tech_stack:
  added: []
  patterns: [rank-based percentile split with Math.ceil top-heavy tie-break]
key_files:
  created: []
  modified:
    - packages/web/src/lib/graph-utils.ts
    - packages/web/src/lib/graph-utils.test.ts
    - packages/web/src/components/LegendDialog.tsx
decisions:
  - "Math.ceil for high-cutoff index gives top-heavy tie-break on uneven n — user intuition aligns with 'generous top third'"
  - "Tie-to-high bias via >= comparisons at cutoff values — ties don't arbitrarily split across tiers"
  - "Signature (score: number, allScores: number[]) => ScoreTier preserved unchanged — all callers (useGraphAnalytics, buildCopyForAIText) unaffected"
  - "JSDoc perf note added for future O(N² log N) optimization opportunity — not fixed now (out of scope)"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-19"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 3
---

# Quick Task 260419-snh: Percentile Score Tier + Landing Dialog Summary

**One-liner:** Percentile rank-based score tier classification (Math.ceil top-heavy split) replaces linear min-max thirds, preventing outlier nodes from compressing all others to Low; LegendDialog updated to explain relative ranking.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Rewrite classifyScoreTier as percentile-based + update tests | f45e558 | graph-utils.ts, graph-utils.test.ts |
| 2 | Update LegendDialog Score Tiers copy to explain relative ranking | a73294f | LegendDialog.tsx |
| 3 | Visual verification (human-verify checkpoint) | — | Stopped here per plan |

## What Was Built

### Task 1: Percentile Score Tier Classification

**Problem:** The old linear min-max thirds implementation compressed all nodes to "Low" whenever one extreme outlier (e.g., a global node with 357k pages) dominated the score range.

**New algorithm:**
```
sorted = [...allScores].sort((a, b) => a - b)
highCutoffIdx = n - Math.ceil(n / 3)   // e.g. n=9 → 6, n=4 → 2
midCutoffIdx  = n - Math.ceil(2n / 3)  // e.g. n=9 → 3, n=4 → 1
highThreshold = sorted[highCutoffIdx]
midThreshold  = sorted[midCutoffIdx]
score >= highThreshold → "high"; score >= midThreshold → "mid"; else → "low"
```

- Edge cases preserved: `allScores.length <= 1` → "neutral"; `min === max` → "neutral"
- Tie-to-high bias: all scores equal to a cutoff value land in the higher tier
- For n=4 (uneven): 2 high / 1 mid / 1 low (top gets extra slot)

**Tests added:**
- Test A: 12-node outlier case (100 + eleven values between 1–2.0) — confirms balanced distribution
- Test B: n=9 exact 3/3/3 split
- Test C: ties bias to high (5,5,5,1,1,1 → all fives are high, all ones are low)
- Test E: n=2 degenerate case (1 high / 1 low, no mid)
- Test F: n=4 produces 2 high / 1 mid / 1 low

### Task 2: LegendDialog Copy Update

Updated the Score Tiers section to:
- Add a new paragraph explicitly calling the rating a "relative ranking"
- State that "Low" only means bottom third of *this* graph, not absolute page quality
- Mention outlier effect on ranking
- Update three tier description strings: "Top/Middle/Bottom ~1/3 of nodes by score"

## Deviations from Plan

None — plan executed exactly as written.

Pre-existing failures in EditPopover.test.tsx (5 tests) and TypeScript build errors in useScenarioHandlers.test.ts were confirmed to exist before this plan's changes and are out of scope.

## Known Stubs

None.

## Self-Check: PASSED

- packages/web/src/lib/graph-utils.ts — exists and contains new percentile implementation
- packages/web/src/lib/graph-utils.test.ts — exists and contains Tests A, B, C, E, F
- packages/web/src/components/LegendDialog.tsx — exists and contains "relative ranking" copy
- Commit f45e558 — verified in git log
- Commit a73294f — verified in git log
- graph-utils.test.ts: 186/186 tests pass
- Lint: 0 warnings, 0 errors
