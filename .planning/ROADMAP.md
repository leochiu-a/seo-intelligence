# Roadmap: SEO Internal Link Planner

## Overview

Four phases deliver a browser-based visual tool for modeling internal link structures. Phase 0 scaffolds the project; Phase 1 builds the interactive canvas; Phase 2 layers in PageRank scoring and analysis; Phase 3 adds localStorage persistence and data export. All phases belong to Milestone 1: MVP.

## Milestones

- 🚧 **v1.0 MVP** - Phases 0-3 (in progress)
- 📋 **v1.1 Global Navigation** - Phases 4-5 (planned)
- 📋 **v1.1 UX Polish** - Phases 6-7 (planned)
- 📋 **v2.0 SEO Analysis Depth** - Phases 8-10 (planned)

## Phases

- [x] **Phase 0: Project Setup** - Scaffold Vite + React + TypeScript project with Tailwind CSS and React Flow (completed 2026-04-13)
- [x] **Phase 1: Canvas Editor** - Interactive canvas with URL template nodes, directed edges, and inline configuration (completed 2026-04-13)
- [x] **Phase 2: Scoring & Analysis** - PageRank engine with visual node scoring and ranked sidebar (completed 2026-04-13)
- [ ] **Phase 3: Scenarios & Export** - localStorage graph persistence plus CSV/JSON export (scenarios dropped per D-01)
- [ ] **Phase 4: Global Nodes** - Global node designation with named placements and PageRank injection
- [ ] **Phase 5: Global Filter Panel** - Filter panel with placement checkboxes and canvas dimming
- [ ] **Phase 6: Placement Autocomplete** - Typing a placement name in the edit popover shows suggestions from existing placement names across all other global nodes
- [x] **Phase 7: Placement-Centric Filter** - Filter panel redesigned to group by unique placement name so checking "Header" highlights every global node that carries a Header placement (completed 2026-04-15)

---

## v2.0 SEO Analysis Depth — Phases 8-10

- [x] **Phase 8: Crawl Depth & Orphan Detection** - BFS-based crawl depth from root node with depth warnings, plus dedicated orphan node alerts distinct from weak-node indicators (completed 2026-04-16)
- [ ] **Phase 9: Scenario Comparison** - Multi-scenario management with independent graph state, localStorage persistence, and side-by-side score delta diff
- [ ] **Phase 10: Outbound Link Warning** - Per-node total outbound link calculation with threshold warning at >150 links on canvas and sidebar

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

### Phase 3: Scenarios & Export
**Goal**: Graph data persists across browser refresh and users can export data as JSON or CSV for external use
**Depends on**: Phase 2
**Requirements**: EXPORT-01, EXPORT-02
**Success Criteria** (what must be TRUE):
  1. Graph (nodes + edges) persists across browser refresh via localStorage
  2. User can export the current graph as a JSON file containing nodes, edges, and scores
  3. User can export the current score ranking as a CSV file with columns: url_template, page_count, score
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — localStorage graph persistence (save on change, restore on mount)
- [x] 03-02-PLAN.md — JSON and CSV export buttons in toolbar with file download

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

### Phase 9: Scenario Comparison
**Goal**: Users can create, switch, and manage multiple named graph scenarios with independent state and localStorage persistence (SCENE-01, SCENE-02, SCENE-03). Side-by-side score delta comparison (SCENE-04, SCENE-05) deferred per D-06.
**Depends on**: Phase 8
**Requirements**: SCENE-01, SCENE-02, SCENE-03, SCENE-04, SCENE-05
**Success Criteria** (what must be TRUE):
  1. User can create a new named scenario (e.g. "Current", "Proposal A") and switch between them; each scenario has its own fully independent graph state
  2. Scenarios persist in localStorage so switching tabs or refreshing does not lose work
  3. User can open a side-by-side comparison view showing two scenarios simultaneously with each node's score delta (e.g. +15%, -8%) displayed — DEFERRED
  4. Score delta display uses green for improvements and red for regressions, making the impact immediately readable — DEFERRED
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — TDD: useScenarios hook with scenario types, CRUD, switch, localStorage persistence, auto-migration
- [x] 09-02-PLAN.md — ScenarioTabBar component + App.tsx wiring (replace single-graph with multi-scenario)
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
- [ ] 10-01-PLAN.md — TDD: calculateOutboundLinks + OUTBOUND_WARNING_THRESHOLD pure function
- [ ] 10-02-PLAN.md — UI wiring: App.tsx outboundMap memo + UrlNode subtitle indicator + ScoreSidebar inline count
**UI hint**: yes

