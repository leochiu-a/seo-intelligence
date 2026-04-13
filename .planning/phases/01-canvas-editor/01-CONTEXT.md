# Phase 1: Canvas Editor - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a fully interactive canvas where users can build a directed graph of URL template nodes and edges. Scope: node and edge creation, editing (URL template + page count + link count), selection, movement, and deletion. Pan/zoom is already working from Phase 0.

New capabilities like score visualization, sidebar, scenario management, and export are NOT in scope — those belong to Phases 2 and 3.

</domain>

<decisions>
## Implementation Decisions

### Node Visual Design
- **D-01:** Node shape is a **white card** with **rounded corners** and a **colored left accent border** — n8n node style.
- **D-02:** URL template string is the **primary/prominent label**; page count is displayed below it as secondary info.
- **D-03:** Default new node values: URL template = `/page/<id>`, page count = `1`.
- **D-04:** Left accent border color is static in Phase 1 (e.g. blue/indigo); Phase 2 will use it for score-level coloring.

### Inline Editing UX
- **D-05:** A **pencil icon** appears in the **top-right corner** of the node on hover. Clicking it opens a floating popover.
- **D-06:** The edit popover contains **two fields only**: URL template (text input) and page count (number input).
- **D-07:** Clicking outside the popover dismisses it and saves changes.

### Node Creation
- **D-08:** Primary creation method: **drag from a left sidebar palette** — a narrow panel on the left with a single draggable "URL Node" card.
- **D-09:** Secondary creation method: **toolbar button** (e.g. "+ Add Node" at top) — adds a node at canvas center. Helps discoverability.
- **D-10:** Node deletion: **select + Delete/Backspace key** (React Flow native `onNodesDelete`).

### Edge Label & Editing
- **D-11:** Link count is displayed as a **label in the middle of the edge line** (React Flow built-in label support).
- **D-12:** Editing link count: **click the edge label directly** — it becomes an inline number input. Confirm by pressing Enter or clicking away.
- **D-13:** Edge creation: **drag from a node handle** (React Flow native connection handles appear on node hover).
- **D-14:** Edge deletion: **select edge + Delete/Backspace key** (React Flow native `onEdgesDelete`).

### Claude's Discretion
- Edge style (straight, bezier, step) — use React Flow default (bezier/smoothstep)
- Sidebar palette exact dimensions and styling — keep consistent with n8n-style aesthetic
- Popover positioning (above/below/beside node) — position to avoid canvas edge clipping
- Connection handle position (top/bottom/left/right of node) — use React Flow defaults
- Exact Tailwind color values for left accent border — use indigo-500 or similar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — CANVAS-01~05, NODE-01~03, EDGE-01~02 are all in scope for Phase 1

### Existing Codebase
- `src/App.tsx` — current React Flow shell; Phase 1 builds on this directly
- `src/index.css` — Tailwind directives already set up

No external specs — requirements fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ReactFlow` with `useNodesState`/`useEdgesState` — already wired in App.tsx; Phase 1 extends this
- `Background`, `Controls`, `MiniMap` — already rendered; keep as-is
- Tailwind CSS — fully configured; use utility classes for all styling

### Established Patterns
- React Flow v11 API — use `nodeTypes` prop to register custom node, `edgeTypes` for custom edge
- State lives in App.tsx via `useNodesState`/`useEdgesState` — keep for Phase 1, no external store needed
- No existing component directory — Phase 1 creates `src/components/` for the first time

### Integration Points
- `App.tsx` — add `nodeTypes`, `edgeTypes`, `onConnect`, `onDrop`, `onDragOver`, sidebar and toolbar render
- New files expected: `src/components/UrlNode.tsx`, `src/components/EditPopover.tsx`, `src/components/Sidebar.tsx`, `src/components/Toolbar.tsx`, `src/components/LinkCountEdge.tsx`

</code_context>

<specifics>
## Specific Ideas

- Node style reference: **n8n node** — white card, rounded corners, colored left accent border (see n8n.io canvas for visual reference)
- Pencil icon should only appear on **hover** to keep nodes visually clean when idle
- Edge label inline edit: clicking the number label turns it into an `<input type="number">` — Enter or blur saves

</specifics>

<deferred>
## Deferred Ideas

None — all discussed items are within Phase 1 scope.

</deferred>

---

*Phase: 01-canvas-editor*
*Context gathered: 2026-04-13 via /gsd:discuss-phase*
