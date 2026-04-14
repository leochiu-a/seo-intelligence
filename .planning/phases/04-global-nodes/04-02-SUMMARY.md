---
phase: 04-global-nodes
plan: 02
subsystem: ui
tags: [react, lucide, vitest, testing-library, global-nodes, placement-crud]

requires:
  - phase: 04-global-nodes
    plan: 01
    provides: Placement interface, extended UrlNodeData with isGlobal/placements, calculatePageRank with synthetic injection

provides:
  - EditPopover global toggle switch with aria role=switch
  - EditPopover placement CRUD UI (add/rename/delete)
  - UrlNode Globe badge for isGlobal=true nodes
  - App.tsx serialization/restore/export with isGlobal and placements fields
  - EditPopover.test.tsx: 7 behavioral tests for placement CRUD
  - UrlNode.test.tsx: 2 behavioral tests for Globe badge

affects: [scoring sidebar updates (automatic via existing useMemo), localStorage persistence, JSON export]

tech-stack:
  added: []
  patterns:
    - "Conditional spread for optional fields: ...(isGlobal && { isGlobal }) keeps false/undefined absent from serialized output"
    - "Popover width responsive to state: w-[280px] default, w-[320px] when global is toggled on"
    - "ReactFlowProvider wrapper in UrlNode tests to satisfy ReactFlow context requirement"

key-files:
  created: []
  modified:
    - src/components/EditPopover.tsx
    - src/components/EditPopover.test.tsx
    - src/components/UrlNode.tsx
    - src/components/UrlNode.test.tsx
    - src/App.tsx

key-decisions:
  - "EditPopover widens to 320px only when global is active — saves space for non-global nodes"
  - "Placements section hidden when global is off even if placement data exists — matches algorithm behavior (isGlobal checked before placements processed)"
  - "Globe badge uses same flex wrapper as tier badge so both can coexist without layout issues"
  - "App.tsx export and serialize use conditional spread so non-global nodes produce clean JSON without isGlobal:false noise"

metrics:
  duration: "2 min"
  completed: "2026-04-14"
  tasks: 2
  files_modified: 5
---

# Phase 04 Plan 02: Global Nodes — UI Layer Summary

**Global toggle switch and placement CRUD in EditPopover, Globe badge on UrlNode, and full isGlobal/placements persistence/export in App.tsx with behavioral tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T22:49:00Z
- **Completed:** 2026-04-14T22:51:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `EditPopover` expanded with `isGlobal` boolean prop and `placements: Placement[]` prop
- `onSave` signature extended to `(urlTemplate, pageCount, isGlobal, placements)` — passes all 4 fields
- Global toggle rendered as `role="switch"` button with animated pill style (blue-600 when on)
- Placements section (add/rename/delete rows) only visible when `localIsGlobal` is true
- Popover widens from 280px to 320px when global is active
- `+ Add Placement` button creates rows with `crypto.randomUUID()` IDs
- Delete button has `aria-label="Delete placement {name}"` for accessibility
- `EditPopover.test.tsx`: 7 behavioral tests — toggle, placements visibility, add/rename/delete, onSave call signature
- `UrlNode` imports `Globe` from lucide-react and `Placement` type
- `handleSave` updated to accept and forward `isGlobal` and `placements` to `data.onUpdate`
- Globe badge (`bg-blue-100 text-blue-700`) renders in shared flex wrapper with tier badge when `data.isGlobal=true`
- `EditPopover` in UrlNode JSX now passes `isGlobal={data.isGlobal ?? false}` and `placements={data.placements ?? []}`
- `UrlNode.test.tsx`: 2 behavioral tests — Globe badge present when `isGlobal=true`, absent when `false`/`undefined`
- `App.tsx` imports `Placement` type and uses conditional spread in `serializeGraph`, restore useEffect, and `onExportJson`
- Scores and sidebar update immediately when global state changes (automatic via existing `calculatePageRank` useMemo)

## Task Commits

Each task committed atomically:

1. **Task 1: EditPopover global toggle + placement CRUD** — `445db9f`
2. **Task 2: UrlNode Globe badge + App.tsx serialization** — `276b9c2`

## Files Created/Modified

- `src/components/EditPopover.tsx` — Global toggle switch, placements section CRUD, 4-arg onSave
- `src/components/EditPopover.test.tsx` — 7 behavioral tests for placement CRUD and toggle
- `src/components/UrlNode.tsx` — Globe badge, updated handleSave, isGlobal/placements props to EditPopover
- `src/components/UrlNode.test.tsx` — 2 behavioral tests for Globe badge rendering
- `src/App.tsx` — Placement import, serializeGraph/restore/onExportJson updated with global fields

## Decisions Made

- **Popover width dynamic:** 280px → 320px when global on; avoids wasting space for the common non-global case
- **Placements section hidden when global off:** Even if placement data exists in node, section not shown. Matches algorithm: placements only used when `isGlobal=true`
- **Badge flex wrapper:** Both tier badge and Globe badge share one `flex` container with `gap-1` — clean layout whether one or both badges present
- **Conditional spread in exports:** `...(isGlobal && { isGlobal })` omits key from JSON for non-global nodes, avoiding `isGlobal: false` noise in exported files

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all data is wired. isGlobal and placements flow from EditPopover → UrlNode → graph-utils → calculatePageRank → ScoreSidebar.

## Self-Check: PASSED

- `src/components/EditPopover.tsx` — FOUND
- `src/components/EditPopover.test.tsx` — FOUND
- `src/components/UrlNode.tsx` — FOUND
- `src/components/UrlNode.test.tsx` — FOUND
- `src/App.tsx` — FOUND
- Commit `445db9f` — FOUND
- Commit `276b9c2` — FOUND
- All 125 tests passing

---
*Phase: 04-global-nodes*
*Completed: 2026-04-14*
