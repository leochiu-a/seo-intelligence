# Phase 9: Scenario Comparison - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 delivers multi-scenario management: users can create, rename, delete, and switch between named graph scenarios, each with its own independent graph state persisted in localStorage. Existing single-graph data is auto-migrated on first load.

**Out of scope for Phase 9:** Side-by-side score delta comparison (SCENE-04, SCENE-05) — user explicitly chose to defer this. Phase 9 covers SCENE-01, SCENE-02, SCENE-03 only.

</domain>

<decisions>
## Implementation Decisions

### Scenario Switcher UI
- **D-01:** Scenario tabs render in a **second row below the toolbar header** — a horizontal tab bar with one tab per scenario. Active tab is highlighted. `[+]` button at the end creates a new scenario.
- **D-02:** Clicking a tab activates that scenario (switches graph state). A small **gear/chevron control on each tab** opens a popover with Rename and Delete actions.
- **D-03:** **Delete is disabled when only one scenario exists.** The last scenario can be renamed but not removed.

### New Scenario Creation
- **D-04:** When clicking `[+]`, a small prompt asks: **"Start blank or clone current?"** — user chooses before the tab is created.
- **D-05:** Default scenario name follows auto-increment: `Scenario 1`, `Scenario 2`, etc. (based on count of existing scenarios). User can rename immediately via the tab popover.

### Comparison Diff
- **D-06:** Score delta comparison (SCENE-04, SCENE-05) is **dropped from Phase 9 scope**. The "Compare" button and delta panel are deferred. Only SCENE-01, SCENE-02, SCENE-03 are implemented.

### localStorage Storage
- **D-07:** New storage key: **`seo-planner-scenarios`**. Structure:
  ```json
  {
    "activeScenarioId": "s1",
    "scenarios": [
      { "id": "s1", "name": "Default", "nodes": [...], "edges": [...] },
      { "id": "s2", "name": "Proposal A", "nodes": [...], "edges": [...] }
    ]
  }
  ```
- **D-08:** On save, the entire `seo-planner-scenarios` object is written on every change (same pattern as current single-graph save).
- **D-09:** **Auto-migration on first load:** If the old `seo-planner-graph` key exists and `seo-planner-scenarios` does not, read the old key, wrap it as a scenario named `"Default"`, write to `seo-planner-scenarios`, then **delete `seo-planner-graph`** (clean removal after successful migration).

### Claude's Discretion
- Tab bar visual style (font size, active/inactive states, border treatment — follow existing toolbar Tailwind patterns)
- Exact popover design for rename/delete actions on each tab
- ID generation for new scenarios (e.g., `crypto.randomUUID()` or timestamp-based)
- Whether switching scenarios saves the current graph first or relies on the change-triggered save effect

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — SCENE-01, SCENE-02, SCENE-03 are in scope; SCENE-04, SCENE-05 are explicitly deferred

### Existing Codebase
- `src/App.tsx` — main shell with `STORAGE_KEY`, `serializeGraph()`, localStorage save/restore effects, `nodes`/`edges` state — Phase 9 replaces single-graph persistence with multi-scenario management here
- `src/components/Toolbar.tsx` — existing toolbar; Phase 9 adds a scenario tab bar as a sibling row (below the header `<header>` element)
- `src/lib/graph-utils.ts` — `serializeGraph()` already strips runtime callbacks; will be reused for per-scenario serialization

### Prior Phase Decisions
- `.planning/phases/03-scenarios-export/03-CONTEXT.md` — D-02~D-04: single-graph localStorage pattern (now superseded by multi-scenario), `serializeGraph()` serialize approach
- `.planning/phases/08-crawl-depth-orphan-detection/08-CONTEXT.md` — `isRoot` field in node data must persist per scenario independently

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `serializeGraph(nodes, edges)` in `App.tsx` — strips runtime callbacks; reuse for each scenario's serialization before writing to `seo-planner-scenarios`
- `parseImportJson()` in `graph-utils.ts` — handles node/edge deserialization with backward-compat; reuse when restoring a scenario from localStorage
- Toolbar `<header>` element — tab bar renders as a new `<div>` row immediately below it, outside the header tag, keeping toolbar height unchanged

### Established Patterns
- `useNodesState`/`useEdgesState` in `AppInner` — switching scenarios means calling the setters with the restored scenario's nodes/edges
- `isFirstRender` ref pattern from Phase 3 — needed to avoid spurious saves when switching scenarios triggers a re-render before the new graph is loaded
- Toolbar secondary button style: `border border-border bg-white text-ink hover:bg-surface` — tab bar uses a similar neutral-to-active transition

### Integration Points
- `App.tsx`: Replace `STORAGE_KEY` / single-graph effects with a `useScenarios` hook (or inline state) managing the `seo-planner-scenarios` structure
- `App.tsx`: Add scenario switch handler that serializes the current scenario, swaps `activeScenarioId`, and restores the target scenario's nodes/edges
- `App.tsx` or new `ScenarioTabBar.tsx`: Render tab bar between `<Toolbar>` and the main canvas layout
- Migration logic: runs once on mount inside the restore effect — check for old key, migrate, delete old key

</code_context>

<specifics>
## Specific Ideas

- Tab bar placement: a `<div>` row with `flex items-center border-b border-border bg-white px-4 h-9 text-sm` between Toolbar and the `<div className="flex flex-1 overflow-hidden">` canvas container
- Tab active state: `border-b-2 border-dark font-semibold text-dark`; inactive: `text-muted hover:text-ink`
- `[+]` button: minimal icon-only or icon + "New" label, same secondary style as toolbar secondary buttons
- Scenario rename: inline text input in the tab itself, confirmed on Enter/blur
- Migration guard: `if (localStorage.getItem('seo-planner-graph') && !localStorage.getItem('seo-planner-scenarios')) { /* migrate */ }`

</specifics>

<deferred>
## Deferred Ideas

- **SCENE-04 / SCENE-05: Score delta comparison** — user explicitly dropped from Phase 9. Side-by-side comparison panel with per-node green/red deltas can be a future phase after Phase 10.
- **Comparison view: added/removed node labeling** — discussed as part of comparison diff; deferred with the rest of comparison.

</deferred>

---

*Phase: 09-scenario-comparison*
*Context gathered: 2026-04-16 via /gsd:discuss-phase*
