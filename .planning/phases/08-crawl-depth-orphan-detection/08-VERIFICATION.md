---
phase: 08-crawl-depth-orphan-detection
verified: 2026-04-16T13:35:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
---

# Phase 08: Crawl Depth & Orphan Detection — Verification Report

**Phase Goal:** Users can see how many clicks separate each page from the root, with clear warnings for deep or unreachable pages, and a distinct alert for orphan nodes that have no inbound links at all
**Verified:** 2026-04-16T13:35:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | calculateCrawlDepth returns BFS shortest-path distances from root to all reachable nodes | VERIFIED | Function exists at graph-utils.ts:334, 11 test cases pass including linear chain, branching, diamond |
| 2 | calculateCrawlDepth returns Infinity for unreachable nodes | VERIFIED | graph-utils.ts:361 (`depth.set(n.id, Infinity)`), test "unreachable node D returns Infinity depth" passes |
| 3 | calculateCrawlDepth returns 0 for the root node | VERIFIED | graph-utils.ts:362 (`depth.set(rootId, 0)`), test "single root node returns Map with root depth 0" passes |
| 4 | calculateCrawlDepth includes synthetic global edges in BFS traversal | VERIFIED | graph-utils.ts:351-357, test "global node G... reaches G via synthetic edge at depth 1" passes |
| 5 | identifyOrphanNodes returns node IDs with zero inbound edges, excluding root | VERIFIED | Function exists at graph-utils.ts:386, 8 test cases pass including root exclusion, global synthetic inbound |
| 6 | UrlNodeData interface includes optional isRoot field | VERIFIED | graph-utils.ts:14 `isRoot?: boolean;` |
| 7 | User can toggle root designation on any node via the edit popover | VERIFIED | EditPopover.tsx:11,15 props `isRoot: boolean` + `onRootToggle`; Root (Homepage) toggle at line 102-111 |
| 8 | Only one node can be root at a time | VERIFIED | App.tsx:130-144, onRootToggle clears isRoot from all other nodes before setting new root |
| 9 | Root node displays Home icon and Root badge on canvas | VERIFIED | UrlNode.tsx:118-122, `bg-violet-100 text-violet-700` Root badge with `<Home size={9}>` icon |
| 10 | Sidebar shows crawl depth next to each node score | VERIFIED | ScoreSidebar.tsx:187-196, `Depth {depth}` rendered with amber warning for depth >3 |
| 11 | Nodes deeper than 3 clicks show amber depth warning on canvas and sidebar | VERIFIED | UrlNode.tsx:156-161 amber Layers icon + "Depth {data.crawlDepth}"; ScoreSidebar.tsx:192-196 amber ⚠ |
| 12 | Orphan nodes show red Unplug icon on canvas | VERIFIED | UrlNode.tsx:142-147, `<Unplug>` with `text-red-500` and "Orphan" label |
| 13 | Unreachable nodes show red Unreachable label on canvas | VERIFIED | UrlNode.tsx:149-154, `<Unplug>` with `text-red-500` and "Unreachable" label |
| 14 | Sidebar has dedicated orphan and unreachable sections above score ranking | VERIFIED | ScoreSidebar.tsx:113-162, Orphan Pages section (bg-red-50) above Unreachable section, both above ranked list |
| 15 | Root designation persists via localStorage | VERIFIED | App.tsx:448 `...(n.data.isRoot != null && { isRoot: n.data.isRoot })` in restore; App.tsx:77 in serializeGraph |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/graph-utils.ts` | calculateCrawlDepth, identifyOrphanNodes, isRoot on UrlNodeData | VERIFIED | All three present; functions exported at lines 334 and 386; isRoot at line 14 |
| `src/lib/graph-utils.test.ts` | Tests for both functions | VERIFIED | describe('calculateCrawlDepth') at line 792 (11 tests); describe('identifyOrphanNodes') at line 987 (8 tests); 109/109 pass |
| `src/components/EditPopover.tsx` | Root toggle in popover | VERIFIED | isRoot prop, onRootToggle callback, "Root (Homepage)" label, bg-violet-600 toggle |
| `src/components/UrlNode.tsx` | Root badge, depth warning, orphan indicator | VERIFIED | Home icon, Unplug (orphan/unreachable), Layers (depth >3), all present |
| `src/components/ScoreSidebar.tsx` | Orphan/unreachable sections, depth per row | VERIFIED | All 4 new props, orphan section, unreachable section, depth display, root prompt |
| `src/App.tsx` | Depth map computation, orphan detection, root state management | VERIFIED | calculateCrawlDepth and identifyOrphanNodes imported and called in useMemo; full wiring |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/App.tsx | src/lib/graph-utils.ts | calculateCrawlDepth, identifyOrphanNodes in useMemo | VERIFIED | App.tsx:35-36 imports; App.tsx:298-306 useMemo calls |
| src/App.tsx | src/components/ScoreSidebar.tsx | depthMap, orphanNodes, unreachableNodes, rootId props | VERIFIED | App.tsx:550-554 JSX props |
| src/App.tsx | src/components/UrlNode.tsx | enrichedNodes with isOrphan, isUnreachable, crawlDepth fields | VERIFIED | App.tsx:324-326 in enrichedNodes useMemo; App.tsx:342 deps include all sets |
| src/components/EditPopover.tsx | src/App.tsx | onRootToggle callback includes nodeId parameter | VERIFIED | EditPopover.tsx:15 `onRootToggle: (nodeId: string) => void`; App.tsx:130 callback |
| src/components/UrlNode.tsx | src/components/EditPopover.tsx | isRoot and onRootToggle passed as props | VERIFIED | UrlNode.tsx:184,188 passes `isRoot={data.isRoot ?? false}` and `onRootToggle={data.onRootToggle ?? (() => {})}` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| ScoreSidebar.tsx | depthMap | App.tsx useMemo -> calculateCrawlDepth(nodes, edges, rootId) | Yes — BFS over actual node/edge state | FLOWING |
| ScoreSidebar.tsx | orphanNodes | App.tsx useMemo -> identifyOrphanNodes(nodes, edges, rootId) | Yes — inbound edge counting over actual graph state | FLOWING |
| ScoreSidebar.tsx | unreachableNodes | App.tsx useMemo -> derived from depthMap (Infinity entries) | Yes — derived from real depthMap | FLOWING |
| UrlNode.tsx | crawlDepth | enrichedNodes -> depthMap.get(node.id) | Yes — from real depthMap via enrichedNodes | FLOWING |
| UrlNode.tsx | isOrphan | enrichedNodes -> orphanNodes.has(node.id) | Yes — from real orphanNodes set | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| calculateCrawlDepth BFS correctness | npx vitest run src/lib/graph-utils.test.ts | 109/109 pass | PASS |
| identifyOrphanNodes correctness | npx vitest run src/lib/graph-utils.test.ts | 8 orphan tests pass | PASS |
| TypeScript compilation | npx tsc --noEmit | 0 errors | PASS |
| All component tests | npx vitest run | 174/174 pass across 8 test files | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEPTH-01 | 08-01 | BFS shortest-path distance from designated root | SATISFIED | calculateCrawlDepth at graph-utils.ts:334; 11 test cases |
| DEPTH-02 | 08-02 | Sidebar displays crawl depth next to each node's score | SATISFIED | ScoreSidebar.tsx:187-196 depth display per ranked row |
| DEPTH-03 | 08-02 | Nodes with depth >3 display warning indicator in sidebar and canvas | SATISFIED | UrlNode.tsx:156-161 amber Layers; ScoreSidebar.tsx:192-196 amber ⚠ |
| DEPTH-04 | 08-02 | User can designate root (homepage) via edit popover | SATISFIED | EditPopover.tsx root toggle; App.tsx:130 onRootToggle callback |
| DEPTH-05 | 08-01 | Unreachable nodes flagged as "unreachable" with distinct alert | SATISFIED | UrlNode.tsx:149-154 red Unreachable; ScoreSidebar.tsx unreachable section |
| ORPHAN-01 | 08-01 | Identifies orphan nodes (zero inbound, excluding root) separately from weak | SATISFIED | identifyOrphanNodes at graph-utils.ts:386; distinct from identifyWeakNodes |
| ORPHAN-02 | 08-02 | Orphan nodes display dedicated "orphan" warning icon distinct from weak | SATISFIED | UrlNode.tsx:142-147 Unplug+red vs TriangleAlert+amber for weak |
| ORPHAN-03 | 08-02 | Sidebar groups orphan nodes in separate section above weak nodes | SATISFIED | ScoreSidebar.tsx:113-131 Orphan Pages section; orphan/unreachable filtered from main ranked list |

All 8 requirement IDs accounted for. No orphaned requirements found in REQUIREMENTS.md for Phase 8.

---

### Anti-Patterns Found

No blockers or warnings detected.

- No TODO/FIXME/PLACEHOLDER comments in modified files
- No empty return stubs (return null / return [] with no query)
- No hardcoded empty values passed to rendering props
- All data flows from real reactive computation (useMemo chains)
- Weak indicator properly suppressed when isOrphan/isUnreachable to avoid noise (most-severe wins)

---

### Human Verification Required

#### 1. Root toggle exclusive behavior in browser

**Test:** Open app, add 3 nodes, set node A as root, then set node B as root.
**Expected:** Node A loses the Root badge immediately; node B shows the violet Root badge. Only one Root badge visible at any time.
**Why human:** Cannot verify React state transitions and DOM re-render without running the app.

#### 2. Depth warning visual appearance at depth >3

**Test:** Create chain A->B->C->D->E (A=root). Check nodes D and E.
**Expected:** D and E show amber "Depth 4" / "Depth 5" label with Layers icon on the canvas node. Sidebar shows amber "Depth 4 ⚠" / "Depth 5 ⚠" next to their scores.
**Why human:** Visual presentation and amber color rendering cannot be verified programmatically.

#### 3. Orphan section appears and disappears reactively

**Test:** Add isolated node, verify orphan section appears. Then connect an edge to that node, verify orphan section disappears.
**Expected:** Orphan Pages section (red header) appears immediately when orphan exists; disappears when all nodes have at least one inbound link.
**Why human:** Reactive sidebar updates require browser rendering.

#### 4. localStorage root persistence across page reload

**Test:** Set a root node, refresh the browser, observe which node has the Root badge.
**Expected:** Same node retains the violet Root badge after reload.
**Why human:** localStorage read/write requires a running browser.

---

### Gaps Summary

No gaps. All 15 must-have truths verified across both plans. All 8 requirement IDs (DEPTH-01 through DEPTH-05, ORPHAN-01 through ORPHAN-03) are satisfied with implementation evidence. All 174 tests pass and TypeScript compiles clean.

---

_Verified: 2026-04-16T13:35:00Z_
_Verifier: Claude (gsd-verifier)_
