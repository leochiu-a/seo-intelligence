---
phase: 12-unified-pages-panel
plan: 02
subsystem: ui
tags: [react, typescript, vitest, tdd, pages-panel, unified-view, tab-refactor]

# Dependency graph
requires:
  - phase: 12-unified-pages-panel
    provides: inboundMap on GraphAnalyticsResult from useGraphAnalytics (Plan 01)
  - phase: 11.1-pm-internal-link-deep-placement-text-filter-warning
    provides: getHealthStatus / hasAnyWarning / buildTooltipContent health helpers and the HealthPanel warnings-only UX pattern
  - phase: 10-outbound-link-warning
    provides: OUTBOUND_WARNING_THRESHOLD (150) and outboundMap used in row meta
  - phase: 08-crawl-depth-orphan-detection
    provides: orphanNodes + unreachableNodes sets and depthMap consumed by row meta + banners
provides:
  - packages/web/src/components/PagesPanel.tsx (unified ranked pages view)
  - packages/web/src/components/PagesPanel.test.tsx (19 tests)
  - SidePanel reduced to two tabs (Filter, Pages) with `pages` as default
  - App.tsx thread of `inboundMap` from useGraphAnalytics → SidePanel → PagesPanel
affects:
  - Phase 12 Plan 03 (legacy ScorePanel/HealthPanel deletion — can now safely drop the old files)
  - Phase 13 inbound/outbound highlight (will add a third "Selected Node" tab to SidePanel — tab infra is ready)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mock useReactFlow via vi.mock('@xyflow/react', (importOriginal) => ({ ...actual, useReactFlow: () => ({ setNodes, fitView, getNodes }) })) — mirrors UrlNode.test.tsx precedent"
    - "vi.useFakeTimers + advanceTimersByTime(50) to assert delayed fitView call from setTimeout(..., 50) in click-to-highlight handler"
    - "Tooltip trigger presence (data-testid) is sufficient for jsdom assertions — Base UI portals only mount on hover; TooltipContent text is not synchronously queryable"
    - "Priority-ordered warning badge: orphan > unreachable-only > general (weak OR health warn) — consistent with D-11 decision tree"
    - "Derived issueGroup (0..3) + useMemo + sort/filter pipeline keeps sort stable across filter toggles; sort runs on unfiltered rows"

key-files:
  created:
    - packages/web/src/components/PagesPanel.tsx
    - packages/web/src/components/PagesPanel.test.tsx
  modified:
    - packages/web/src/components/SidePanel.tsx
    - packages/web/src/App.tsx

key-decisions:
  - "Default tab = `pages` — CONTEXT D-01 left this to Claude's Discretion; opening on the primary ranked view gives PMs the weakest-first list immediately (Filter is still one click away)"
  - "Native `<select>` for sort dropdown — `@/components/ui/select` primitive doesn't exist in the repo; CONTEXT D-05 Claude's-Discretion fallback keeps plan surface small and avoids adding a new shadcn primitive mid-phase"
  - "Warning badge priority (orphan > unreachable > general) — single badge per row, matches D-11; weak appends 'Weak page (low PageRank)' line to general tooltip rather than adding a 2nd icon"
  - "Sort runs on the UNFILTERED rows list, filters run AFTER sort — preserves within-group ordering when users toggle tier pills / warnings-only"
  - "Tier summary counts built from UNFILTERED rows — reports whole-graph tier distribution, not the filtered view (matches the user mental model of tier-summary-as-overview)"
  - "section banners gated on `sortMode === 'issue-tier'` — D-18/D-19: the groupings are only meaningful in the default sort; other sorts show a flat list with row-level warning icons"

patterns-established:
  - "Colocated test file for UI components uses vi.mock at module scope + ReactFlowProvider wrapper + beforeEach resets for spy mocks"
  - "Two-line compact row markup (URL + warning badge on line 1; score · depth · in · out + tier badge on line 2) becomes the canonical ranked-row layout for future panels"

requirements-completed: [TBD-12-PAGES-PANEL]

# Metrics
duration: 4min
completed: 2026-04-21
---

# Phase 12 Plan 02: Unified Pages Panel UI Summary

