# Phase 3: Scenarios & Export - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers two capabilities: (1) automatic graph persistence to localStorage so the user's work survives a browser refresh, and (2) JSON and CSV export buttons in the toolbar. Scenario management (SCENARIO-01~03) is explicitly out of scope — the user chose to skip it. The canvas, scoring, and sidebar from Phases 1–2 remain unchanged.

</domain>

<decisions>
## Implementation Decisions

### Scenario Management
- **D-01:** Scenario management (create/rename/switch/delete named scenarios) is **dropped from Phase 3 scope**. SCENARIO-01, SCENARIO-02, SCENARIO-03 are deferred. Phase 3 is export + single-graph persistence only.

### Graph Persistence (localStorage)
- **D-02:** The active graph (nodes + edges) is **persisted to localStorage on every change** and **restored on page load**. This provides refresh-survival quality-of-life without multi-scenario complexity.
- **D-03:** Storage key: **Claude's discretion** — recommended `seo-planner-graph` as a namespaced key. Store as JSON `{ nodes: [...], edges: [...] }`.
- **D-04:** On load: if localStorage has a saved graph, restore it as initial state; otherwise use empty `initialNodes`/`initialEdges`.

### Export Trigger & Placement
- **D-05:** Export buttons live in the **top toolbar**, alongside the existing "+ Add Node" button. Two separate buttons: "Export JSON" and "Export CSV".
- **D-06:** Export is triggered by clicking the button — triggers a browser file download (no modal/dialog needed).

### JSON Export Content
- **D-07:** JSON export includes **nodes, edges, AND computed PageRank scores**. Structure:
  ```json
  {
    "nodes": [{ "id": "...", "urlTemplate": "...", "pageCount": 1, "x": 0, "y": 0 }],
    "edges": [{ "id": "...", "source": "...", "target": "...", "linkCount": 1 }],
    "scores": { "<nodeId>": 0.1523 }
  }
  ```
- **D-08:** JSON file name: **Claude's discretion** — recommended `seo-planner-export.json`.

### CSV Export Content
- **D-09:** CSV export is the **score ranking table**: columns `url_template`, `page_count`, `score` (4 decimal places), sorted by score descending. Per EXPORT-02.
- **D-10:** CSV file name: **Claude's discretion** — recommended `seo-planner-scores.csv`.

### Claude's Discretion
- localStorage key naming and structure (within the recommended guideline above)
- JSON/CSV file names
- Exact toolbar button styling (should match existing "+ Add Node" indigo-500 style or use a secondary variant)
- Whether to disable export buttons when the canvas is empty (recommended: yes, disable with `disabled` attribute)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Codebase
- `src/App.tsx` — main shell; Phase 3 adds localStorage effect, enrichedNodes scores for export, and export button handlers
- `src/components/Toolbar.tsx` — Phase 3 adds Export JSON and Export CSV buttons here
- `src/lib/graph-utils.ts` — `calculatePageRank` already returns `Map<string, number>` — use for score snapshot at export time

### Project Requirements
- `.planning/REQUIREMENTS.md` — EXPORT-01 (JSON export), EXPORT-02 (CSV export) are in scope; SCENARIO-01~03 are explicitly dropped from Phase 3

### Prior Phase Decisions
- `.planning/phases/01-canvas-editor/01-CONTEXT.md` — Node/edge data shapes (`UrlNodeData`, `LinkCountEdgeData`) that go into JSON export
- `.planning/phases/02-scoring-analysis/02-CONTEXT.md` — Score formatting (4 decimal places) used in CSV

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `App.tsx` — already has `nodes`, `edges`, `scores` (useMemo), `enrichedNodes` in scope — export functions can read these directly
- `Toolbar.tsx` — already rendered with a single "+ Add Node" button; Phase 3 adds two more buttons
- `graph-utils.ts` — `calculatePageRank` already called in App.tsx via `useMemo`; no new utility needed for export logic

### Established Patterns
- State in `AppInner` via `useNodesState`/`useEdgesState` — localStorage `useEffect` watches `[nodes, edges]`
- Toolbar button style: indigo-500 background (established in Phase 1) — export buttons should use a secondary style (e.g., white with border) to distinguish from primary "Add Node" action
- File download pattern: create a Blob, `URL.createObjectURL`, trigger `<a>` click, revoke URL — no library needed

### Integration Points
- `App.tsx`: add `useEffect(() => { localStorage.setItem(...) }, [nodes, edges])` for persistence
- `App.tsx`: add `useEffect(() => { const saved = localStorage.getItem(...); if (saved) { ... } }, [])` for restore on mount
- `Toolbar.tsx`: add two export button props (`onExportJson`, `onExportCsv`) called from App.tsx

</code_context>

<specifics>
## Specific Ideas

- localStorage restore must strip the `onUpdate` callback and score fields from `AppNodeData` before persisting (only persist `urlTemplate`, `pageCount`, `x`, `y`, `id` per node)
- On restore, `onUpdate` is re-added when App.tsx maps restored nodes through the existing `useCallback` pattern
- CSV row example: `/category/<id>/list,100,1.4250`
- Export buttons in toolbar: secondary style (e.g. `border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`) to contrast with the primary indigo "+ Add Node"

</specifics>

<deferred>
## Deferred Ideas

- **Scenario management** (SCENARIO-01~03) — user explicitly chose to skip; could be a future phase if needed
- localStorage key migration / versioning — not needed for MVP
- Export button in a dropdown (single "Export…" button) — user preferred two separate buttons

</deferred>

---

*Phase: 03-scenarios-export*
*Context gathered: 2026-04-13 via /gsd:discuss-phase*
