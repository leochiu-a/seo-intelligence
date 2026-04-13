---
phase: 03-scenarios-export
plan: 02
subsystem: ui
tags: [react, typescript, file-download, blob, lucide-react]

# Dependency graph
requires:
  - phase: 03-scenarios-export
    plan: 01
    provides: localStorage persistence; nodes, edges, scores available in AppInner
  - phase: 02-scoring-analysis
    provides: calculatePageRank scores useMemo; AppInner component structure
  - phase: 01-canvas-editor
    provides: UrlNodeData, LinkCountEdgeData interfaces; Toolbar component
provides:
  - onExportJson useCallback downloading seo-planner-export.json with nodes/edges/scores
  - onExportCsv useCallback downloading seo-planner-scores.csv sorted by score desc
  - Toolbar updated with Export JSON and Export CSV secondary buttons, disabled on empty canvas
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Blob + URL.createObjectURL + <a> click pattern for browser file download without server"
    - "Export buttons as secondary style (white/border) to distinguish from primary indigo action button"
    - "isEmpty prop from nodes.length === 0 — single source of truth for disabled state in Toolbar"

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/components/Toolbar.tsx

key-decisions:
  - "URL templates in CSV wrapped in double-quotes always (handles commas in templates safely)"
  - "Export callbacks read directly from nodes, edges, scores useMemo — no additional computation needed"
  - "Tasks 1 and 2 committed atomically since Toolbar type error makes them mutually dependent"

patterns-established:
  - "Blob download pattern: new Blob([content], {type}), URL.createObjectURL, <a> click, URL.revokeObjectURL"

requirements-completed: [EXPORT-01, EXPORT-02]

# Metrics
duration: 5min
completed: 2026-04-13
---

# Phase 3 Plan 02: JSON and CSV Export Buttons Summary

**JSON + CSV export via Blob download: toolbar gets Export JSON (nodes/edges/scores) and Export CSV (score ranking) buttons, disabled on empty canvas**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-13T14:50:00Z
- **Completed:** 2026-04-13T14:55:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `onExportJson` useCallback in AppInner: builds `{nodes, edges, scores}` object and triggers download of `seo-planner-export.json`
- Added `onExportCsv` useCallback in AppInner: sorts nodes by PageRank score descending, builds CSV with `url_template,page_count,score` columns (4dp), downloads `seo-planner-scores.csv`
- Updated Toolbar with `ToolbarProps` interface accepting `onExportJson`, `onExportCsv`, `isEmpty`; added two secondary-styled export buttons on right side using `ml-auto`
- Export buttons show `Download` icon from lucide-react, are disabled (opacity-50 + cursor-not-allowed) when canvas is empty

## Task Commits

Both tasks committed atomically (mutually dependent — Toolbar type check requires App.tsx props to be present):

1. **Task 1 + Task 2: Export handlers in App.tsx + Export buttons in Toolbar.tsx** - `f4f9122` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/App.tsx` - Added `LinkCountEdgeData` import; added `onExportJson` and `onExportCsv` useCallbacks; updated `<Toolbar>` JSX to pass new props
- `src/components/Toolbar.tsx` - Added `ToolbarProps` interface; added `Download` icon import from lucide-react; added two secondary export buttons on right side with `ml-auto` layout

## Decisions Made

- Committed both tasks in a single atomic commit — Toolbar's TypeScript type requires `onExportJson`/`onExportCsv` props, so App.tsx and Toolbar.tsx must be consistent in the same commit
- URL templates in CSV are always double-quoted (handles edge case where template contains a comma), with internal `"` escaped as `""`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 complete: localStorage persistence (03-01) + JSON/CSV export (03-02) both shipped
- EXPORT-01 and EXPORT-02 requirements fulfilled
- Ready for Phase 4 or project verification

---
*Phase: 03-scenarios-export*
*Completed: 2026-04-13*
