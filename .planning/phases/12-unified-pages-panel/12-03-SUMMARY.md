---
phase: 12-unified-pages-panel
plan: 03
subsystem: ui
tags: [react, typescript, vitest, cleanup, deletion, pages-panel]

# Dependency graph
requires:
  - phase: 12-unified-pages-panel
    provides: SidePanel no longer imports ScorePanel/HealthPanel (Plan 02)
  - phase: 12-unified-pages-panel
    provides: buildTooltipContent exported from graph-analysis.ts (pre-existing, used by re-homed tests)
provides:
  - packages/web/src/lib/graph-utils.test.ts updated with describe("buildTooltipContent") block (6 tests re-homed)
  - Legacy ScorePanel.tsx / HealthPanel.tsx / HealthPanel.test.tsx removed from disk
affects:
  - Phase 13 (inbound/outbound highlight) — cleaner file tree; no dead code to navigate around
  - Any future grep for ScorePanel/HealthPanel under packages/web/src/ returns zero matches

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function tests relocated from UI-component test file to the module where the function lives — uncouples coverage from component lifecycle"
    - "Pre-flight grep gate + post-delete grep gate on both sides of `rm` — prevents dangling imports surviving a bulk deletion"

key-files:
  created: []
  modified:
    - packages/web/src/lib/graph-utils.test.ts
  deleted:
    - packages/web/src/components/ScorePanel.tsx
    - packages/web/src/components/HealthPanel.tsx
    - packages/web/src/components/HealthPanel.test.tsx

key-decisions:
  - "Re-home only the buildTooltipContent block (lines 290-320 of HealthPanel.test.tsx); the other HealthPanel UI tests are tied to the deleted component's rendering and have no pure-function equivalent to re-home"
  - "ScorePanel.test.tsx listed in CONTEXT D-22 was never on disk — no action required; plan deletes only files that exist"
  - "Deletion as a separate atomic commit (chore type) keeps the diff pure-subtraction and trivially revertable alongside Plan 02's wiring"

patterns-established:
  - "Deletion plans split into (a) re-home pure-function coverage, then (b) delete old files — gives the log a reviewable (test add) → (rm) shape"

requirements-completed: [TBD-12-CLEANUP]

# Metrics
duration: 2min
completed: 2026-04-21
---

# Phase 12 Plan 03: Delete Legacy Score/Health Panels Summary

**Re-homed the 6 `buildTooltipContent` tests from `HealthPanel.test.tsx:290-320` into `graph-utils.test.ts` (co-located with their `./graph-analysis` implementation), then deleted the three now-orphaned legacy files: `ScorePanel.tsx`, `HealthPanel.tsx`, and `HealthPanel.test.tsx`. The diff is pure subtraction plus one additive test block; typecheck clean; full vitest suite green.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-21T14:20:05Z
- **Completed:** 2026-04-21T14:21:52Z
- **Tasks:** 2
- **Files modified:** 1 (graph-utils.test.ts)
- **Files deleted:** 3

## Accomplishments

