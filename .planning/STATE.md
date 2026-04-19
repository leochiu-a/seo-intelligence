---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: executing
stopped_at: Phase 11.2 context gathered
last_updated: "2026-04-19T06:01:29.106Z"
last_activity: 2026-04-19
progress:
  total_phases: 14
  completed_phases: 10
  total_plans: 25
  completed_plans: 25
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** Let PMs visually plan and simulate internal link structures — and immediately see which pages will rank highest — before any code is written or deployed.
**Current focus:** Phase 11.2 — add-score-badge-tooltip-and-improvement-guidance-for-low-mid-nodes

## Current Position

Phase: 12
Plan: Not started
Status: Executing Phase 11.2
Last activity: 2026-04-19 - Completed quick task 260419-ppw: Refactor App.tsx phase 2 — 839→382 lines

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-canvas-editor P01 | 217 | 2 tasks | 7 files |
| Phase 01-canvas-editor P02 | 8 | 2 tasks | 3 files |
| Phase 02-scoring-analysis P02 | 10 | 3 tasks | 3 files |
| Phase 03-scenarios-export P01 | 1 min | 2 tasks | 1 files |
| Phase 03-scenarios-export P02 | 525633min | 2 tasks | 2 files |
| Phase 04-global-nodes P01 | 2 | 3 tasks | 4 files |
| Phase 04-global-nodes P02 | 2 | 2 tasks | 5 files |
| Phase 05-global-filter-panel P01 | 2 min | 2 tasks | 4 files |
| Phase 06-placement-autocomplete P01 | 8 | 2 tasks | 6 files |
| Phase 07-placement-centric-filter P01 | 5 | 3 tasks | 5 files |
| Phase 08-crawl-depth-orphan-detection P01 | 5 | 2 tasks | 2 files |
| Phase 08-crawl-depth-orphan-detection P02 | 12 | 3 tasks | 7 files |
| Phase 09-scenario-comparison P01 | 8 | 1 tasks | 3 files |
| Phase 09-scenario-comparison P02 | 9 | 2 tasks | 4 files |
| Phase 10-outbound-link-warning P01 | 2 | 2 tasks | 2 files |
| Phase 10-outbound-link-warning P02 | 3 | 3 tasks | 5 files |
| Phase 999.5-topical-cluster-tags P02 | 5 | 2 tasks | 3 files |
| Phase 999.5-topical-cluster-tags P03 | 5 | 2 tasks | 4 files |
| Phase 999.5-topical-cluster-tags P04 | 5 | 1 tasks | 2 files |
| Phase 999.5-topical-cluster-tags P05 | 2 | 1 tasks | 2 files |
| Phase 999.5-topical-cluster-tags P06 | 2 | 1 tasks | 2 files |
| Phase 999.5-topical-cluster-tags P07 | 15 | 3 tasks | 7 files |
| Phase 11.1-pm-internal-link-deep-placement-text-filter-warning P02 | 4 | 2 tasks | 4 files |

## Accumulated Context

### Roadmap Evolution

- Phase 11.1 inserted after Phase 11: PM 指標健診面板 — 在單一頁面檢查 Internal Link Deep Placement Text 是否達標並 filter warning 危險頁面 (URGENT)
- Phase 11.2 inserted after Phase 11: Add score badge tooltip and improvement guidance for low/mid nodes (URGENT)

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

-

