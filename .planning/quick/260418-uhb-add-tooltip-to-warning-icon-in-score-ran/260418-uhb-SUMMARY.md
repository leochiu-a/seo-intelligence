---
phase: quick
plan: 260418-uhb
subsystem: score-sidebar
tags: [tooltip, ux, weak-nodes, score-ranking]
dependency_graph:
  requires: []
  provides: [score-sidebar-weak-tooltip]
  affects: [ScoreSidebar]
tech_stack:
  added: []
  patterns: [base-ui-tooltip, tooltip-trigger-pattern]
key_files:
  created: []
  modified:
    - packages/web/src/components/ScoreSidebar.tsx
    - packages/web/src/components/ScoreSidebar.test.tsx
decisions:
  - getByText portal assertion removed — Base UI Tooltip renders content lazily into portal only on open; trigger presence assertion used as primary regression guard instead
metrics:
  duration: 5min
  completed: 2026-04-18
  tasks: 1
  files: 2
---

# Quick Task 260418-uhb: Add Tooltip to Weak-Page Warning Icon in Score Ranking

**One-liner:** Wrapped TriangleAlert weak-node icon in Base UI Tooltip with explanatory copy using proven HealthPanel pattern, gated by `stopPropagation` to avoid accidental fitView on click.

## Files Changed

| File | Change |
|------|--------|
| `packages/web/src/components/ScoreSidebar.tsx` | Added `Tooltip`/`TooltipTrigger`/`TooltipContent` import; wrapped weak-node `TriangleAlert` in tooltip with `data-testid="score-weak-warning"` and `stopPropagation` click handler |
| `packages/web/src/components/ScoreSidebar.test.tsx` | Added 2 new tests: tooltip trigger present for weak nodes, tooltip trigger absent for non-weak nodes |

## Final Tooltip Copy

```
This page's PageRank score is significantly below average (below mean − 1σ). Consider adding more inbound internal links to strengthen it.
```

## Test Results

| Metric | Before | After |
|--------|--------|-------|
| ScoreSidebar tests | 21 passed | 23 passed (+2 new) |
| Existing `getByLabelText('Weak page')` | passing | still passing |
| Pre-existing EditPopover failures | 4 failed | 4 failed (unrelated, not caused by this change) |

## Commits

| Hash | Message |
|------|---------|
| 21901e0 | feat(score-sidebar): add tooltip explaining weak-page warning icon |

## Deviations from Plan

### Auto-adapted: getByText portal assertion

- **Found during:** GREEN phase (test run)
- **Issue:** `screen.getByText(/below average/i)` failed because Base UI Tooltip renders content into a `<TooltipPrimitive.Portal>` only when the tooltip is open (after hover/focus). In JSDOM test environment without user interaction, the content is not yet in the DOM.
- **Fix:** Per plan's own fallback note ("delete the `getByText` line and keep only the trigger assertion"), replaced the `getByText` assertion with a comment explaining the portal behavior and kept only the `getByTestId('score-weak-warning')` assertion as the primary regression guard.
- **Files modified:** `packages/web/src/components/ScoreSidebar.test.tsx`

## Self-Check

- [x] `packages/web/src/components/ScoreSidebar.tsx` exists and contains `Tooltip`
- [x] `packages/web/src/components/ScoreSidebar.test.tsx` exists and contains `score-weak-warning` testid assertions
- [x] Commit 21901e0 exists in git log
- [x] All ScoreSidebar tests pass (23/23)
- [x] Pre-existing `getByLabelText('Weak page')` assertion still passes

## Self-Check: PASSED
