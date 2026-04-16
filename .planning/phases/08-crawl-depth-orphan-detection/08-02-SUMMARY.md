---
phase: 08-crawl-depth-orphan-detection
plan: 02
subsystem: ui
tags: [crawl-depth, orphan-detection, root-toggle, edit-popover, url-node, score-sidebar, app-wiring]

# Dependency graph
requires:
  - phase: 08-crawl-depth-orphan-detection plan 01
    provides: calculateCrawlDepth, identifyOrphanNodes, isRoot on UrlNodeData
provides:
  - Root toggle in EditPopover (exclusive, violet bg-violet-600)
  - Root badge on UrlNode (violet Home icon)
  - Orphan/unreachable/depth indicators on UrlNode subtitle
  - ScoreSidebar orphan section, unreachable section, depth per row, root prompt
  - App.tsx crawl depth computation, orphan detection, root state management
  - localStorage persistence of isRoot
  - JSON export includes isRoot and depthMap
affects:
  - Phase 09 (Scenario Diff) — root state now tracked, depth map available

# Tech tracking
tech-stack:
  added: []
  patterns:
    - onRootToggle as exclusive callback — one root at a time via setNodes map with clear-others logic
    - Separate callback for root toggle (not through onSave) — root is exclusive state, not node data field
    - useMemo chain: rootId -> depthMap -> orphanNodes -> unreachableNodes -> enrichedNodes
    - Depth Infinity = unreachable (not orphan) distinction propagated through enrichedNodes

key-files:
  created: []
  modified:
    - src/components/EditPopover.tsx
    - src/components/UrlNode.tsx
    - src/components/ScoreSidebar.tsx
    - src/App.tsx
    - src/lib/graph-utils.ts
    - src/components/EditPopover.test.tsx
    - src/components/ScoreSidebar.test.tsx

key-decisions:
  - "Root toggle uses separate onRootToggle callback (not onSave) so exclusive-root logic runs immediately in App.tsx without waiting for Confirm"
  - "unreachableNodes derived from depthMap (Infinity entries) rather than a separate function call — keeps orphan and unreachable concepts distinct"
  - "Weak indicator suppressed when isOrphan or isUnreachable — most severe status wins in subtitle display priority"

requirements-completed:
  - DEPTH-02
  - DEPTH-03
  - DEPTH-04
  - ORPHAN-02
  - ORPHAN-03

# Metrics
duration: 12min
completed: 2026-04-16
---

# Phase 08 Plan 02: Crawl Depth & Orphan Detection UI Wiring Summary

**Full UI wiring for crawl depth and orphan detection — EditPopover root toggle, UrlNode badges/indicators, ScoreSidebar sections, and App.tsx computation with localStorage + export support. All 174 tests passing.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-16T13:14:05Z (approx)
- **Completed:** 2026-04-16T13:26:18Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- **EditPopover.tsx:** Added `isRoot: boolean` prop and `onRootToggle: (nodeId: string) => void` callback. Root toggle uses separate callback (not onSave) so exclusive-root logic is handled atomically in App.tsx. Violet toggle (`bg-violet-600`) placed above Global Node toggle with "Root (Homepage)" label.
- **UrlNode.tsx:** Extended `UrlNodeExtendedData` with `isOrphan`, `isUnreachable`, `crawlDepth`, `onRootToggle`. Added Root badge (violet Home icon, `bg-violet-100 text-violet-700`). Added subtitle indicators: Orphan (red Unplug), Unreachable (red Unplug), Depth >3 (amber Layers). Priority: Orphan > Unreachable > Depth warning > Weak. Badge row condition updated to include `isRoot`.
- **ScoreSidebar.tsx:** Added `orphanNodes`, `unreachableNodes`, `depthMap`, `rootId` props. Root prompt shown at top when no root set. Orphan Pages section (red header) appears above Unreachable section, both above Score Ranking. Main ranked list filters out orphan/unreachable nodes to avoid duplication. Depth display in score line with amber ⚠ for depth >3.
- **App.tsx:** Imported `calculateCrawlDepth` and `identifyOrphanNodes`. Added `onRootToggle` callback clearing all other nodes' `isRoot`. Added `rootId`, `depthMap`, `orphanNodes`, `unreachableNodes` useMemo chain. Enriched nodes include new fields. `onRootToggle` wired into addNode, handleImportFromDialog, onDrop, localStorage restore. `serializeGraph` and localStorage restore both handle `isRoot`. `onExportJson` exports `isRoot` and `depthMap`.
- **graph-utils.ts:** `parseImportJson` handles `isRoot` field in imported JSON.
- **Test fixes (Rule 1):** Updated `EditPopover.test.tsx` defaultProps with `isRoot`/`onRootToggle`, disambiguated `getByRole('switch')` to `getAllByRole('switch')[1]` for Global Node toggle. Updated `ScoreSidebar.test.tsx` `renderSidebar` helper with default empty values for new required props.

