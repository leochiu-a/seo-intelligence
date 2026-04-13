---
phase: 03-scenarios-export
verified: 2026-04-13T16:00:00Z
status: human_needed
score: 3/3 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 0/3
  gaps_closed:
    - "Graph survives browser refresh — scores useMemo now declared before export callbacks; tsc -b passes"
    - "User can click Export JSON — onExportJson correctly references scores (now declared at line 158, before useCallback at line 190)"
    - "User can click Export CSV — onExportCsv correctly references scores (now declared at line 158, before useCallback at line 216)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Refresh persistence"
    expected: "Add 2 nodes and 1 edge, refresh browser — nodes and edges reappear in same positions with same URL templates and page counts"
    why_human: "Cannot test browser refresh programmatically"
  - test: "localStorage clean data"
    expected: "DevTools > Application > Local Storage > seo-planner-graph contains JSON with no onUpdate, scoreTier, isWeak, or onLinkCountChange fields"
    why_human: "Requires browser DevTools inspection"
  - test: "JSON export file content"
    expected: "Clicking Export JSON downloads seo-planner-export.json with nodes array (id, urlTemplate, pageCount, x, y), edges array (id, source, target, linkCount), and scores object (nodeId -> number)"
    why_human: "Requires browser interaction to trigger download"
  - test: "CSV export file content"
    expected: "Clicking Export CSV downloads seo-planner-scores.csv with header url_template,page_count,score and rows sorted by score descending with 4 decimal places"
    why_human: "Requires browser interaction to trigger download"
  - test: "Export buttons disabled on empty canvas"
    expected: "Both Export JSON and Export CSV buttons appear visually disabled (opacity reduced, not-allowed cursor) and do not trigger downloads when canvas has no nodes"
    why_human: "Requires browser visual inspection and interaction"
---

# Phase 3: Scenarios & Export Verification Report

