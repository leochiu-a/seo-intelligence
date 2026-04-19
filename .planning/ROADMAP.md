# Roadmap: SEO Internal Link Planner

## Overview

Four phases deliver a browser-based visual tool for modeling internal link structures. Phase 0 scaffolds the project; Phase 1 builds the interactive canvas; Phase 2 layers in PageRank scoring and analysis; Phase 3 adds localStorage persistence and data export. All phases belong to Milestone 1: MVP.

## Milestones

- 🚧 **v1.0 MVP** - Phases 0-3 (in progress)
- 📋 **v1.1 Global Navigation** - Phases 4-5 (planned)
- 📋 **v1.1 UX Polish** - Phases 6-7 (planned)
- 📋 **v2.0 SEO Analysis Depth** - Phases 8-12 (planned)

## Phases

- [x] **Phase 0: Project Setup** - Scaffold Vite + React + TypeScript project with Tailwind CSS and React Flow (completed 2026-04-13)
- [x] **Phase 1: Canvas Editor** - Interactive canvas with URL template nodes, directed edges, and inline configuration (completed 2026-04-13)
- [x] **Phase 2: Scoring & Analysis** - PageRank engine with visual node scoring and ranked sidebar (completed 2026-04-13)
- [x] **Phase 3: Scenarios & Export** - localStorage graph persistence plus CSV/JSON export (completed 2026-04-13)
- [x] **Phase 4: Global Nodes** - Global node designation with named placements and PageRank injection
- [x] **Phase 5: Global Filter Panel** - Filter panel with placement checkboxes and canvas dimming
- [x] **Phase 6: Placement Autocomplete** - Typing a placement name in the edit popover shows suggestions from existing placement names across all other global nodes
- [x] **Phase 7: Placement-Centric Filter** - Filter panel redesigned to group by unique placement name so checking "Header" highlights every global node that carries a Header placement (completed 2026-04-15)

---

## v2.0 SEO Analysis Depth — Phases 8-10

- [x] **Phase 8: Crawl Depth & Orphan Detection** - BFS-based crawl depth from root node with depth warnings, plus dedicated orphan node alerts distinct from weak-node indicators (completed 2026-04-16)
- [x] **Phase 9: Scenario Comparison** - Multi-scenario management with independent graph state, localStorage persistence (completed 2026-04-16)
- [x] **Phase 10: Outbound Link Warning** - Per-node total outbound link calculation with threshold warning at >150 links on canvas and sidebar (completed 2026-04-17)
- [ ] **Phase 11: Topical Cluster Tags** - Tag nodes by topic cluster, bonus weight for same-cluster edges, visual cluster color coding
- [ ] **Phase 12: Anchor Text Type on Edge** - Label edges with anchor text type (exact/partial/branded/generic) and display inbound anchor diversity per node

## Phase Details

### Phase 0: Project Setup
**Goal**: A running dev environment with all core dependencies installed and a blank canvas shell rendered in the browser
**Depends on**: Nothing (first phase)
**Requirements**: (none — infrastructure only)
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts the app without errors and renders a blank page at localhost
  2. React Flow renders an empty canvas that pans and zooms
  3. Tailwind utility classes apply correctly (spot-checkable in browser)
**Plans**: 1 plan

Plans:
- [x] 00-01: Initialize Vite+React+TS project, install React Flow and Tailwind, wire up base App shell with empty canvas

### Phase 1: Canvas Editor
**Goal**: Users can build a directed graph of URL template nodes and edges on a visual canvas
**Depends on**: Phase 0
**Requirements**: CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05, NODE-01, NODE-02, NODE-03, EDGE-01, EDGE-02
**Success Criteria** (what must be TRUE):
  1. User can add a node to the canvas (drag from palette or double-click blank area) and it displays a URL template string and page count
  2. User can drag from a node handle to create a directed edge to another node; the edge displays a link count
  3. User can select a node or edge and edit its URL template, page count, or link count via an inline panel or popover
  4. User can move, select, and delete nodes and edges
  5. Canvas supports pan (drag background) and zoom (scroll/pinch)
**Plans**: 3 plans