## Progress

**Execution Order:** 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Project Setup | 1/1 | Complete   | 2026-04-13 |
| 1. Canvas Editor | 3/3 | Complete   | 2026-04-13 |
| 2. Scoring & Analysis | 2/2 | Complete   | 2026-04-13 |
| 3. Scenarios & Export | 0/2 | Not started | - |
| 4. Global Nodes | 0/2 | Complete    | 2026-04-14 |
| 5. Global Filter Panel | 1/1 | Complete   | 2026-04-14 |
| 6. Placement Autocomplete | 0/1 | Not started | - |
| 7. Placement-Centric Filter | 1/1 | Complete   | 2026-04-15 |
| 8. Crawl Depth & Orphan Detection | 2/2 | Complete   | 2026-04-16 |
| 9. Scenario Comparison | 0/2 | Not started | - |
| 10. Outbound Link Warning | 0/? | Not started | - |

## Backlog

### Phase 999.1: 之後要怎麼找到 (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 2/2 plans complete

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.2: Crawl Depth 指標 + 3-Click 警告 (BACKLOG) — P0

**Goal:** Sidebar 顯示每個節點到 root 節點的最短路徑深度，超過 3 層的節點標示警告
**Context:** SEO 共識是重要頁面要在 3 次點擊內可達，Google 對深層頁面爬取頻率明顯較低。目前工具只看 PageRank 分數，但高分卻深層的頁面照樣爬不到。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.3: Scenario Diff（Current vs Proposed）(BACKLOG) — P0

**Goal:** 支援 2 份 scenario 並排比對，顯示每個節點的 score delta（+15% / -8%），讓 PM 回答「這次改版比現況好多少」
**Context:** 這是 pre-deploy simulation 工具的殺手功能，現有 audit 工具做不到。PM 最想回答的問題是改版效果量化。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.4: Orphan Node 獨立警示（inbound=0）(BACKLOG) — P0

**Goal:** 區分「score 低（weak）」和「完全沒有 inbound（orphan）」兩種 case，orphan 獨立警示
**Context:** `identifyWeakNodes` 用 mean - stddev 但沒區分兩者。完全沒有 inbound 的頁面 Google 根本爬不到，比 weak node 嚴重得多。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.5: Topical Cluster Tags + 同 Cluster Edge 加權 (BACKLOG) — P1

**Goal:** 節點可打 tag/cluster，同 cluster 內的邊有 bonus weight，視覺上同 cluster 上色
**Context:** Google 非常看重 topical authority，同主題頁面互連的權重遠高於跨主題。目前 PageRank 是 topology-agnostic 的，`/food/ramen` → `/food/sushi` 和 `/food/ramen` → `/hotel/taipei` 在模型裡權重一樣，但 SEO 效果完全不同。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.6: Anchor Text Type on Edge (BACKLOG) — P1

**Goal:** Edge 上可標 anchor text type（exact match / partial match / branded / generic），顯示節點的 inbound anchor 多樣性
**Context:** Anchor text 是內部連結 SEO 的第二大變數。相同 link count，anchor 用「首頁」vs「台北一日遊」傳遞的 topical relevance 天差地遠。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.7: 匯入 Screaming Frog CSV / GSC Export (BACKLOG) — P1

**Goal:** 支援匯入 Screaming Frog / Sitebulb crawl data 作為 baseline，對比 GSC impressions/clicks，證明模型和真實流量相關
**Context:** 這是 pre-deploy tool 最根本的信任問題 — PM 看到某頁分數 0.47，那又怎樣？需要和真實數據橋接才敢拿去向老闆提案。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.8: Total Outbound Links 警示（>150 紅字）(BACKLOG) — P2

**Goal:** 每個節點顯示 total outbound links 總和，超過 150 條紅字警示
**Context:** 符合 Shopify / Google 的 per-page link 上限建議。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.9: 匯出改版建議清單 (BACKLOG) — P2

**Goal:** 匯出可執行的改版建議（e.g.「`/category/*` 應增加 inbound 3 條」），讓 PM 直接丟給工程 ticket
**Context:** 目前只能匯出原始數據，缺乏 actionable insights 的格式化輸出。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.10: 多人協作 / 雲端存檔 (BACKLOG) — P3

**Goal:** 支援多人協作和雲端存檔，讓團隊共用 scenario
**Context:** 目前 MVP 不需要，但從 PM 工具角度遲早要。
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