**Phase Goal:** Graph data persists across browser refresh and users can export data as JSON or CSV for external use
**Verified:** 2026-04-13T16:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (declaration ordering fix)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Graph (nodes + edges) persists across browser refresh via localStorage | ✓ VERIFIED | `STORAGE_KEY = 'seo-planner-graph'`; save effect at line 283 writes on every `[nodes, edges]` change; restore effect at line 241 reads on mount; `serializeGraph` strips runtime fields; `npm run build` passes cleanly |
| 2 | User can export the current graph as a JSON file containing nodes, edges, and scores | ✓ VERIFIED | `onExportJson` at line 190 reads `nodes`, `edges`, `scores` (declared at line 158); builds JSON with correct shape; Blob + download link pattern; wired to Toolbar via prop at line 288 |
| 3 | User can export the current score ranking as a CSV file with columns: url_template, page_count, score | ✓ VERIFIED | `onExportCsv` at line 216 reads `nodes`, `scores` (declared at line 158); sorts desc by score; writes header + rows with `toFixed(4)`; Blob download; wired to Toolbar at line 288 |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/App.tsx` | localStorage save/restore effects + JSON/CSV export handlers | ✓ VERIFIED | All four useMemos (`scores`, `weakNodes`, `allScoreValues`, `enrichedNodes`) now declared at lines 158–188, before export useCallbacks at lines 190 and 216; build passes with zero TypeScript errors |
| `src/components/Toolbar.tsx` | Export JSON and Export CSV buttons | ✓ VERIFIED | Two buttons with `onClick={onExportJson}` / `onClick={onExportCsv}`, `disabled={isEmpty}`, Download icons, secondary border style — no change from initial verification |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `App.tsx useEffect (save)` | `localStorage.setItem` | `[nodes, edges]` dependency array | ✓ WIRED | Line 283: `localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeGraph(nodes, edges)))` inside effect |
| `App.tsx useEffect (restore)` | `localStorage.getItem` | empty dependency array (mount only) | ✓ WIRED | Line 241: `localStorage.getItem(STORAGE_KEY)` inside `useEffect(fn, [])` |
| `App.tsx onExportJson` | `scores` useMemo | reads Map at export time | ✓ WIRED | `scores` declared at line 158 (via `calculatePageRank`); `onExportJson` at line 190 references it in body and dependency array — ordering now correct |
| `App.tsx onExportCsv` | `scores` useMemo | reads Map at export time | ✓ WIRED | Same `scores` at line 158; `onExportCsv` at line 216 references it — ordering now correct |
| `Toolbar.tsx` | `App.tsx` export handlers | `onExportJson` and `onExportCsv` props | ✓ WIRED | Line 288: `<Toolbar onAddNode={onAddNode} onExportJson={onExportJson} onExportCsv={onExportCsv} isEmpty={nodes.length === 0} />` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `onExportJson` | `scores` Map | `calculatePageRank(nodes, edges)` useMemo (line 158) | Yes — iterative PageRank computation | ✓ FLOWING |
| `onExportCsv` | `scores` Map | `calculatePageRank(nodes, edges)` useMemo (line 158) | Yes — iterative PageRank computation | ✓ FLOWING |
| Save `useEffect` | `nodes`, `edges` | React Flow `useNodesState`/`useEdgesState` | Yes — live graph state, stripped via `serializeGraph` | ✓ FLOWING |
| Restore `useEffect` | `localStorage.getItem(STORAGE_KEY)` | serialized JSON from previous session | Yes — deserialized with callback re-wire | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production build succeeds | `npm run build` | `tsc -b && vite build` — zero errors, 311kB bundle in 1.37s | ✓ PASS |
| scores declared before export callbacks | Line numbers in App.tsx | `scores` at line 158, `onExportJson` at line 190, `onExportCsv` at line 216 | ✓ PASS |
| Toolbar renders export buttons | Read `src/components/Toolbar.tsx` | Export JSON and Export CSV buttons present with disabled prop | ✓ PASS |
| localStorage key defined | Grep STORAGE_KEY | `const STORAGE_KEY = 'seo-planner-graph'` at line 46 | ✓ PASS |
| serializeGraph strips callbacks | Inspect lines 49–69 | Only persists `id, type, position, data.{urlTemplate,pageCount}` per node | ✓ PASS |
| Export handlers passed to Toolbar | Grep line 288 | `onExportJson={onExportJson} onExportCsv={onExportCsv}` present | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXPORT-01 | 03-02-PLAN.md | User can export current graph as JSON (nodes, edges, scores) | ✓ SATISFIED | `onExportJson` produces `{ nodes, edges, scores }` JSON blob downloaded as `seo-planner-export.json` |
| EXPORT-02 | 03-02-PLAN.md | User can export score ranking as CSV (url_template, page_count, score) | ✓ SATISFIED | `onExportCsv` produces sorted CSV with correct columns and 4-decimal scores as `seo-planner-scores.csv` |
| SCENARIO-01~03 | (dropped per D-01) | Scenario management | N/A — out of scope | Per 03-CONTEXT.md decision D-01; explicitly deferred |

**Orphaned requirements check:** REQUIREMENTS.md maps SCENARIO-01~03 to Phase 3, but decision D-01 explicitly dropped them. Known, documented deferral — not an oversight.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | No stubs, TODOs, empty handlers, or ordering issues found | — | — |

The previously-identified blocker (TS2448/TS2454 declaration ordering) is resolved.

### Human Verification Required

#### 1. Refresh persistence

**Test:** Add 2 nodes and 1 edge on the canvas. Note their positions and URL templates. Press F5 to refresh the browser.
**Expected:** Nodes and edges reappear in exactly the same positions with the same URL templates and page counts.
**Why human:** Cannot test browser refresh programmatically.

#### 2. localStorage clean data

**Test:** Open DevTools > Application > Local Storage > localhost. Inspect the `seo-planner-graph` key.
**Expected:** JSON contains `nodes` and `edges` arrays with plain data fields only. No `onUpdate`, `scoreTier`, `isWeak`, or `onLinkCountChange` fields present.
**Why human:** Requires browser DevTools inspection.

#### 3. JSON export file content

**Test:** With nodes on canvas, click "Export JSON" button in toolbar.
**Expected:** File `seo-planner-export.json` downloads. Content has `nodes` array (each with `id`, `urlTemplate`, `pageCount`, `x`, `y`), `edges` array (each with `id`, `source`, `target`, `linkCount`), and `scores` object mapping node IDs to numeric scores.
**Why human:** Requires browser interaction to trigger download.

#### 4. CSV export file content

**Test:** With nodes on canvas, click "Export CSV" button in toolbar.
**Expected:** File `seo-planner-scores.csv` downloads. First line is `url_template,page_count,score`. Subsequent rows have URL template quoted, page count as integer, score as decimal with exactly 4 decimal places. Rows are ordered by score descending.
**Why human:** Requires browser interaction to trigger download.

#### 5. Export buttons disabled on empty canvas

**Test:** Clear the canvas (or open with fresh localStorage cleared). Observe the Export JSON and Export CSV buttons.
**Expected:** Both buttons appear visually disabled (reduced opacity, not-allowed cursor). Clicking them does nothing — no file download occurs.
**Why human:** Requires browser visual inspection and interaction.

### Gaps Summary

All three phase success criteria are now verified. The single root cause from the initial verification — `scores` useMemo declared after the `onExportJson` and `onExportCsv` useCallbacks that reference it — has been resolved. The four score-related useMemos (`scores` at line 158, `weakNodes` at line 163, `allScoreValues` at line 168, `enrichedNodes` at line 174) are now all declared before the export callbacks (lines 190 and 216). `npm run build` (`tsc -b && vite build`) succeeds with zero errors. No regressions detected in localStorage persistence or Toolbar wiring.

Five items remain in human verification — these are browser-interaction behaviors that cannot be verified programmatically (file downloads, refresh persistence, visual disabled state). All automated checks pass.

---

_Verified: 2026-04-13T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