## Task Commits

Each task was committed atomically:

1. **Task 1: EditPopover root toggle + UrlNode root badge and depth/orphan indicators** - `f221331` (feat)
2. **Task 2: ScoreSidebar orphan/unreachable sections + depth display** - `c7b3283` (feat)
3. **Task 3: App.tsx wiring — depth computation, orphan detection, root state, localStorage, export** - `7231917` (feat)

## Files Created/Modified

- `src/components/EditPopover.tsx` — Added isRoot prop, onRootToggle callback, Root (Homepage) toggle switch
- `src/components/UrlNode.tsx` — Extended interface with new fields, added Root badge, orphan/unreachable/depth indicators
- `src/components/ScoreSidebar.tsx` — Added 4 new props, orphan section, unreachable section, depth display, root prompt
- `src/App.tsx` — Full wiring: root state, depth computation, orphan detection, localStorage, export
- `src/lib/graph-utils.ts` — parseImportJson handles isRoot field
- `src/components/EditPopover.test.tsx` — Updated defaultProps, fixed switch disambiguation
- `src/components/ScoreSidebar.test.tsx` — Updated renderSidebar helper with new required props

## Decisions Made

- Root toggle uses `onRootToggle` as a separate callback from `onSave` — the exclusive-one-root logic must run immediately when the user clicks the toggle, not when they hit Confirm. This also means `isRoot` is read-only in EditPopover (the prop reflects current state, the callback fires the change).
- `unreachableNodes` derived from `depthMap` Infinity entries rather than a separate `identifyOrphanNodes`-style call — keeps the distinction clear: orphan = zero inbound (structural), unreachable = no path from root (reachability). Both sets are needed separately for the sidebar sections.
- Weak indicator suppressed when `isOrphan` or `isUnreachable` — the most severe status wins. An orphan page is already a critical SEO problem; showing "Weak" in addition would be noise.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated EditPopover tests to handle two switch buttons**
- **Found during:** Task 3 (verification)
- **Issue:** EditPopover now has two `role="switch"` buttons (Root and Global Node). Existing tests used `getByRole('switch')` which throws "multiple elements found" error.
- **Fix:** Added `isRoot: false` and `onRootToggle: vi.fn()` to defaultProps. Changed `getByRole('switch')` to `getAllByRole('switch')[1]` (Global Node is second, Root is first).
- **Files modified:** src/components/EditPopover.test.tsx
- **Commit:** 7231917

**2. [Rule 1 - Bug] Updated ScoreSidebar tests to pass new required props**
- **Found during:** Task 3 (verification)
- **Issue:** Existing `renderSidebar` helper called `<ScoreSidebar>` without `orphanNodes`, `unreachableNodes`, `depthMap`, `rootId` props — caused `orphanNodes.has is not a function` runtime error in tests.
- **Fix:** Extended `renderSidebar` helper signature with optional parameters defaulting to empty Set/Map/null.
- **Files modified:** src/components/ScoreSidebar.test.tsx
- **Commit:** 7231917

---

**Total deviations:** 2 auto-fixed (Rule 1 — test compatibility with new props)
**Impact on plan:** No scope creep. Tests updated to match new API; existing test coverage maintained (174 tests all passing).

## Known Stubs

None — all features fully wired. Root toggle, depth display, orphan/unreachable sections, and localStorage persistence are all functional.

## Self-Check: PASSED

- FOUND: src/components/EditPopover.tsx
- FOUND: src/components/UrlNode.tsx
- FOUND: src/components/ScoreSidebar.tsx
- FOUND: src/App.tsx
- FOUND: src/lib/graph-utils.ts
- TypeScript: 0 errors
- Tests: 174/174 passing
