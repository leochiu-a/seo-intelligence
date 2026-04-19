# SEO Internal Link Planner

## What This Is

A visual SEO internal link planning tool for PMs and SEO engineers to model and optimize website link structures. Users build a graph on a canvas by dragging URL template nodes and connecting them with directed edges, then the tool calculates a PageRank-style score to reveal which pages carry the most link equity.

## Core Value

Let PMs visually plan and simulate internal link structures — and immediately see which pages will rank highest — before any code is written or deployed.

## Current Milestone: v2.0 SEO Analysis Depth

**Goal:** Close the gap between the tool's topology-only scoring and real SEO analysis by adding crawl depth, orphan detection, outbound limits, and scenario comparison

**Target features:**
- Crawl depth indicator with 3-click warning — sidebar displays shortest path depth from root node, warns when >3
- Scenario diff (Current vs Proposed) — side-by-side comparison with per-node score deltas
- Orphan node independent alert — distinguish inbound=0 (orphan) from low-score (weak), with dedicated warning
- Outbound link limit warning — flag nodes with >150 total outbound links

## Requirements

### Validated

- [x] PM can create URL template nodes on a canvas — Validated in Phase 1: Canvas Editor
- [x] Each node has a configurable **page count** — Validated in Phase 1: Canvas Editor
- [x] Directed edges with configurable **link count** — Validated in Phase 1: Canvas Editor
- [x] Canvas supports drag-to-create and connect nodes — Validated in Phase 1: Canvas Editor
- [x] PageRank-style score calculated per node — Validated in Phase 2: Scoring & Analysis
- [x] Nodes visually sized and colored by score — Validated in Phase 2: Scoring & Analysis
- [x] Sidebar shows all pages ranked by score — Validated in Phase 2: Scoring & Analysis
- [x] Weak/isolated pages automatically flagged — Validated in Phase 2: Scoring & Analysis
- [x] Export graph data as CSV and JSON — Validated in Phase 3: Scenarios & Export
- [x] Nodes can be designated as "global" with named placements and per-placement link counts — Validated in Phase 4: Global Nodes
- [x] Placement autocomplete in edit popover — Validated in Phase 6: Placement Autocomplete
- [x] Placement-centric global filter — Validated in Phase 7: Placement-Centric Filter
- [x] Filter panel groups by unique placement name — Validated in Phase 7: Placement-Centric Filter
- [x] Sidebar displays crawl depth (shortest path from root) per node, with >3 click warning — Validated in Phase 8: Crawl Depth & Orphan Detection
- [x] Orphan nodes (inbound=0) get dedicated alert distinct from weak nodes — Validated in Phase 8: Crawl Depth & Orphan Detection

### Active

- (none — all v2.0 SEO Analysis Depth requirements validated)

### Validated (Phase 9)

- [x] User can create, switch, rename, and delete named scenarios (e.g. "Current", "Proposal A") — Validated in Phase 9: Scenario Comparison
- [x] Each scenario has its own fully independent graph state — Validated in Phase 9: Scenario Comparison
- [x] Scenarios persist in localStorage under `seo-planner-scenarios`; auto-migrates old single-graph data to "Default" scenario — Validated in Phase 9: Scenario Comparison

### Validated (Phase 10)

- [x] Nodes with >150 total outbound links flagged with red warning on canvas subtitle and red-highlighted count in sidebar; total = explicit edge linkCounts + implicit global-node placement sum for non-global sources — Validated in Phase 10: Outbound Link Warning

### Validated (Phase 11.1)

- [x] PM Health Check Panel: [Score | Health] tab toggle on right sidebar, Health tab renders HealthPanel with 3-metric badges (Links, Depth, Tags), warnings-first sort, "Show warnings only" toggle, and summary line — Validated in Phase 11.1: PM Health Check Panel

### Validated (Phase 11.2)

- [x] Low/Mid/High score tier badges on canvas nodes show hover tooltips explaining link equity tier and providing actionable improvement guidance — Validated in Phase 11.2: Score Badge Tooltip

### Out of Scope

- Real website crawling / importing live URL data — focus is simulation, not auditing
- User authentication / multi-user collaboration — MVP is single-user
- Detailed content analysis or keyword tracking — out of SEO scope for this tool

## Context

- Target users: non-technical PMs who think in flows/diagrams, and SEO engineers who want to quantify link equity
- Primary use case: optimizing existing website internal link structure, not designing from scratch
- URL templates use placeholder syntax like `<destination-id>` to represent dynamic segments; PM fills in page count to indicate scale
- PageRank calculation must account for: (1) how many pages a template represents, (2) how many links each page places to the destination, (3) the recursive nature of link equity flow
- Tech stack not yet decided — build as Web MVP first

## Constraints

- **Audience**: Non-technical PMs must find it intuitive — minimize jargon, maximize visual feedback
- **MVP scope**: Single-user, browser-based, no backend required initially
- **Algorithm**: PageRank-like (iterative, dampening factor) — not a simple link-count sum

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| URL templates with page count instead of enumerating real URLs | Keeps the tool practical for large sites; PMs think in templates not individual URLs | — Pending |
| PageRank-style scoring (not simple count) | Reflects real SEO link equity propagation; more actionable than raw link counts | — Pending |
| Web MVP first, tech stack TBD | Avoid premature commitment before validating UX approach | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-18 — Phase 11.1 complete: PM Health Check Panel with [Score|Health] tab toggle, 3-metric badges (Links/Depth/Tags), warnings-first sort, and Show Warnings filter*
