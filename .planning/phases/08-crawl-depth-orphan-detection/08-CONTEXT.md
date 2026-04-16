# Phase 8: Crawl Depth & Orphan Detection - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 adds BFS-based crawl depth calculation from a user-designated root node, with depth display in the sidebar, depth >3 warnings on both canvas and sidebar, unreachable node alerts, and dedicated orphan node (zero inbound edges) detection distinct from the existing weak-node indicator. Users can designate any node as "root" via the edit popover.

New capabilities like scenario comparison, outbound link warnings, or topical clustering are NOT in scope — those belong to Phases 9, 10, and backlog items.

</domain>

<decisions>
## Implementation Decisions

### Root Node Designation
- **D-01:** User designates root via a toggle in EditPopover (same pattern as the existing "Global" toggle from Phase 4). Only one node can be root at a time — toggling root on one node removes it from the previous root.
- **D-02:** Root node displays a **Home icon + "Root" badge** in the top badge row alongside tier and global badges. Uses `lucide-react` `Home` icon.
- **D-03:** Root designation persists in `UrlNodeData` (new `isRoot?: boolean` field) and is saved/restored via localStorage, same as `isGlobal`.
- **D-04:** If no root is set, depth calculation is skipped — sidebar shows "—" for depth and a prompt to designate a root node.

### Depth Calculation
- **D-05:** BFS shortest-path from root node to all other nodes, using directed edges (following edge direction: source → target).
- **D-06:** Depth value is an integer (0 for root, 1 for direct children, etc.). Unreachable nodes get `Infinity` depth.

### Depth Warning Indicators
- **D-07:** Depth >3 warning uses **amber/orange color** with a distinct icon (not TriangleAlert — use a different lucide icon like `ArrowDownToLine` or similar). This keeps the amber warning family but distinguishes from weak-node TriangleAlert via icon shape.
- **D-08:** Depth indicator appears **inline in the subtitle line** of the canvas node card, alongside page count and weak indicator. Format: `100 pages · ⚠ Weak · Depth 5 ⚠`
- **D-09:** In the sidebar, depth appears **inline after the score** on the same line. Format: `0.1523 · Depth 5 ⚠`. Depth ≤3 shows number only (no warning icon).

### Orphan Node Detection
- **D-10:** Orphan = zero inbound edges, excluding root node. This is distinct from weak (low score) and unreachable (no path from root).
- **D-11:** Orphan nodes use **red color** with **Unplug icon** (`lucide-react` `Unplug`). Visually distinct from amber weak (TriangleAlert) indicator.
- **D-12:** Orphan indicator appears in the **subtitle line** of the canvas node card. Format: `1 page · 🔴 Orphan`

### Unreachable Node Detection
- **D-13:** Unreachable nodes (infinite depth, i.e., no BFS path from root) use the **same red color and Unplug icon** as orphans, but label says "Unreachable" instead of "Orphan". A node can be both orphan AND unreachable — show the more severe label ("Orphan" implies unreachable).

### Sidebar Organization
- **D-14:** Orphan and unreachable nodes get a **dedicated section with header** at the top of the sidebar, above the main score ranking list. Section header format: `🔴 Orphan Pages (N)` / `🔴 Unreachable (N)`.
- **D-15:** Weak nodes remain in the main ranked list with their existing amber TriangleAlert — no separate section for weak nodes.
- **D-16:** Orphan section appears above unreachable section, both above the main "Score Ranking" list.