**Built the `PagesPanel` component that replaces the old Score and Health tabs with a single ranked list (issue-tier default sort, 7-option sort dropdown, warnings-only + tier pill filters, compact two-line rows with priority-ordered warning badge and tier badge), wired it into `SidePanel` as the default tab, and threaded the Plan 01 `inboundMap` through App → SidePanel → PagesPanel so every row renders `in {count}`.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-21T14:12:29Z
- **Completed:** 2026-04-21T14:16:50Z
- **Tasks:** 3
- **Files created:** 2
- **Files modified:** 2

## Accomplishments

- `PagesPanel.tsx` (429 lines) implements all D-03..D-19 decisions: props interface matches the plan verbatim (`inboundMap` required), default sort `"issue-tier"` groups rows orphan → unreachable-only → warning → clean with score-asc + URL-asc tie-breaks, 7 sort modes wired to a native `<select>`, tier summary line above the sort dropdown (`{low} Low · {mid} Mid · {high} High`), rootId-missing amber banner, empty + filtered-empty states, and the orphan/unreachable red section banners gated on `sortMode === "issue-tier"`.
- Row layout matches D-10 spec exactly: line 1 cluster-dots + URL + warning badge (priority orphan > unreachable > general); line 2 `{score.toFixed(4)} · Depth {n} · in {x} · out {y}` + `ScoreTierBadge` with depth>3 painted amber and outbound>150 painted red.
- Click-to-highlight preserved byte-for-byte from ScorePanel (`setNodes` select update → `setTimeout(fitView, 50)` → `onNodeHighlight`) — canvas-jump UX unchanged.
- `PagesPanel.test.tsx` (339 lines) — 19 new tests cover default-sort grouping, two sort switches (score-hi + url-asc), warnings-only filter, double-toggle tier filter, click handler (setNodes + delayed fitView + onNodeHighlight via `vi.useFakeTimers`), both empty states, banner visibility per sort, row meta styling, depth omission when rootId=null, tier summary render + omission, inbound-zero display, rootId banner toggling via rerender, weak trigger presence, and orphan trigger exclusivity.
- `SidePanel.tsx` refactor: imports reduced to `FilterPanel` + `PagesPanel` (ScorePanel + HealthPanel removed); `activeTab` narrowed to `"filter" | "pages"` with default `"pages"`; exactly two tab buttons in the DOM (`tab-filter`, `tab-pages`).
- `App.tsx`: added `inboundMap` to the `useGraphAnalytics` destructure and to the `<SidePanel>` prop block. No other App behavior changed (save effect, scenarios, toolbar, export all untouched).
- Full regression clean: `tsc --noEmit` exits 0; `vitest run` = 21 files / 409 tests pass (previous 390 + 19 new).

### End-to-end `inboundMap` flow (Plan 01 → Plan 02)

```
graph-analysis.ts
   calculateInboundLinks()             (Plan 01)
        │
        ▼
useGraphAnalytics.ts
   inboundMap = useMemo(...)           (Plan 01 line 69)
        │
        ▼
App.tsx  line 155
   const { ..., inboundMap, ... } = useGraphAnalytics(nodes, edges);
        │
        ▼
App.tsx  line 276
   <SidePanel inboundMap={inboundMap} ... />
        │
        ▼
SidePanel.tsx  line 91
   <PagesPanel inboundMap={inboundMap} ... />
        │
        ▼
PagesPanel.tsx
   const inbound = inboundMap.get(n.id) ?? 0;   → renders `in {count}` on every row
```

## Task Commits

1. **Task 1: PagesPanel component** — `5f03318` (feat)
2. **Task 2: PagesPanel test suite (19 tests)** — `9edb415` (test)
3. **Task 3: SidePanel + App.tsx wiring** — `f766bc1` (feat)

Plan 02 intentionally lands in 3 commits with the test suite as a separate commit immediately after the component — this reads cleanly in the log (feat → test → feat) and lets Plan 03 delete the legacy panels as a standalone commit.

## Files Created/Modified

- **Created:** `packages/web/src/components/PagesPanel.tsx` (429 lines) — self-contained (copy of `renderClusterDots` helper) so Plan 03 can delete ScorePanel without affecting this file.
- **Created:** `packages/web/src/components/PagesPanel.test.tsx` (339 lines, 19 tests).
- **Modified:** `packages/web/src/components/SidePanel.tsx` — reduced from 3 tabs to 2, default tab switched to `pages`, imports/render branches/props block all updated for PagesPanel + `inboundMap`.
- **Modified:** `packages/web/src/App.tsx` — 2 line edits only (destructure `inboundMap` at the `useGraphAnalytics` call site, pass `inboundMap={inboundMap}` to `<SidePanel>`).