- [Phase 01-canvas-editor]: AppNodeData interface extends UrlNodeData with onUpdate callback for EditPopover wiring without context API
- [Phase 01-canvas-editor]: nodeTypes object defined outside App component to prevent React Flow infinite re-renders
- [Phase 01-canvas-editor]: updateNodeData from graph-utils used as single source of truth for node data mutations
- [Phase 01-canvas-editor]: edgeTypes object defined outside App component to prevent React Flow infinite re-renders
- [Phase 01-canvas-editor]: updateEdgeLinkCount from graph-utils is single source of truth for edge data mutation
- [Phase 02-scoring-analysis]: ReactFlowProvider wrapper added around AppInner so ScoreSidebar can call useReactFlow() as sibling of ReactFlow
- [Phase 02-scoring-analysis]: enrichedNodes memoized separately from raw nodes — skips object creation when scoreTier and isWeak are unchanged
- [Phase 02-scoring-analysis]: ScoreSidebar receives raw nodes (not enrichedNodes) for URL template display while scores/weakNodes are separate props
- [Phase 03-scenarios-export]: isFirstRender ref skips the save effect on first mount so the re-render triggered by setNodes(restoredNodes) is the first real save; serializeGraph strips runtime callbacks before persisting
- [Phase 03-scenarios-export]: URL templates in CSV wrapped in double-quotes always (handles commas in templates safely)
- [Phase 03-scenarios-export]: Export callbacks read directly from nodes, edges, scores useMemo in AppInner — no additional computation needed
- [Phase 04-global-nodes]: Global nodes do NOT receive synthetic inbound from other global nodes — only non-global nodes are synthetic sources
- [Phase 04-global-nodes]: calculatePageRank synthetic injection placed BEFORE totalWeightedOut computation so non-global outbound denominators include global links
- [Phase 04-global-nodes]: parseImportJson uses conditional spread to keep isGlobal/placements absent (not undefined) when missing from imported JSON — backward compatible
- [Phase 04-global-nodes]: EditPopover widens to 320px only when global is active to save space for non-global nodes
- [Phase 04-global-nodes]: Globe badge and tier badge share one flex wrapper — clean layout whether one or both badges present
- [Phase 04-global-nodes]: Conditional spread in exports omits isGlobal/placements for non-global nodes to avoid false:noise in JSON
- [Phase 05-global-filter-panel]: null sentinel for highlightedNodeIds when no filters active avoids unnecessary style recalculation
- [Phase 05-global-filter-panel]: FilterPanel positioned left of canvas between Sidebar and canvas div for UX proximity
- [Phase 05-global-filter-panel]: styledNodes separate from enrichedNodes memo keeps scoring concerns separate from UI dimming
- [Phase 06-placement-autocomplete]: Used Autocomplete.Portal with container=popoverRef to satisfy Base UI API requirement while preserving click-outside handler correctness
- [Phase 06-placement-autocomplete]: collectPlacementSuggestions extracted as pure function in graph-utils.ts for isolated unit testing
- [Phase 06-placement-autocomplete]: Conditional rendering: Autocomplete.Root when suggestions available, plain input when empty (PLACE-04)
- [Phase 07-placement-centric-filter]: placement-name:{name} key format — one checkbox per unique placement name across all global nodes, replacing node:/placement: keys
- [Phase 08-crawl-depth-orphan-detection]: calculateCrawlDepth and identifyOrphanNodes both apply synthetic global edges from PageRank pattern for consistent BFS behavior
- [Phase 08-crawl-depth-orphan-detection]: identifyOrphanNodes uses raw inbound counts not BFS reachability — orphan means zero inbound, distinct from unreachable
- [Phase 08-crawl-depth-orphan-detection]: Root toggle uses separate onRootToggle callback (not onSave) so exclusive-root logic runs immediately in App.tsx
- [Phase 08-crawl-depth-orphan-detection]: unreachableNodes derived from depthMap Infinity entries — keeps orphan (zero inbound) and unreachable (no path from root) concepts distinct
- [Phase 09-scenario-comparison]: loadOrMigrate exported as named pure function for direct unit testing without React harness
- [Phase 09-scenario-comparison]: useScenarios hook is pure data layer — never calls setNodes/setEdges, App.tsx handles graph restoration
- [Phase 09-scenario-comparison]: structuredClone used for scenario clone mode — no shared references, faster than JSON round-trip
- [Phase 09-scenario-comparison]: wireCallbacks helper extracted inline in AppInner to centralize node/edge runtime callback re-attachment across restore, switch, create, delete paths
- [Phase 09-scenario-comparison]: App.test.tsx migration test made StrictMode-safe: asserts old key deleted and new key present without checking scenario name due to double useState initialization
- [Phase 10-outbound-link-warning]: OUTBOUND_WARNING_THRESHOLD exported (not module-private) so Plan 10-02 can import it from UrlNode.tsx and ScoreSidebar.tsx — single source of truth for the magic number 150, overriding CONTEXT.md D-05 per PLAN authorization
- [Phase 10-outbound-link-warning]: calculateOutboundLinks uses a single precomputed globalPlacementSum applied uniformly to every non-global source — D-02 implicit contribution does not vary per source
- [Phase 10-outbound-link-warning]: Global source nodes skip implicit contribution (continue guard) to mirror Phase 4 D-01 global→global no-inject rule
- [Phase 10-outbound-link-warning]: outboundMap included in JSON export payload to mirror depthMap precedent for debugging parity
- [Phase 10-outbound-link-warning]: ScoreSidebar outboundMap prop is required (not optional) — mirrors depthMap shape; tests supply new Map() for empty branch
- [Phase 10-outbound-link-warning]: UrlNode over-linked subtitle branch has no orphan/unreachable/weak exclusions — D-09 over-linked coexists with all reachability/strength indicators as last item in chain
- [Phase 999.5-topical-cluster-tags]: DJB2 chosen for cluster tag hash: zero deps, pure function, deterministic — snapshot-testable palette mapping
- [Phase 999.5-topical-cluster-tags]: 8-entry palette (teal/cyan/sky/pink/rose/orange/lime/fuchsia) avoids reserved UI colors (green/amber/red/indigo/blue/violet)
- [Phase 999.5-topical-cluster-tags]: Cluster Tags section placed outside localIsGlobal conditional so both global and non-global nodes can carry tags (D-04)
- [Phase 999.5-topical-cluster-tags]: Enter keydown in cluster tag input calls e.stopPropagation to prevent document-level handleConfirm from firing
- [Phase 999.5-topical-cluster-tags]: computeEdgeStroke extracted as pure helper for test isolation; EdgeLabelRenderer requires ReactFlowProvider in tests
- [Phase 999.5-topical-cluster-tags]: nodeById Map optimization used in ScoreSidebar — useMemo for O(1) tag lookup in main ranked section
- [Phase 999.5-topical-cluster-tags]: renderClusterDots pure helper outside component for reuse across 3 sidebar row render sites
- [Phase 999.5-topical-cluster-tags]: FilterPanel By placement first, By cluster second; cluster section hidden when no tagged nodes exist
- [Phase 999.5-topical-cluster-tags]: Drop-shadow filter dropped from styledNodes; dim migrated to data.isDimmed via plain object spread in App.tsx
- [Phase 999.5-topical-cluster-tags]: UrlNode cluster stripe absolute sibling of card-content; content wrapper receives inline opacity; handles remain at outer level
- [Phase 999.5-topical-cluster-tags]: AND-combine: placementKeys and clusterKeys split by prefix; per-dimension Sets intersected when both dimensions active
- [Phase 11.1-pm-internal-link-deep-placement-text-filter-warning]: data-testid on span wrapper around lucide icons (not SVG) — SVGAnimatedString className breaks .toMatch() in tests
- [Phase 11.1-pm-internal-link-deep-placement-text-filter-warning]: Tab underline style (border-b-2 border-blue-500) chosen over pill tabs to match sidebar header aesthetic

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260414-deh | Restyle canvas nodes to match agent-flow StepNode design | 2026-04-14 | 932e901 | [260414-deh-restyle-canvas-nodes-to-match-agent-flow](./quick/260414-deh-restyle-canvas-nodes-to-match-agent-flow/) |
| 260414-igw | Import JSON feature: toolbar button with drag-and-drop/file-select dialog | 2026-04-14 | 3d1304a | [260414-igw-import-json-feature-with-drag-and-drop-f](./quick/260414-igw-import-json-feature-with-drag-and-drop-f/) |
| 260414-sk5 | Add Clear Canvas button + confirm localStorage persistence for JSON import | 2026-04-14 | 54fe534 | [260414-sk5-add-localstorage-persistence-for-json-im](./quick/260414-sk5-add-localstorage-persistence-for-json-im/) |
| 260414-t72 | Fix canvas disappearing after page refresh (isFirstRender save guard) | 2026-04-14 | 1693672 | [260414-t72-fix-canvas-disappearing-after-page-refre](./quick/260414-t72-fix-canvas-disappearing-after-page-refre/) |
| 260414-tkz | Add multiple handles to UrlNode for graph routing (8 handles + getClosestHandleIds) | 2026-04-14 | 7cde4b7 | [260414-tkz-add-multiple-handles-to-urlnode-for-grap](./quick/260414-tkz-add-multiple-handles-to-urlnode-for-grap/) |
| 260415-m0h | fix popover z-index covered by step node and remove redundant right node sidebar | 2026-04-15 | 085f6cd | [260415-m0h-fix-popover-z-index-covered-by-step-node](./quick/260415-m0h-fix-popover-z-index-covered-by-step-node/) |
| 260417-ljg | 連接點沒有對齊線 — center React Flow handles on node border midline | 2026-04-17 | 9f9b67b | [260417-ljg-center-handles-on-border-midline](./quick/260417-ljg-center-handles-on-border-midline/) |
| 260418-gy5 | Unify Placement and Cluster UX: derive Global Node from placements length and replace Cluster text input with add-button pattern | 2026-04-18 | 1a3f8f2 | [260418-gy5-unify-placement-and-cluster-ux-derive-gl](./quick/260418-gy5-unify-placement-and-cluster-ux-derive-gl/) |
| 260418-uhb | Add tooltip to warning icon in Score Ranking panel explaining weak-page criterion | 2026-04-18 | 21901e0 | [260418-uhb-add-tooltip-to-warning-icon-in-score-ran](./quick/260418-uhb-add-tooltip-to-warning-icon-in-score-ran/) |
| 260419-do7 | increase filter panel text sizes | 2026-04-19 | 376ec99 | [260419-do7-increase-filter-panel-text-sizes](./quick/260419-do7-increase-filter-panel-text-sizes/) |
| 260419-dr5 | 製作 Resizer component 並修復 Score Panel 的 Resizer | 2026-04-19 | 72a5d15 | [260419-dr5-resizer-component-score-panel-resizer](./quick/260419-dr5-resizer-component-score-panel-resizer/) |
| 260419-etx | 點擊 node 時 highlight 其相連路線 (canvas click + sidebar) | 2026-04-19 | 3275e26 | [260419-etx-node-highlight-route-feature](./quick/260419-etx-node-highlight-route-feature/) |
| 260419-kr4 | Implement Export Dropdown with Copy for AI in Toolbar | 2026-04-19 | 44677ed | [260419-kr4-implement-export-dropdown-with-copy-for-](./quick/260419-kr4-implement-export-dropdown-with-copy-for-/) |
| 260419-m0t | Refactor App.tsx: extract useGraphAnalytics, useHighlightedNodes, useDialogState hooks | 2026-04-19 | 3aa7dfb | [260419-m0t-refactor-app-tsx-extract-hooks-and-compo](./quick/260419-m0t-refactor-app-tsx-extract-hooks-and-compo/) |
| 260419-ppw | Refactor App.tsx phase 2: serializeGraph + useNodeCallbacks + useScenarioHandlers + useCanvasHandlers | 2026-04-19 | fd27fd5 | [260419-ppw-refactor-app-tsx-phase-2-extract-seriali](./quick/260419-ppw-refactor-app-tsx-phase-2-extract-seriali/) |
| 260419-riw | Gate Clear Canvas behind shadcn Alert Dialog confirmation | 2026-04-19 | 93f3a15 | [260419-riw-clear-canvas-alert-dialog](./quick/260419-riw-clear-canvas-alert-dialog/) |

## Session Continuity

Last session: 2026-04-19T05:38:14.523Z
Stopped at: Phase 11.2 context gathered
Resume file: .planning/phases/11.2-add-score-badge-tooltip-and-improvement-guidance-for-low-mid-nodes/11.2-CONTEXT.md
