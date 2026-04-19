---
phase: quick-260419-uje
plan: 01
subsystem: ui

tags: [react, vitest, tdd, health-panel, score-tier, percentile]

# Dependency graph
requires:
  - phase: quick-260419-snh
    provides: classifyScoreTier percentile classifier (frozen signature)
  - phase: 11.1-pm-internal-link-deep-placement-text-filter-warning
    provides: HealthPanel with warnings list + "Show warnings only" checkbox
provides:
  - HealthPanel "Score Tier" section surfacing Low + Mid pages alongside warnings
  - SidePanel prop allScoreValues plumbed from App.tsx to HealthPanel
affects: [Phase 11.2 (Health tab guidance UX), any future HealthPanel feature]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tierRows memo (classifyScoreTier + low/mid filter + low→mid alpha sort) rendered as a gated secondary section, independent of the warnings-only state"
    - "Section gating via tierRows.length > 0 to hide both header and list when no scores are computed or all nodes classify neutral — matches existing 'hide empty state clutter' pattern in HealthPanel"

key-files:
  created: []
  modified:
    - packages/web/src/components/HealthPanel.tsx
    - packages/web/src/components/HealthPanel.test.tsx
    - packages/web/src/components/SidePanel.tsx
    - packages/web/src/App.tsx

key-decisions:
  - "Added a separate 'Score Tier' section inside HealthPanel (rejected: tier filter on the existing rows, separate panel). The warnings list answers 'what is broken', the tier section answers 'what is weak' — different questions, different UX."
  - "Score Tier section is orthogonal to 'Show warnings only' — that checkbox continues to gate only the warnings list (per plan truth #4)."
  - "Badge colors mirror UrlNode TONE_MAP (low=red-100/red-700, mid=amber-100/amber-700) so the tier vocabulary is consistent across canvas node, ScoreSidebar, and HealthPanel."
  - "Sort low→mid first, then alphabetical by urlTemplate within each tier — lowest-ranked pages (most work needed) surface first."
  - "Section renders nothing when allScoreValues is empty OR when classifyScoreTier returns only 'neutral' (the tierRows filter naturally collapses to [])."

patterns-established:
  - "HealthPanel composes multiple independent sections (warnings list, Score Tier) each with its own gating and sort logic, separated by border-t dividers — future sections can follow the same composition."

requirements-completed: [UJE-01]

# Metrics
duration: ~10 min
completed: 2026-04-19
---

# Quick Task 260419-uje: Health Panel Low/Mid Score Tier Section Summary

**Surfaces Low & Mid percentile-ranked pages in the Health tab as a dedicated section below the existing warnings list, wired through SidePanel → App.tsx → useGraphAnalytics' allScoreValues.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-19T22:03:58Z (baseline test run)
- **Completed:** 2026-04-19T22:08:30Z (GREEN commit + verify)
- **Tasks:** 1 executed (Task 1 — auto, tdd=true); Task 2 is a checkpoint:human-verify gate awaiting user verification
- **Files modified:** 4

## Accomplishments

- `HealthPanel` now renders a "Score Tier" section listing every page whose classifier returns `low` or `mid`, with a red (Low) or amber (Mid) pill mirroring the canvas/sidebar TONE_MAP.
- Section is gated on `tierRows.length > 0` — hidden cleanly when no scores are computed or the graph degenerates to `neutral` (single node, all-equal scores).
- The "Show warnings only" checkbox retains its existing scope: it filters the warnings list only, never the Score Tier section.
- `SidePanel` forwards `allScoreValues` alongside the already-present `scores` prop; `App.tsx` supplies it from `useGraphAnalytics`.
- Sort order: low before mid, then alphabetical by `urlTemplate` within each tier — surfaces the most-work-needed rows first.

## Task Commits

TDD executed with separate RED and GREEN commits:

1. **RED — `test(web): add failing tests for Health Panel Low/Mid score tier section`** — `8718e1c`
   - 6 new tests under `HealthPanel — Score Tier section`
   - Updated the 9 existing `HealthPanel` render calls with the new required props (`scores={new Map()}` / `allScoreValues={[]}`) so the existing tests still compile and produce identical behavior (no tier section renders under empty allScoreValues)

2. **GREEN — `feat(web): render Low & Mid pages in Health Panel score tier section`** — `e14b695`
   - HealthPanel: new props (`scores`, `allScoreValues`), `tierRows` memo (classify + filter + sort), gated section JSX
   - SidePanel: new prop `allScoreValues`, forwarded to HealthPanel
   - App.tsx: pass `allScoreValues` to `<SidePanel>` (already destructured from `useGraphAnalytics`)