Plans:
- [x] 01-01: Implement node component (URL template + page count display, inline edit popover) and canvas add/move/delete interactions
- [x] 01-02: Implement directed edge with link count label, edge creation by dragging from handles, and edge edit/delete
- [x] 01-03: TDD — Pure graph utility functions (node/edge factory, mutation, validation, formatting) with Vitest

**UI hint**: yes

### Phase 2: Scoring & Analysis
**Goal**: Every graph change instantly shows which URL templates carry the most link equity, with weak pages flagged
**Depends on**: Phase 1
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SIDEBAR-01, SIDEBAR-02, SIDEBAR-03
**Success Criteria** (what must be TRUE):
  1. Nodes are visually sized and color-coded by their PageRank score immediately after any graph edit (no manual recalculate button needed)
  2. A sidebar lists all nodes ranked highest to lowest score, showing URL template and score value
  3. Nodes with low inbound link equity display a warning indicator in both the sidebar and on the canvas node
  4. Clicking a sidebar row highlights the corresponding node on the canvas
**Plans**: 2 plans

Plans:
- [x] 02-01: Implement iterative PageRank algorithm (dampening factor, page count and link count weighting) that recalculates on every graph state change
- [x] 02-02: Implement score-driven node size/color scaling and ranked sidebar with weak-page flags and click-to-highlight

**UI hint**: yes

### Phase 4: Global Nodes
**Goal**: Users can designate any node as "global" — meaning every other node automatically links to it — and configure named placements with per-placement link counts that feed the PageRank calculation
**Depends on**: Phase 3
**Requirements**: GLOB-01, GLOB-02, GLOB-03, GLOB-04, GLOB-05
**Success Criteria** (what must be TRUE):
  1. User can toggle any node as "global" from the edit popover; global nodes show a visible badge/indicator on canvas
  2. User can add, rename, and delete placements (e.g. "Header Nav", "Footer") on a global node, each with its own link count
  3. PageRank recalculates correctly: every non-global node contributes inbound links to all global nodes equal to the sum of that global node's placement link counts
  4. Scores and sidebar rankings update immediately when a node is toggled global or its placements change
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Placement interface, UrlNodeData extension, PageRank global injection, parseImportJson update
- [x] 04-02-PLAN.md — EditPopover global toggle + placement CRUD, UrlNode Globe badge, App.tsx serialization/restore/export

### Phase 5: Global Filter Panel
**Goal**: Users can filter the canvas view by global nodes and their placements, highlighting relevant nodes and dimming the rest to stay oriented in complex graphs
**Depends on**: Phase 4
**Requirements**: FILTER-01, FILTER-02, FILTER-03, FILTER-04
**Success Criteria** (what must be TRUE):
  1. A filter panel lists all global nodes with their placements as toggleable checkboxes
  2. Checking a global node or placement highlights that node on the canvas (full opacity, distinct style)
  3. All other nodes are dimmed (reduced opacity) when at least one filter is active
  4. Unchecking all filters restores the canvas to full-opacity normal state
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — FilterPanel component with useFilterState hook, canvas dimming via node.style.opacity

### Phase 6: Placement Autocomplete
**Goal**: Users typing a placement name in the edit popover see suggestions drawn from placement names already used across other global nodes, reducing typos and enforcing naming consistency
**Depends on**: Phase 5
**Requirements**: PLACE-01, PLACE-02, PLACE-03, PLACE-04
**Success Criteria** (what must be TRUE):
  1. When a global node has a placement name field focused and other global nodes have placements defined, a dropdown of existing placement names appears
  2. User can click a suggestion to pre-fill the placement name field without further typing
  3. User can ignore suggestions and type a freeform name that is not in the list
  4. When no other global nodes have placements defined, no dropdown appears
**Plans**: 1 plan

Plans:
- [x] 06-01-PLAN.md — collectPlacementSuggestions utility + Base UI Autocomplete in EditPopover with UrlNode prop wiring

**UI hint**: yes