- `graph-utils.test.ts` gained `buildTooltipContent` to the existing `./graph-analysis` destructured import, and a new `describe("buildTooltipContent", ...)` block with all 6 tests copied verbatim from `HealthPanel.test.tsx:290-320`. Tests assert exact tooltip strings for links/depth/tags warn branches, multi-issue newline joining, the all-ok empty-string case, and the depth=na no-warning case. Block appended at the end of the file after `describe("buildCopyForAIText", ...)`.
- `packages/web/src/lib/graph-utils.test.ts` goes from 204 → 210 tests (+6); total vitest regression: 20 files / 394 tests pass (was 21/409 pre-delete; delete removes HealthPanel.test.tsx's 21 tests and graph-utils gains 6 re-homed tests).
- Three files deleted: `ScorePanel.tsx` (~340 LOC), `HealthPanel.tsx` (~260 LOC), `HealthPanel.test.tsx` (~320 LOC) — total 736 deletions.
- All 4 residual-import grep gates return zero matches under `packages/web/src/`: `from.*ScorePanel`, `from.*HealthPanel`, `import.*ScorePanel`, `import.*HealthPanel`.
- `grep -rn "ScorePanel\|HealthPanel" packages/web/src/` — zero matches. The refactor is complete in the source tree.
- `pnpm --filter @seo-intelligence/web exec tsc --noEmit` exits 0.
- `pnpm --filter @seo-intelligence/web exec vitest run` — 20 files / 394 tests pass.

## Note on ScorePanel.test.tsx

CONTEXT D-22 listed `ScorePanel.test.tsx` for deletion, but a pre-flight `ls packages/web/src/components/ScorePanel*` on 2026-04-21 (before any `rm`) confirmed the file has never been committed to the repo — only `ScorePanel.tsx` exists. The plan (lines 40 + 248-252) anticipated this and explicitly instructed the executor to verify and skip any attempt to delete a non-existent file. No action was required for `ScorePanel.test.tsx`.

## Re-homed Test Block

- **Source:** `packages/web/src/components/HealthPanel.test.tsx` lines 290-320 (6 tests in a `describe("buildTooltipContent", ...)` block).
- **New location:** end of `packages/web/src/lib/graph-utils.test.ts` (after `describe("buildCopyForAIText", ...)`).
- **Import added:** `buildTooltipContent` appended to the existing `./graph-analysis` destructured import (line 20-34 block), alongside `getHealthStatus`, `hasAnyWarning`, and `HealthStatus`.
- **Count:** 6 tests, byte-for-byte identical to the deleted source block.

## Final Residual-Reference Check

```
$ grep -rn "ScorePanel\|HealthPanel" packages/web/src/
(no output — exit=1, i.e. zero matches)
```

## Task Commits

1. **Task 1: Re-home buildTooltipContent tests** — `5f97705` (test)
2. **Task 2: Delete ScorePanel.tsx, HealthPanel.tsx, HealthPanel.test.tsx** — `7b51e5f` (chore)

Commit shape (test add → rm) matches the plan's intended review pattern: coverage preserved first, then the old files removed in a pure-subtraction commit.

## Files Created/Modified/Deleted

- **Modified:** `packages/web/src/lib/graph-utils.test.ts` — +33 lines (1-line import extension + 32-line describe block). No existing code touched.
- **Deleted:** `packages/web/src/components/ScorePanel.tsx` (~340 LOC)
- **Deleted:** `packages/web/src/components/HealthPanel.tsx` (~260 LOC)
- **Deleted:** `packages/web/src/components/HealthPanel.test.tsx` (~320 LOC, includes the 6 re-homed tests)

## Decisions Made

- **Re-home only `buildTooltipContent` block.** The rest of `HealthPanel.test.tsx` exercised the React component's rendering (warnings-only toggle, summary line, Score Tier section, sort order). Those behaviors are now covered by `PagesPanel.test.tsx` (Plan 02) for the new UI, and the old-component tests have no pure-function equivalent to re-home. Only the `buildTooltipContent` block tests a pure helper from `graph-analysis.ts` that still exists and is still used by `PagesPanel.tsx` — hence it alone is migrated.
- **Acknowledge CONTEXT D-22 drift without deleting a non-existent file.** The plan's pre-flight check (`ls packages/web/src/components/ScorePanel.test.tsx`) returned "No such file or directory". Per the plan's explicit instruction (lines 248-252) and Rule 3 / Rule 4 boundary, no action was taken. The CONTEXT listing was outdated documentation, not a live file.
- **Stage deletions individually.** Only `packages/web/src/components/{ScorePanel.tsx, HealthPanel.tsx, HealthPanel.test.tsx}` were staged for the Task 2 commit. Pre-existing workspace noise (`.planning/phases/12-anchor-text-type/*`, untracked PLAN.md files, `fixture-kkday.json`, `review.json`) was not included — staying strictly within plan scope.

## Deviations from Plan

None — plan executed exactly as written. All pre-flight checks passed on first run; all acceptance-criteria greps returned expected counts; typecheck and vitest suite green after deletion. The plan explicitly anticipated the ScorePanel.test.tsx non-existence (Step 1 Check d) — following that instruction is plan-conforming, not a deviation.

## Issues Encountered

None. Typecheck clean on first run; vitest suite green on first run; zero residual references on first grep.

## User Setup Required

None — no external services, no env vars, no new dependencies.

## Next Phase Readiness

- Phase 12 is now complete: Plan 01 added `calculateInboundLinks` + `inboundMap`; Plan 02 built `PagesPanel` and wired it through SidePanel + App; Plan 03 removed the legacy panels.
- **Phase 13** (inbound/outbound highlight) can proceed cleanly — no legacy Score/Health components to work around. The two-tab SidePanel (`filter`, `pages`) established in Plan 02 is the scaffold onto which Phase 13 will hang a third `selected-node` tab.
- No blockers; no deferred issues.

## Self-Check: PASSED

Verified:
- MISSING (intentional): `packages/web/src/components/ScorePanel.tsx` (deleted)
- MISSING (intentional): `packages/web/src/components/HealthPanel.tsx` (deleted)
- MISSING (intentional): `packages/web/src/components/HealthPanel.test.tsx` (deleted)
- FOUND: `packages/web/src/lib/graph-utils.test.ts` (modified; contains `describe("buildTooltipContent"` exactly once)
- FOUND commit `5f97705` in git log (test Task 1)
- FOUND commit `7b51e5f` in git log (chore Task 2)
- `pnpm --filter @seo-intelligence/web exec tsc --noEmit` exits 0
- `pnpm --filter @seo-intelligence/web exec vitest run` — 20 files / 394 tests pass
- `grep -rn "ScorePanel\|HealthPanel" packages/web/src/` returns zero matches

---
*Phase: 12-unified-pages-panel*
*Completed: 2026-04-21*