_No REFACTOR commit — implementation was already minimal/clean._

## Files Created/Modified

- `packages/web/src/components/HealthPanel.tsx` — Added `scores` + `allScoreValues` props, `tierRows` memo using `classifyScoreTier`, and the new Score Tier section JSX with tier-colored badges. Imports now include `classifyScoreTier` and `ScoreTier` type.
- `packages/web/src/components/HealthPanel.test.tsx` — Updated 9 existing render calls to include new required props (no behavioral change under empty scores), added 6 new tests covering the Score Tier section (visibility, independence from warnings-only toggle, sort order, attention-count summary, hidden-on-neutral, hidden-on-empty).
- `packages/web/src/components/SidePanel.tsx` — Added `allScoreValues: number[]` to `SidePanelProps`, destructured it, and forwarded it to the HealthPanel call site.
- `packages/web/src/App.tsx` — Added `allScoreValues={allScoreValues}` to the `<SidePanel>` JSX (the value was already destructured from `useGraphAnalytics`).

## Decisions Made

- **Separate section over filter.** Rejected adding a tier filter to the warnings list because it would conflate two different questions (broken vs. weak) and overlap with the existing warnings-only toggle. Separate section keeps both concerns atomic, per plan-level design decision.
- **Badge colors reuse `TONE_MAP`.** `bg-red-100 text-red-700` for Low and `bg-amber-100 text-amber-700` for Mid — identical to UrlNode.tsx's tier pill. No new tokens introduced.
- **Sort low→mid first.** Lowest-priority pages surface before mid, so the attention list is pre-prioritized. Within each tier: alphabetical by `urlTemplate`.
- **No click handler.** Rows are read-only, matching the existing HealthPanel row behavior ("rows do NOT respond to click" test).

## Deviations from Plan

None — plan executed exactly as written. All steps of the `<action>` block (prop extension, memo, section markup, SidePanel plumb, App.tsx wiring, existing-test update, 6 new tests) mapped 1:1 to the implementation. Classifier signature left untouched as instructed (260419-snh frozen).

## Issues Encountered

- `pnpm --filter web tsc --noEmit` is not a defined script in `packages/web/package.json`. Ran `pnpm --filter web exec tsc --noEmit` instead — exit 0, no errors.
- `pnpm test -- --run HealthPanel.test.tsx` doesn't filter files because vitest swallows the arg. Ran `pnpm --filter web exec vitest run HealthPanel.test.tsx` to run the single file — 21/21 pass.

These are environment/command shape quirks, not test or code issues.

## Automated Verification (all passing)

- `pnpm --filter web exec vitest run HealthPanel.test.tsx` → **21 passed** (9 original HealthPanel + 6 buildTooltipContent + 6 new Score Tier section)
- `pnpm --filter web exec tsc --noEmit` → **exit 0, no type errors**
- `pnpm --filter web lint` → **0 warnings, 0 errors** (oxlint, 61 files, 93 rules)
- Full web suite: **367 passed / 5 failed**. The 5 failures are identical to the pre-existing EditPopover + ScoreSidebar failures documented in 260419-snh SUMMARY — **no regressions introduced**. Gain of +6 tests matches the 6 new HealthPanel tests exactly.

## Known Stubs

None. The new props (`scores`, `allScoreValues`) are threaded from real data in `useGraphAnalytics` through App.tsx → SidePanel → HealthPanel. The `tierRows` memo uses the actual `classifyScoreTier` implementation.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

- **Task 2 (checkpoint:human-verify)** in this plan is still pending. The orchestrator should prompt the user to run `pnpm --filter web dev`, open the Health tab with a multi-tier fixture (e.g. `fixture-kkday.json`), and confirm the 6 visual checks enumerated in the plan (`<how-to-verify>`).
- Implementation is complete — no follow-up coding needed if visual verification passes.
- Deferred concern: the existing `EditPopover` + `ScoreSidebar` test failures remain pre-existing and are out of scope for this task.

## Self-Check: PASSED

- `packages/web/src/components/HealthPanel.tsx` — **FOUND**
- `packages/web/src/components/HealthPanel.test.tsx` — **FOUND**
- `packages/web/src/components/SidePanel.tsx` — **FOUND**
- `packages/web/src/App.tsx` — **FOUND**
- Commit `8718e1c` (test/RED) — **FOUND**
- Commit `e14b695` (feat/GREEN) — **FOUND**

---
*Phase: quick-260419-uje*
*Completed: 2026-04-19*