### Phase 7: Placement-Centric Filter
**Goal**: The filter panel groups by unique placement name across all global nodes, so users can check "Header" once to highlight every global node carrying a Header placement instead of hunting for individual nodes
**Depends on**: Phase 6
**Requirements**: PFILTER-01, PFILTER-02, PFILTER-03, PFILTER-04
**Success Criteria** (what must be TRUE):
  1. Filter panel lists unique placement names (deduplicated across all global nodes) as top-level checkboxes
  2. Checking a placement name highlights all global nodes that carry that placement, dimming all other nodes
  3. Each placement name entry shows which global node(s) use it as sub-items
  4. Unchecking all placement filters restores the canvas to full-opacity normal state
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — collectPlacementGroups utility + placement-centric FilterPanel redesign + App.tsx key resolution update

**UI hint**: yes

---

## v2.0 Phase Details

### Phase 8: Crawl Depth & Orphan Detection
**Goal**: Users can see how many clicks separate each page from the root, with clear warnings for deep or unreachable pages, and a distinct alert for orphan nodes that have no inbound links at all
**Depends on**: Phase 7
**Requirements**: DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, DEPTH-05, ORPHAN-01, ORPHAN-02, ORPHAN-03
**Success Criteria** (what must be TRUE):
  1. User can designate any node as the root (homepage) via the edit popover; root designation persists across sessions
  2. Sidebar displays a crawl depth number next to each node's score, calculated as the shortest BFS path from root
  3. Nodes more than 3 clicks from root show a depth warning indicator in both the sidebar and on the canvas node
  4. Nodes with no path from root are flagged as "unreachable" with a distinct alert separate from the depth warning
  5. Orphan nodes (zero inbound edges, excluding root) display a dedicated orphan warning icon that is visually distinct from the weak-node indicator, and are grouped above weak nodes in the sidebar
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — TDD: calculateCrawlDepth (BFS) + identifyOrphanNodes pure functions + isRoot on UrlNodeData
- [x] 08-02-PLAN.md — Root toggle in EditPopover, depth/orphan indicators in UrlNode, sidebar sections, App.tsx wiring + localStorage
**UI hint**: yes

### Phase 10: Outbound Link Warning
**Goal**: Users are warned when any node carries more outbound links than the recommended SEO threshold, so over-linked pages can be identified and corrected before deployment
**Depends on**: Phase 9
**Requirements**: OUTBOUND-01, OUTBOUND-02, OUTBOUND-03
**Success Criteria** (what must be TRUE):
  1. System calculates total outbound links per node, combining explicit edges and global placement contributions
  2. Nodes exceeding 150 total outbound links display a red warning indicator directly on the canvas node
  3. Sidebar shows the outbound link count for each node and highlights the count in red when it exceeds the threshold
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — TDD: calculateOutboundLinks + OUTBOUND_WARNING_THRESHOLD pure function
- [x] 10-02-PLAN.md — UI wiring: App.tsx outboundMap memo + UrlNode subtitle indicator + ScoreSidebar inline count
**UI hint**: yes

### Phase 11: Topical Cluster Tags
**Goal**: Users can tag nodes with topic cluster labels; same-cluster edges carry a bonus PageRank weight; nodes and edges are color-coded by cluster to visually communicate topical authority groupings
**Depends on**: Phase 10
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. User can assign one or more cluster tags to any node from the edit popover
  2. Edges between nodes sharing at least one cluster tag receive a configurable bonus weight in the PageRank calculation
  3. Nodes and same-cluster edges are visually color-coded by cluster on the canvas
  4. PageRank scores and sidebar rankings update immediately when cluster tags change
**Plans**: 8 plans (3 executed from prior backlog work)

Plans:
- [x] 999.5-01-PLAN.md — (carried from backlog)
- [x] 999.5-02-PLAN.md — (carried from backlog)
- [x] 999.5-03-PLAN.md — (carried from backlog)
- [ ] 999.5-04-PLAN.md — (carried from backlog, not yet executed)
- [ ] 999.5-05-PLAN.md — (carried from backlog, not yet executed)
- [ ] 999.5-06-PLAN.md — (carried from backlog, not yet executed)
- [ ] 999.5-07-PLAN.md — (carried from backlog, not yet executed)
- [ ] 999.5-08-PLAN.md — (carried from backlog, not yet executed)
**UI hint**: yes

