---
phase: 01-canvas-editor
plan: "01"
subsystem: canvas-ui
tags: [react-flow, nodes, sidebar, toolbar, drag-drop, edit-popover]
dependency_graph:
  requires: ["01-03"]
  provides: [UrlNode, EditPopover, Sidebar, Toolbar, canvas-interactions]
  affects: [App.tsx, src/components]
tech_stack:
  added: [lucide-react]
  patterns: [React Flow custom nodeTypes, drag-and-drop dataTransfer, click-outside popover, memo for performance]
key_files:
  created:
    - src/components/UrlNode.tsx
    - src/components/EditPopover.tsx
    - src/components/Sidebar.tsx
    - src/components/Toolbar.tsx
    - src/vite-env.d.ts
  modified:
    - src/App.tsx
    - vite.config.ts
decisions:
  - "AppNodeData interface extends UrlNodeData with onUpdate callback for EditPopover wiring without context API"
  - "nodeTypes object defined outside component to prevent React Flow infinite re-renders"
  - "updateNodeData from graph-utils used as single source of truth; no inline map logic in App.tsx"
metrics:
  duration_seconds: 217
  completed_date: "2026-04-13"
  tasks_completed: 2
  files_changed: 7
---

# Phase 1 Plan 01: URL Node Components and Canvas Interactions Summary

**One-liner:** White card URL template nodes with hover-pencil popover editor, sidebar drag-to-add, and toolbar button wired into React Flow canvas using graph-utils as single source of truth.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create UrlNode, EditPopover, Sidebar, Toolbar | 24a9415 | src/components/UrlNode.tsx, EditPopover.tsx, Sidebar.tsx, Toolbar.tsx |
| 2 | Wire components into App.tsx | 72429dc | src/App.tsx, src/vite-env.d.ts, vite.config.ts |

## What Was Built

**UrlNode.tsx** — Custom React Flow node rendered as a white card with:
- 4px indigo-500 left accent border (border-l-4 border-l-indigo-500)
- URL template as primary label (14px semibold, truncate)
- Page count via `formatPageCount()` from graph-utils (12px regular gray-500)
- Hover-only pencil icon (opacity-0 group-hover:opacity-100) with aria-label
- Source/target handles for edge connections
- EditPopover toggled by pencil icon click

**EditPopover.tsx** — Floating popover positioned right of node with:
- URL Template text input and Page Count number input
- Click-outside dismiss: saves if valid, shows inline error if URL template empty
- ESC key: discards and closes
- Validation: "URL template cannot be empty" shown below input in red-500
- stopPropagation prevents React Flow from interpreting popover clicks as canvas events

**Sidebar.tsx** — 240px left panel with draggable URL Node palette card using `dataTransfer.setData('application/reactflow', 'urlNode')`.

**Toolbar.tsx** — 48px top bar with "+ Add Node" button (indigo-500 background, lucide-react Plus icon).

**App.tsx** — Full layout shell:
- Flex-col layout: Toolbar (top) → Sidebar (left) + Canvas (flex-1)
- `nodeTypes = { urlNode: UrlNode }` defined outside component
- `createDefaultNode(position)` from graph-utils for node factory
- `updateNodeData(nds, nodeId, newData)` from graph-utils for state updates
- Sidebar drag-to-add via onDrop + screenToFlowPosition
- Toolbar add via onAddNode at viewport center
- `deleteKeyCode={['Backspace', 'Delete']}` for native React Flow deletion
- onConnect handler with addEdge for edge creation
- Empty state overlay with UI-SPEC copywriting

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing build errors prevented `npm run build` acceptance criterion**
- **Found during:** Task 2 verification
- **Issue:** `noUncheckedSideEffectImports: true` in tsconfig caused CSS import type errors; vite.config.ts used `defineConfig` from `vite` which doesn't include the `test` property type from vitest
- **Fix:** Added `src/vite-env.d.ts` with `/// <reference types="vite/client" />` for CSS type declarations; changed `vite.config.ts` to import `defineConfig` from `vitest/config` instead of `vite`
- **Files modified:** src/vite-env.d.ts (created), vite.config.ts
- **Commit:** 72429dc

**2. [Rule 2 - Type safety] Extended UrlNodeData for onUpdate callback without modifying graph-utils**
- **Found during:** Task 2 implementation
- **Issue:** Plan specified passing `onUpdate` through node data, but `UrlNodeData` interface from graph-utils only has `urlTemplate` and `pageCount`. Adding `onUpdate` to the graph-utils type would violate single-responsibility.
- **Fix:** Defined `AppNodeData extends UrlNodeData` in App.tsx with the `onUpdate` callback. Cast as needed when calling `updateNodeData`. This keeps graph-utils pure (data-only) while App.tsx manages UI callback wiring.
- **Files modified:** src/App.tsx

## Known Stubs

None — all node data is wired to live state. URL template and page count display real node data from `useNodesState`.

## Self-Check: PASSED

- [x] src/components/UrlNode.tsx exists
- [x] src/components/EditPopover.tsx exists
- [x] src/components/Sidebar.tsx exists
- [x] src/components/Toolbar.tsx exists
- [x] src/App.tsx modified with all required imports and interactions
- [x] Commit 24a9415 exists (Task 1)
- [x] Commit 72429dc exists (Task 2)
- [x] npx tsc --noEmit exits 0
- [x] npm run build exits 0
