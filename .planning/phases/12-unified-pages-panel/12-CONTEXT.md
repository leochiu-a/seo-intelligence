# Phase 12: Unified Pages Panel - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 replaces the separate **Score** and **Health** tabs with a single **Pages** tab. Every node in the graph appears as one row showing URL template, score, depth, inbound count, outbound count, tier badge, and warning badges. Default order surfaces the weakest pages first (orphan → unreachable → ≥1 warning → score ascending). PM can switch sort via a dropdown and filter by "warnings only" and/or tier. Clicking a row pans/highlights the canvas node (same behavior as today's ScorePanel).

**In scope:**
- New `PagesPanel` component replacing `ScorePanel` + `HealthPanel`
- SidePanel tabs reduce to **Filter + Pages** (2 tabs)
- `inboundMap` memo added to `useGraphAnalytics` (parallel to `outboundMap`)
- Sort dropdown + two filter controls ("Show warnings only", "Filter by tier")
- Two-line compact row layout with inline tier badge and warning badges
- Tier summary block at top of panel ("X Low / Y Mid / Z High")
- Migration/deletion of ScorePanel.tsx + HealthPanel.tsx and their tests

**Out of scope:**
- Filter by individual warning type (Orphan/Depth/Outbound/Tags as separate toggles) — deferred
- Tree view toggle — hierarchy is dropped entirely
- Click-through to canvas from filter/cluster rows (that's FilterPanel's job)
- Inbound/outbound per-page drill-down list — that's Phase 13 (Selected Node tab)

</domain>

<decisions>
## Implementation Decisions

### Panel Structure
- **D-01:** **Replace both** ScorePanel and HealthPanel. Delete `packages/web/src/components/ScorePanel.tsx` and `packages/web/src/components/HealthPanel.tsx`. `SidePanel` tabs become **Filter | Pages** (2 tabs). Phase 13 will add a third Selected Node tab later — do not pre-build that tab in Phase 12.
- **D-02:** New component file: `packages/web/src/components/PagesPanel.tsx`. Self-contained, receives the same props ScorePanel already does (`nodes`, `scores`, `weakNodes`, `orphanNodes`, `unreachableNodes`, `depthMap`, `outboundMap`, `rootId`, `onNodeHighlight`, `allScoreValues`) **plus** a new `inboundMap: Map<string, number>`.

### Default Sort ("Weakness")
- **D-03:** Default sort is **issue-tier order**, not a composite score. Group order:
  1. **Orphan** nodes (zero inbound) — topmost
  2. **Unreachable** nodes (depth = Infinity, not in orphan set)
  3. **Warning** nodes (`hasAnyWarning` from `getHealthStatus` is true, and NOT in the first two groups)
  4. **Clean** nodes — no warnings
  Within each group, sort by **score ascending** (weakest first). Tie-break by URL template alphabetically for determinism.
- **D-04:** `buildUrlTree` / tree-hierarchy rendering is **removed**. Depth is shown as text in the meta line (e.g., `Depth 3 ⚠`) — the spatial indentation cue is sacrificed for sort consistency.

### Sort Controls
- **D-05:** A **"Sort by" dropdown** sits at the top of the Pages panel. Options:
  - Issue-tier order (default, the D-03 grouping)
  - Score (high → low)
  - Score (low → high)
  - Depth (deep → shallow)
  - Outbound (high → low)
  - Inbound (low → high)
  - URL template (A → Z)
  - The dropdown is local state — not persisted. Opening the panel always resets to "Issue-tier order".

### Filters
- **D-06:** Two filter controls live above the list, below the sort dropdown:
  1. **"Show warnings only"** checkbox — hides rows where all of (orphan / unreachable / any HealthPanel warning / weak) are false. Orphan and unreachable count as warnings (they already carry `hasWarn = true` via health status + dedicated sets).
  2. **"Filter by tier"** — three toggleable tier badges (Low / Mid / High). Clicking toggles inclusion. Starts with all three ON (no filter). When any combination is off, rows of excluded tiers are hidden.