### Phase 11.2: Add score badge tooltip and improvement guidance for low/mid nodes (INSERTED)

**Goal:** Add hover tooltips to the Low/Mid/High tier badges on canvas UrlNode cards. Each tooltip explains what the tier means in PM-friendly language ("link equity" / "internal link strength" — no "PageRank" jargon) and gives a one-line action (Low/Mid: add more inbound internal links from high-scoring pages; High: affirm well-connected). Neutral badge is excluded. Badge visual (color, size, label) is unchanged. Canvas nodes only — sidebar score list deferred.
**Requirements**: TBD-11.2-BADGE-TOOLTIP
**Depends on:** Phase 11
**Plans:** 1 plan

Plans:
- [ ] 11.2-01-PLAN.md — Extend TONE_MAP with tooltip copy and wrap tier badge in Tooltip/TooltipTrigger/TooltipContent in UrlNode.tsx, plus vitest coverage
**UI hint**: yes

### Phase 11.1: PM 指標健診面板 — 在單一頁面檢查 Internal Link Deep Placement Text 是否達標並 filter warning 危險頁面 (INSERTED)

**Goal**: Add a PM Health Check view inside the existing right sidebar via a [Score | Health] tab toggle. The Health view lists every node with 3 icon badges (Links >150, Depth >3/unreachable, Tags empty), warnings-first sort, and a "Show warnings only" filter toggle. Read-only diagnostic surface — no click-through to canvas.
**Requirements**: HEALTH-01, HEALTH-02, HEALTH-03, HEALTH-04, HEALTH-05, HEALTH-06, HEALTH-07, HEALTH-08, HEALTH-09, HEALTH-10
**Depends on:** Phase 11
**Plans:** 2/2 plans complete

Plans:
- [x] 11.1-01-PLAN.md — TDD: getHealthStatus + hasAnyWarning pure helpers in graph-utils.ts
- [x] 11.1-02-PLAN.md — HealthPanel component + [Score|Health] tab wiring in ScoreSidebar

### Phase 12: Anchor Text Type on Edge
**Goal**: Users can label each edge with an anchor text type (exact match / partial match / branded / generic) and see inbound anchor diversity per node, surfacing topical relevance gaps
**Depends on**: Phase 11
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. User can set an anchor text type on any edge from the edge edit panel
  2. Each node displays a summary of its inbound anchor type distribution (e.g. 3 exact, 2 partial, 1 branded)
  3. Nodes with low diversity (e.g. all generic) show a warning indicator
**Plans**: 0 plans

Plans:
- [ ] TBD

## Progress

**Execution Order:** 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Project Setup | 1/1 | Complete   | 2026-04-13 |
| 1. Canvas Editor | 3/3 | Complete   | 2026-04-13 |
| 2. Scoring & Analysis | 2/2 | Complete   | 2026-04-13 |
| 3. Scenarios & Export | 2/2 | Complete   | 2026-04-13 |
| 4. Global Nodes | 2/2 | Complete    | 2026-04-14 |
| 5. Global Filter Panel | 1/1 | Complete   | 2026-04-14 |
| 6. Placement Autocomplete | 1/1 | Complete   | 2026-04-14 |
| 7. Placement-Centric Filter | 1/1 | Complete   | 2026-04-15 |
| 8. Crawl Depth & Orphan Detection | 2/2 | Complete   | 2026-04-16 |
| 9. Scenario Comparison | 2/2 | Complete   | 2026-04-16 |
| 10. Outbound Link Warning | 2/2 | Complete    | 2026-04-17 |
| 11. Topical Cluster Tags | 3/8 | In progress | - |
| 12. Anchor Text Type on Edge | 0/0 | Not started | - |

## Backlog

### Phase 999.11: URL Prefix 自動推斷 Cluster 預設值 (BACKLOG) — P2

**Goal:** 根據 URL prefix 自動填入 cluster 欄位作為預設值，PM 仍可手動覆寫，大幅降低 999.5 的使用成本
**Context:** 999.5 要求手動打 cluster tag，節點多時（50+）繁瑣。多數網站 URL 已有主題結構（`/food/*`、`/hotel/*`），應能從 prefix 自動推斷。依賴 999.5。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
