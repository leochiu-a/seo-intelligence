---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: verifying
stopped_at: Completed 10-outbound-link-warning-02-PLAN.md
last_updated: "2026-04-17T07:28:59.250Z"
last_activity: 2026-04-17
progress:
  total_phases: 21
  completed_phases: 10
  total_plans: 18
  completed_plans: 19
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** Let PMs visually plan and simulate internal link structures — and immediately see which pages will rank highest — before any code is written or deployed.
**Current focus:** Phase 10 — outbound-link-warning

## Current Position

Phase: 999.1
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-17 - Completed quick task 260417-ljg: 連接點沒有對齊線

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

## Accumulated Context

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

## Session Continuity

Last session: 2026-04-17T07:25:04.263Z
Stopped at: Completed 10-outbound-link-warning-02-PLAN.md
Resume file: None