- **D-07:** Filters **AND** together. Show-warnings + tier-filter combined: a row passes only if it passes both conditions.
- **D-08:** Filters are local state — not persisted. Opening the panel resets to "all pass".
- **D-09:** Per-warning-type filter (Orphan-only, Depth-only, etc.) is **deferred** — see Deferred Ideas. The two filters above are sufficient for v1.

### Row Layout
- **D-10:** **Two-line compact** (mirrors current ScorePanel line structure):
  - **Line 1:** cluster dots + URL template (truncated) + warning badge(s) right-aligned
  - **Line 2:** `{score.toFixed(4)} · Depth {n} · in {x} · out {y}` + tier badge right-aligned
- **D-11:** Warning badges on line 1 follow HealthPanel's **single `TriangleAlert` icon** pattern with a combined tooltip (reuse `buildTooltipContent`). Do NOT render three separate Link/Depth/Tag icons per row — the tooltip enumerates which warnings fired. Orphan/Unreachable take priority: render `Unplug` (red) in place of `TriangleAlert` when node is orphan or unreachable; tooltip says "Orphan — no inbound links" or "Unreachable — no path from root".
- **D-12:** Tier badge on line 2 uses the existing `ScoreTierBadge` component at its current `sm` sizing — keeps the vocabulary consistent with canvas UrlNode badges.
- **D-13:** Depth "N/A" handling: if `rootId == null`, skip the `Depth` segment on line 2 entirely (don't render "Depth —"). Match current ScorePanel behavior.
- **D-14:** Inbound display: always render `in {count}` (never hidden), parallel to outbound. Zero inbound is visually important for orphan detection.
- **D-15:** Outbound over-threshold styling: keep the existing `text-red-500` on the count when `outbound > OUTBOUND_WARNING_THRESHOLD` (150). Same for `Depth > 3` → `text-amber-500`.

### Tier Summary
- **D-16:** A **summary block** at the top of the panel renders `"X Low · Y Mid · Z High"` as a single compact line (small muted text) — not a separate section with headers. Placement: above the sort dropdown, below any rootId-missing warning.
- **D-17:** Plus inline tier badge per row (D-12). "Both" option chosen by user — summary is a glanceable totals line; per-row badge is the detail.

### Visual Treatment for Orphan / Unreachable
- **D-18:** When default sort ("Issue-tier order") is active, render **red section banners** (`Orphan Pages (N)` / `Unreachable (N)`) before the rows in those groups — preserves the ScorePanel familiar UX for the most common sort.
- **D-19:** When any other sort is active, **drop the section banners** — orphan/unreachable rows still stand out by virtue of the red `Unplug` icon in the warning column and their (typically) low score.

### Data: inbound count
- **D-20:** Add `inboundMap: Map<string, number>` to `useGraphAnalytics` return type. Computed analogously to `outboundMap`:
  - For each edge (explicit): `inbound[target]++`
  - For global nodes: add implicit contribution — every **non-global** node counts once per placement-link towards each global node (mirrors outbound D-02 parity, Phase 10 D-02). Confirm this during research — if the semantic is "how many edges end here," the implicit contribution is equivalent to `(nonGlobalCount × globalPlacementSum)` for each global node.
  - Expose through the existing hook interface; thread to `SidePanel` → `PagesPanel` prop drilling.
- **D-21:** `identifyOrphanNodes` already computes inbound counts internally — refactor is OPTIONAL (do not block Phase 12 on this); if cheap, have the new `inboundMap` be the source and let `identifyOrphanNodes` read from it. Otherwise keep both independent.

### Tests
- **D-22:** Delete `ScorePanel.test.tsx` and `HealthPanel.test.tsx`. Create `PagesPanel.test.tsx` covering: default sort grouping, sort dropdown switching, warnings-only filter, tier filter, click-to-highlight callback, empty state.
- **D-23:** Keep `graph-analysis.test.ts` health helpers (`getHealthStatus`, `hasAnyWarning`, `buildTooltipContent`) — they are reused by PagesPanel. No tests deleted on the lib layer.
- **D-24:** If `inboundMap` is newly computed (D-20), add a unit test for the implicit global contribution in `graph-pagerank.test.ts` or `graph-analysis.test.ts` alongside `outboundMap` tests.

### Claude's Discretion
- Exact dropdown component (existing `Select` from `@/components/ui/select`, or simple `<select>` — prefer the shadcn Select for consistency with EditPopover).
- Exact tier filter UI primitive (three chips with toggle state, or a segmented control) — whatever keeps the top controls compact under 240px width.
- Whether to animate sort changes (probably not — keep it instant; list is small).
- Icon choice for orphan vs unreachable: `Unplug` for orphan (existing ScorePanel usage), consider `AlertCircle` or a different lucide icon for unreachable to differentiate — Claude picks; use whatever reads clearly at 14px.
- Whether the summary line shows counts or percentages — counts are more actionable; keep counts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current Code to Replace / Modify
- `packages/web/src/components/ScorePanel.tsx` — to be **deleted** after PagesPanel lands; copy visual idioms (renderClusterDots helper, row button structure, orphan/unreachable section banners, hover/click pattern).
- `packages/web/src/components/HealthPanel.tsx` — to be **deleted**; copy warning-tooltip pattern (`Tooltip` + `buildTooltipContent`) and "Show warnings only" checkbox interaction.
- `packages/web/src/components/SidePanel.tsx` — modify: remove `"score"` and `"health"` tab states, add `"pages"`, update default tab to `"pages"` (or keep `"filter"` — Claude's Discretion).
- `packages/web/src/hooks/useGraphAnalytics.ts` — extend: add `inboundMap` to `GraphAnalyticsResult` and the returned object.
- `packages/web/src/App.tsx` lines ~146–156 — destructure `inboundMap` from `useGraphAnalytics`, pass through to `SidePanel`.

### Existing Helpers to Reuse (do NOT re-implement)
- `packages/web/src/lib/graph-analysis.ts` — `getHealthStatus(node, depthMap, outboundMap)`, `hasAnyWarning(status)`, `buildTooltipContent(status)`, `OUTBOUND_WARNING_THRESHOLD` (= 150).
- `packages/web/src/lib/graph-pagerank.ts` — `classifyScoreTier(score, allScoreValues)` returns `'low' | 'mid' | 'high' | 'neutral'`.
- `packages/web/src/lib/cluster-colors.ts` — `getClusterColor(tag)` for cluster dots.
- `packages/web/src/components/ScoreTierBadge.tsx` — reuse the existing tier badge component.
- `@/components/ui/checkbox`, `@/components/ui/tooltip`, `@/components/ui/select` — shadcn primitives already in the codebase.

### Prior Phase Decisions (apply as-is)
- `.planning/phases/02-scoring-analysis/02-CONTEXT.md` D-02, D-05 — color tier vocabulary (green/amber/red) and weak threshold (mean − 1σ).
- `.planning/phases/08-crawl-depth-orphan-detection/08-CONTEXT.md` — depth warning at >3, orphan = zero inbound, unreachable = Infinity depth.
- `.planning/phases/10-outbound-link-warning/10-CONTEXT.md` — outbound threshold = 150, implicit global contribution formula.
- `.planning/phases/11.1-pm-internal-link-deep-placement-text-filter-warning/11.1-CONTEXT.md` — D-03 (3 health metrics Links/Depth/Tags), D-06 (row shape), D-09 (warnings-first sort), D-10 ("Show warnings only" toggle). All carry forward into PagesPanel.

### Roadmap
- `.planning/ROADMAP.md` Phase 12 entry — goal + success criteria are the ultimate scope contract.
- `.planning/ROADMAP.md` Phase 13 entry — Phase 12 should leave tab structure ready for Phase 13 to add a Selected Node tab (do NOT pre-build it).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useGraphAnalytics` hook already aggregates every piece of data the panel needs — no new orchestration needed; just extend the return type by one field (`inboundMap`).
- `buildTooltipContent(status)` already produces PM-friendly tooltip text listing which warnings fired. Reuse for the combined warning badge.
- `ScoreTierBadge` with `sm` sizing already exists and is used on the canvas — same vocabulary will read instantly for the PM.
- `SidePanel` already has tab-switching infrastructure and resizable width — change is just removing two tab buttons and adding one.

### Established Patterns
- Sidebar width is resizable (MIN_WIDTH=160, MAX_WIDTH=480, DEFAULT=240). PagesPanel row layout must read cleanly at 240px; two-line compact (D-10) fits.
- Click-row-to-highlight pattern (ScorePanel.handleClick): `setNodes` to select + `fitView` with 300ms duration + `onNodeHighlight?.(id)`. Copy this verbatim.
- Red section banners (ScorePanel.tsx lines ~101–172) for orphan/unreachable — same markup; conditionally rendered only in default sort mode.
- Warnings-first sort pattern (HealthPanel.tsx lines 58–62) — extend to the 4-group issue-tier order.

### Integration Points
- `App.tsx` change: destructure `inboundMap` from `useGraphAnalytics`, drop `onNodeHighlight` threading for score vs health (both collapse into pages), pass `inboundMap` through `SidePanel` prop list.
- `SidePanel.tsx` change: tabs array shrinks to `filter | pages`; import swap (ScorePanel + HealthPanel → PagesPanel).
- `useGraphAnalytics.ts` change: add `inboundMap` memo; no test regression on existing return fields.

</code_context>

<specifics>
## Specific Ideas

- The **default sort ordering** (D-03) is literally the visual concatenation of today's ScorePanel (orphan banner → unreachable banner → ranked tree) + HealthPanel (warnings-first) — the PM's current hunt pattern just becomes the default. Feels familiar while being uniform.
- **Dropdown label**: just "Sort by" — don't abbreviate or decorate. PM sees common pattern.
- **Sort options wording** (D-05): show human-readable directions, e.g. `Score (low → high)` not `Score asc`. Arrow is less ambiguous than words.
- **Tier filter interaction**: three small pills at the top (Low / Mid / High) with active=filled, inactive=outlined. Click toggles. Matches the visual vocabulary of the existing Low/Mid/High tier badges so there's no new metaphor.
- **Summary line example**: `3 Low · 5 Mid · 4 High · 2 orphan · 1 unreachable` — rolls the issue totals into the same line. Keep it to one line; if it overflows, drop the orphan/unreachable counts (already visible as section banners).
- **"Pages" is the name**. Not "Overview", not "Nodes", not "All Pages". Matches PM vocabulary and matches the user's original request.

</specifics>

<deferred>
## Deferred Ideas

- **Per-warning-type filter** (Orphan-only / Depth-only / Outbound-only / Tags-only / Weak-only toggles) — useful but expands the filter UI footprint. Revisit if PM asks for it after using v1.
- **Composite weakness score** (single numeric ranking across all issue dimensions) — rejected for v1 because it's opaque. If PM later says "I want one number that tells me how bad a page is," reconsider.
- **Tree view toggle** (keep flat sortable, but offer a button to switch back to buildUrlTree hierarchy) — rejected for v1 to keep the UI simple. Tree view still exists in git history if nostalgia strikes.
- **Filter persistence across sessions** — kept local/ephemeral for now. Likely PM wants a clean slate every session; revisit if feedback says otherwise.
- **Selected Node tab** (inbound/outbound per-page drill-down with clickable links) — that IS Phase 13. Do not pre-build.

</deferred>

---

*Phase: 12-unified-pages-panel*
*Context gathered: 2026-04-21 via /gsd:discuss-phase*
