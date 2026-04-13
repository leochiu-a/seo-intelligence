# Roadmap: SEO Internal Link Planner

## Overview

Four phases deliver a browser-based visual tool for modeling internal link structures. Phase 0 scaffolds the project; Phase 1 builds the interactive canvas; Phase 2 layers in PageRank scoring and analysis; Phase 3 adds localStorage persistence and data export. All phases belong to Milestone 1: MVP.

## Milestones

- 🚧 **v1.0 MVP** - Phases 0-3 (in progress)

## Phases

- [x] **Phase 0: Project Setup** - Scaffold Vite + React + TypeScript project with Tailwind CSS and React Flow (completed 2026-04-13)
- [x] **Phase 1: Canvas Editor** - Interactive canvas with URL template nodes, directed edges, and inline configuration (completed 2026-04-13)
- [x] **Phase 2: Scoring & Analysis** - PageRank engine with visual node scoring and ranked sidebar (completed 2026-04-13)
- [ ] **Phase 3: Scenarios & Export** - localStorage graph persistence plus CSV/JSON export (scenarios dropped per D-01)

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
- [ ] 03-01-PLAN.md — localStorage graph persistence (save on change, restore on mount)
- [ ] 03-02-PLAN.md — JSON and CSV export buttons in toolbar with file download

**UI hint**: yes

## Progress

**Execution Order:** 0 → 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Project Setup | 1/1 | Complete   | 2026-04-13 |
| 1. Canvas Editor | 3/3 | Complete   | 2026-04-13 |
| 2. Scoring & Analysis | 2/2 | Complete   | 2026-04-13 |
| 3. Scenarios & Export | 0/2 | Not started | - |