### Claude's Discretion
- Exact lucide icon for depth >3 warning (suggested: `ArrowDownToLine`, `Layers`, or `SignalLow` — pick whichever reads best at 11-14px)
- Root toggle UI details in EditPopover (checkbox vs toggle switch — follow existing Global toggle pattern)
- BFS implementation details (standard queue-based BFS in `graph-utils.ts`)
- How to handle global nodes in BFS (global nodes are implicitly linked from all non-global nodes — include synthetic edges in BFS)
- Exact Tailwind color values for red orphan indicator (suggested: `text-red-500`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — DEPTH-01~05, ORPHAN-01~03 are all in scope for Phase 8

### Existing Codebase
- `src/lib/graph-utils.ts` — `UrlNodeData` interface (add `isRoot`), `calculatePageRank`, `identifyWeakNodes`, `buildUrlTree`; Phase 8 adds `calculateCrawlDepth` and `identifyOrphanNodes` here
- `src/components/UrlNode.tsx` — node component with badge area (tier, global) and subtitle (page count, weak); Phase 8 adds root badge, depth indicator, orphan indicator
- `src/components/ScoreSidebar.tsx` — ranked list; Phase 8 adds orphan/unreachable sections, depth display per row
- `src/components/EditPopover.tsx` — node configuration; Phase 8 adds root toggle (like existing global toggle)
- `src/App.tsx` — main shell; Phase 8 adds depth computation, orphan detection, and passes new props

### Prior Phase Decisions
- `.planning/phases/01-canvas-editor/01-CONTEXT.md` — Node card design: n8n-style white card with accent border
- `.planning/phases/02-scoring-analysis/02-CONTEXT.md` — D-05~D-07: Weak node detection (mean-stddev), amber TriangleAlert icon, warning in sidebar+canvas
- `.planning/phases/03-scenarios-export/03-CONTEXT.md` — localStorage persistence pattern; root designation must persist too

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `identifyWeakNodes(scores)` in `graph-utils.ts` — returns `Set<string>` of weak node IDs; orphan detection follows same pattern
- `buildUrlTree(nodes, scores)` in `graph-utils.ts` — URL tree for sidebar ordering; depth BFS is separate from this (BFS follows graph edges, not URL hierarchy)
- `UrlNode` badge row pattern — flex wrapper for tier + global badges; root badge slots in here
- `UrlNode` subtitle pattern — page count + weak indicator in 11px text; depth and orphan indicators add to this line
- `EditPopover` global toggle — checkbox/toggle pattern reusable for root designation
- `lucide-react` already installed — `Home`, `Unplug`, and depth warning icon available

### Established Patterns
- Pure function + TDD in `graph-utils.ts` — `calculateCrawlDepth` and `identifyOrphanNodes` follow this pattern
- Node data enrichment in `App.tsx` via `enrichedNodes` useMemo — add `isOrphan`, `isUnreachable`, `crawlDepth` fields
- `ScoreSidebar` receives `nodes`, `scores`, `weakNodes` as props — add `orphanNodes`, `unreachableNodes`, `depthMap` props

### Integration Points
- `graph-utils.ts`: add `isRoot?: boolean` to `UrlNodeData`, add `calculateCrawlDepth(nodes, edges, rootId): Map<string, number>`, add `identifyOrphanNodes(nodes, edges): Set<string>`
- `App.tsx`: compute depth map and orphan set via `useMemo`, pass to sidebar and enrich nodes
- `UrlNode.tsx`: render root badge, depth warning, orphan indicator
- `ScoreSidebar.tsx`: render orphan/unreachable sections, depth per row
- `EditPopover.tsx`: add root toggle
- localStorage serialization: include `isRoot` field (same as `isGlobal` pattern)
- Export JSON/CSV: include `isRoot` and `crawlDepth` fields

</code_context>

<specifics>
## Specific Ideas

- Root badge style: same pattern as Global badge — `bg-violet-100 text-violet-700` or similar warm color with Home icon at 9px
- Orphan red indicator: `text-red-500` with `Unplug` icon at 11px in subtitle line
- Depth warning: amber icon (distinct from TriangleAlert) at 11px in subtitle, only shown when depth >3
- Sidebar orphan section: light red background header (`bg-red-50`) to visually separate from score ranking
- BFS should use directed edges (source → target) to model real crawl behavior — a page links outward, crawler follows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-crawl-depth-orphan-detection*
*Context gathered: 2026-04-16 via /gsd:discuss-phase*
