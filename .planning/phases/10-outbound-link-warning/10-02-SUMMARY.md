---
phase: 10-outbound-link-warning
plan: 02
subsystem: canvas-ui
tags: [react, vitest, tdd, ui-wiring, subtitle-indicator, sidebar-inline]

# Dependency graph
requires:
  - phase: 10-outbound-link-warning
    plan: 01
    provides: calculateOutboundLinks pure function and OUTBOUND_WARNING_THRESHOLD=150 exports in graph-utils.ts
  - phase: 08-crawl-depth-orphan-detection
    plan: 02
    provides: enrichedNodes + subtitle-line + ScoreSidebar inline pattern; UrlNodeExtendedData extension precedent
provides:
  - App.tsx outboundMap useMemo + outboundCount/isOverLinked threaded through enrichedNodes
  - UrlNode.tsx red TriangleAlert + `{count} links` subtitle indicator (coexists with orphan/weak/depth)
  - ScoreSidebar.tsx inline `{count} links` span on main ranked list with conditional red-500
  - JSON export payload extended with outboundMap (Object.fromEntries mirror of depthMap)
affects: [packages/web/src/App.tsx, packages/web/src/components/UrlNode.tsx, packages/web/src/components/ScoreSidebar.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UI-layer pattern: consume pure-function outputs via useMemo, thread derived fields through enrichedNodes, pass Map<string, number> to sidebar as required prop"
    - "Subtitle indicator coexistence: over-linked appended last in chain per D-09 (orphan/unreachable → weak → depth → over-linked)"
    - "Conditional-red styling pattern: className={isOver ? 'text-red-500' : ''} inline on span — always visible, threshold-gated color"

key-files:
  created: []
  modified:
    - packages/web/src/App.tsx
    - packages/web/src/components/UrlNode.tsx
    - packages/web/src/components/UrlNode.test.tsx
    - packages/web/src/components/ScoreSidebar.tsx
    - packages/web/src/components/ScoreSidebar.test.tsx

key-decisions:
  - "Included outboundMap in JSON export payload (mirror of depthMap precedent) — PLAN output spec explicitly authorized this as Claude's discretion, matches 'debugging parity' with existing depth/score exports."
  - "UrlNode over-linked branch has NO orphan/unreachable/weak exclusions (unlike weak/unreachable branches which mutually exclude each other) — D-09 specifies over-linked COEXISTS with all other indicators as the last entry in the subtitle chain."
  - "ScoreSidebar outboundMap prop is REQUIRED (not optional) — forces App.tsx call site to always supply it, mirrors how depthMap is a required prop even when empty; test file default supplies `new Map()` for the size===0 branch."

requirements-completed: [OUTBOUND-02, OUTBOUND-03]

# Metrics
duration: 3min
completed: 2026-04-17
---

# Phase 10 Plan 02: Outbound-link UI wiring Summary

**Thread `outboundMap` through `App.tsx` → `enrichedNodes` → `UrlNode` subtitle (red TriangleAlert + `{count} links`), and through `ScoreSidebar` as a required prop rendering inline `{count} links` with conditional `text-red-500` above threshold 150.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-17T07:20:16Z
- **Completed:** 2026-04-17T07:23:32Z
- **Tasks:** 3 (one per integration point)
- **Files modified:** 5

## Accomplishments

- `App.tsx` imports `calculateOutboundLinks` + `OUTBOUND_WARNING_THRESHOLD`, computes `outboundMap` via `useMemo`, threads `outboundCount` + `isOverLinked` into `enrichedNodes`, passes `outboundMap={outboundMap}` to `<ScoreSidebar>`, and adds `outboundMap: Object.fromEntries(outboundMap)` to the JSON export payload.
- `UrlNode.tsx` extends `UrlNodeExtendedData` with `outboundCount?: number` + `isOverLinked?: boolean` and renders red `TriangleAlert` (size 11, `text-red-500`, `aria-label="Over-linked page"`) + `{data.outboundCount} links` span as the LAST item in the subtitle chain (after depth), coexisting with orphan/unreachable/weak/depth per D-09.
- `ScoreSidebar.tsx` adds required `outboundMap: Map<string, number>` to `ScoreSidebarProps`, imports `OUTBOUND_WARNING_THRESHOLD`, and renders an inline IIFE-produced span `· {outbound} links` on every main-ranked-list score line, applying `text-red-500` only when `outbound > OUTBOUND_WARNING_THRESHOLD` (D-11 always-visible with conditional red; D-12 no dedicated section).
- Unit tests added: 2 in `UrlNode.test.tsx` (over-linked true/false branches), 2 in `ScoreSidebar.test.tsx` (under-threshold muted, over-threshold red).
- All 211 Vitest tests pass (up from 207); `pnpm tsc --noEmit` exits 0.

## Task Commits

Each task was committed atomically with readable subsystem scopes (per user CLAUDE.md rule, avoiding meaningless numeric scopes like `10-02`):

1. **Task 1: App.tsx outboundMap threading** — `dd03dc3` — `feat(app): compute outboundMap and thread through enrichedNodes + ScoreSidebar`
2. **Task 2: UrlNode over-linked subtitle indicator** — `e71fa9e` — `feat(urlnode): add over-linked red indicator to subtitle`
3. **Task 3: ScoreSidebar inline outbound count with conditional red** — `5f4285c` — `feat(sidebar): add inline outbound count with conditional red to main ranked list`

## Files Created/Modified

- `packages/web/src/App.tsx` — +30 / -4 lines. Added `calculateOutboundLinks` + `OUTBOUND_WARNING_THRESHOLD` imports, `outboundCount`/`isOverLinked` fields on `AppNodeData`, `outboundMap` useMemo (line 418-422), enrichedNodes extension with outbound fields + equality check, `outboundMap` prop on `<ScoreSidebar>`, and JSON export payload entry.
- `packages/web/src/components/UrlNode.tsx` — +10 / -1 lines. Added `outboundCount?: number` + `isOverLinked?: boolean` to `UrlNodeExtendedData`; appended red over-linked branch as last child of the subtitle flex div. Reused the existing `TriangleAlert` import (no duplicate).
- `packages/web/src/components/UrlNode.test.tsx` — +26 / -1 lines. Extended `TestNodeData` and `renderNode` cast with optional `outboundCount` + `isOverLinked`; added two test cases.
- `packages/web/src/components/ScoreSidebar.tsx` — +18 / -2 lines. Added `OUTBOUND_WARNING_THRESHOLD` import, required `outboundMap` prop, destructured param, and outbound IIFE appended after the existing depth IIFE in the main ranked list.
- `packages/web/src/components/ScoreSidebar.test.tsx` — +20 / -2 lines. Added `outboundMap` parameter to `renderSidebar` helper (defaults to `new Map()`) and passed it through to the component; added two new test cases asserting presence of `50 links` (no red class) and `200 links` (with `text-red-500` class).

## Integration Points (Exact Edits)

### App.tsx — outboundMap useMemo (lines 418-422)
```tsx
// Compute total outbound links per node (explicit edges + implicit global contribution).
// Global source nodes contribute 0 implicit per Phase 4 D-01 parity.
const outboundMap = useMemo(
  () => calculateOutboundLinks(nodes, edges),
  [nodes, edges],
);
```

Enriched-node equality check extended to include `outboundCount` and `isOverLinked`; memo dep array: `[nodes, scores, weakNodes, allScoreValues, orphanNodes, unreachableNodes, depthMap, outboundMap]`.

### UrlNode.tsx — subtitle branch (appended last, after depth branch)
```tsx
{data.isOverLinked && typeof data.outboundCount === 'number' && (
  <>
    <span>·</span>
    <TriangleAlert size={11} className="text-red-500" aria-label="Over-linked page" />
    <span className="text-red-500">{data.outboundCount} links</span>
  </>
)}
```

Coexistence position: placed LAST in the flex row — no `!isOrphan` / `!isUnreachable` exclusions. Per D-09 over-linked is an orthogonal signal (outbound load) that stacks with reachability/strength indicators.

### ScoreSidebar.tsx — main ranked list IIFE (appended after depth IIFE)
```tsx
{outboundMap.size > 0 && (() => {
  const outbound = outboundMap.get(item.id);
  if (outbound == null) return null;
  const isOver = outbound > OUTBOUND_WARNING_THRESHOLD;
  return (
    <>
      {' · '}
      <span className={isOver ? 'text-red-500' : ''}>
        {outbound} links
      </span>
    </>
  );
})()}
```

## Decisions Made

- **Included `outboundMap` in JSON export payload** — mirrors the `depthMap: Object.fromEntries(depthMap)` precedent. The plan output spec explicitly flagged this as Claude's discretion ("D-Claude discretion: yes, mirrors depthMap precedent"). Provides debugging parity with existing scored/depth exports.
- **`outboundMap` prop is required (not optional)** — matches `depthMap`'s existing required shape. Forces the App.tsx call site to always supply it; test file default supplies `new Map()` for the empty/`size === 0` branch. This is a type-level guarantee that the UI always has the data, not a hidden nullable.
- **No exclusion flags on over-linked subtitle branch** — unlike weak/unreachable which mutually exclude each other in the chain, over-linked coexists with every other indicator per D-09. A node can legitimately be orphan AND over-linked simultaneously (an isolated page that still links out to 200 templates).
- **Commit scopes `feat(app)` / `feat(urlnode)` / `feat(sidebar)`** — user's global CLAUDE.md prohibits numeric scopes like `feat(10-02): ...` (low signal). Readable subsystem scopes give the log meaningful grep targets.

## Deviations from Plan

None — plan executed exactly as written. The only micro-deviation is commit-scope naming (plan suggested `feat(phase-10):`, actually used subsystem-level `feat(app)` / `feat(urlnode)` / `feat(sidebar)` per user CLAUDE.md commit-scope rule — same rationale applied in Plan 10-01's deviation note).

## Issues Encountered

- None. RED phase confirmed failing (Task 2: 1/6 fail; Task 3: 2/31 fail). GREEN phase passed on first implementation attempt. No auto-fix cycles.

## User Setup Required

None — purely internal code + tests; no new dependencies, no env vars, no external services.

## Verification Results

- `cd packages/web && pnpm test --run` → **211 tests passed** (10 test files) — includes 6 new tests from this plan (2 UrlNode + 2 ScoreSidebar + 2 updated sidebar helper paths) plus all 205 pre-existing tests.
- `cd packages/web && pnpm tsc --noEmit` → exits 0, no TypeScript errors.
- Grep verification: `calculateOutboundLinks(nodes, edges)`, `const outboundMap = useMemo(`, `outboundCount > OUTBOUND_WARNING_THRESHOLD`, `outboundMap={outboundMap}`, `outboundMap: Object.fromEntries(outboundMap)` all present in `App.tsx`. `aria-label="Over-linked page"`, `{data.outboundCount} links`, twin `text-red-500` references present in `UrlNode.tsx`. `outbound > OUTBOUND_WARNING_THRESHOLD`, `{outbound} links`, `className={isOver ? 'text-red-500' : ''}` present in `ScoreSidebar.tsx`.

## Next Phase Readiness

- **Phase 10 complete** (both plans). OUTBOUND-01 (Plan 10-01), OUTBOUND-02 + OUTBOUND-03 (this plan) satisfied.
- **Ready for phase transition** via `/gsd:transition` — all v2.0 SEO Analysis Depth requirements now validated:
  - DEPTH-01..05 (Phase 8)
  - ORPHAN-01..03 (Phase 8)
  - SCENE-01..03 (Phase 9)
  - OUTBOUND-01..03 (Phase 10)
- **No blockers.** Outstanding v2.0 items SCENE-04/SCENE-05 (side-by-side scenario diff) remain in a future phase per Phase 9's scope cap.

## Self-Check: PASSED

- FOUND: packages/web/src/App.tsx (lines 39-40 import `calculateOutboundLinks` + `OUTBOUND_WARNING_THRESHOLD`; line 419 `const outboundMap = useMemo(`; line 434 `outboundCount > OUTBOUND_WARNING_THRESHOLD`; line 647 `outboundMap={outboundMap}`; line 530 `outboundMap: Object.fromEntries(outboundMap)`)
- FOUND: packages/web/src/components/UrlNode.tsx (lines 19-20 `outboundCount?` + `isOverLinked?`; aria-label="Over-linked page" appended last in subtitle chain)
- FOUND: packages/web/src/components/UrlNode.test.tsx (2 new test cases `renders red TriangleAlert ...` and `does NOT render the over-linked indicator ...`)
- FOUND: packages/web/src/components/ScoreSidebar.tsx (line 6 imports `OUTBOUND_WARNING_THRESHOLD`; `outboundMap: Map<string, number>` in props; outbound IIFE in main ranked list)
- FOUND: packages/web/src/components/ScoreSidebar.test.tsx (renderSidebar helper signature extended with `outboundMap` default; 2 new test cases)
- FOUND: commit dd03dc3 (Task 1 — app)
- FOUND: commit e71fa9e (Task 2 — urlnode)
- FOUND: commit 5f4285c (Task 3 — sidebar)
- FOUND: `pnpm test --run` → 211/211 pass
- FOUND: `pnpm tsc --noEmit` → exit 0

---
*Phase: 10-outbound-link-warning*
*Completed: 2026-04-17*