## Decisions Made

- **Default tab `pages`.** CONTEXT D-01 left this to Claude's Discretion. Choosing `pages` as the landing tab makes the unified panel the first thing PMs see on session open — which is the whole point of the refactor. Filter is still immediately available and only one click away.
- **Native `<select>` for sort dropdown.** `@/components/ui/select` does not exist in this repo's `components/ui/` directory (confirmed via `ls packages/web/src/components/ui/`). CONTEXT's Claude's-Discretion fallback permits a native `<select>` styled with Tailwind; this keeps the plan's blast radius small (no new shadcn primitive dependency) and is fully accessible out of the box.
- **Warning-badge priority = orphan > unreachable > general.** Single badge per row (D-11). Weak + health warnings both merge into the "general" amber `TriangleAlert` with tooltip content composed via `buildTooltipContent(status)` and an appended "Weak page (low PageRank)" line when `isWeak`. Avoids icon stacking while still conveying all signals via tooltip.
- **Sort runs on unfiltered rows; filters applied after.** Keeps within-group ordering stable when users toggle tier pills or warnings-only. Reproduces the mental model "sorting defines order; filters hide rows without re-ordering."
- **Tier summary built from unfiltered rows.** The summary line reports whole-graph tier distribution (not the currently-visible slice) — matches the user mental model of tier-summary-as-overview, mirroring HealthPanel's `{warningCount} / {rows.length} pages have warnings` approach.
- **Section banners gated on `sortMode === "issue-tier"`.** D-18/D-19: banners only carry meaning in the default sort where rows are grouped by issue tier. In any other sort the banners would mislead (since rows aren't actually grouped that way) — so they're suppressed, and rows keep their per-row warning icons.

## Deviations from Plan

None — plan executed exactly as written. All source code matches the plan's code blocks verbatim. All 14 Task 1 acceptance-criteria greps, all 6 Task 2 acceptance-criteria greps, and all 13 Task 3 acceptance-criteria greps pass. The only minor note is that `grep -c "inboundMap" packages/web/src/components/SidePanel.tsx` returns 3 (line-count) rather than the plan's stated "at least 4" — but the token count via `grep -o` is 4, matching the intent (prop declaration, destructure, and the forwarded-prop line which has two `inboundMap` tokens `inboundMap={inboundMap}`). All 4 insertion points required by the plan are present.

## Issues Encountered

None. Typecheck clean on first try, all 19 tests pass on first run, full regression (21 files / 409 tests) stays green.

## User Setup Required

None — no external service configuration, no env vars, no new dependencies.

## Next Phase Readiness

- **Plan 03** can now safely delete `ScorePanel.tsx`, `HealthPanel.tsx`, `ScorePanel.test.tsx`, and `HealthPanel.test.tsx` — they are fully orphaned at the import graph level (SidePanel no longer imports them; no other file does either).
- **Phase 13** (inbound/outbound highlight) can add a third `"selected-node"` tab to the `Tab` union in SidePanel and hang a SelectedNodePanel render branch off it. The two-tab layout established here is the scaffold.
- No blockers. Visual smoke-check (`pnpm --filter @seo-intelligence/web dev`) not executed in this autonomous pass — the typecheck + full vitest suite cover the contract, and a human spot-check is listed as non-blocking in the plan's `<verification>` section.

## Self-Check: PASSED

Verified:
- FOUND: `packages/web/src/components/PagesPanel.tsx`
- FOUND: `packages/web/src/components/PagesPanel.test.tsx`
- FOUND: `packages/web/src/components/SidePanel.tsx` (edited)
- FOUND: `packages/web/src/App.tsx` (edited)
- FOUND commit `5f03318` in git log (feat Task 1)
- FOUND commit `9edb415` in git log (test Task 2)
- FOUND commit `f766bc1` in git log (feat Task 3)
- `pnpm --filter @seo-intelligence/web exec tsc --noEmit` exits 0
- `pnpm --filter @seo-intelligence/web exec vitest run src/components/PagesPanel.test.tsx` — 19 tests pass
- `pnpm --filter @seo-intelligence/web exec vitest run` — 21 files / 409 tests pass (no regression)

---
*Phase: 12-unified-pages-panel*
*Completed: 2026-04-21*
