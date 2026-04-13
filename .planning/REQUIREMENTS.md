# Requirements: SEO Internal Link Planner

**Defined:** 2026-04-13
**Core Value:** Let PMs visually plan and simulate internal link structures — and immediately see which pages will rank highest — before any code is written or deployed.

## v1 Requirements

### Canvas Editor

- [x] **CANVAS-01**: User can add URL template nodes to a canvas by dragging from a sidebar or double-clicking on blank canvas
- [x] **CANVAS-02**: Nodes display the URL template string (e.g. `/category/<dest>/<cat>/list`)
- [x] **CANVAS-03**: User can connect two nodes with a directed edge by dragging from a node's edge handle or via right-click context menu
- [x] **CANVAS-04**: Nodes and edges can be selected, moved, and deleted
- [x] **CANVAS-05**: Canvas supports pan and zoom

### Node Configuration

- [x] **NODE-01**: Each node has a configurable URL template string with `<placeholder>` syntax
- [x] **NODE-02**: Each node has a configurable **page count** representing how many real pages this template produces (e.g. 100 category pages)
- [x] **NODE-03**: Node label displays both the URL template and page count

### Edge Configuration

- [x] **EDGE-01**: Each directed edge has a configurable **link count** — average number of links a source page places to the destination template
- [x] **EDGE-02**: Edge label displays the link count

### PageRank Scoring

- [x] **SCORE-01**: System calculates an iterative PageRank-style score for each node, weighted by page count and link count
- [x] **SCORE-02**: Scores are recalculated automatically when the graph changes
- [x] **SCORE-03**: Node visual size scales with its score
- [x] **SCORE-04**: Node color reflects score level (e.g. green = high, red/orange = low)

### Sidebar & Analysis

- [x] **SIDEBAR-01**: Sidebar lists all nodes ranked by score (descending)
- [x] **SIDEBAR-02**: Weak/isolated pages (below a threshold of inbound link equity) are flagged with a warning indicator
- [x] **SIDEBAR-03**: Clicking a sidebar item highlights/selects the corresponding node on canvas

### Scenario Comparison

- [ ] **SCENARIO-01**: User can create multiple named graph scenarios (e.g. "Current", "Proposal A")
- [ ] **SCENARIO-02**: User can switch between scenarios
- [ ] **SCENARIO-03**: Scenarios are saved in-browser (localStorage or equivalent)

### Export

- [x] **EXPORT-01**: User can export current graph as JSON (nodes, edges, scores)
- [x] **EXPORT-02**: User can export score ranking as CSV (url_template, page_count, score)

## v2 Requirements

### Advanced Analysis

- **V2-01**: Side-by-side visual comparison of two scenarios
- **V2-02**: "What if" simulation — drag a link and preview score change before confirming
- **V2-03**: Suggested links — highlight nodes that would benefit most from more inbound links

### Collaboration

- **V2-04**: Backend persistence and shareable project URLs
- **V2-05**: Multi-user editing

### Import

- **V2-06**: Import existing site structure from crawl data (CSV/sitemap)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real website crawling | Tool is for simulation, not auditing; keep MVP simple |
| User auth / accounts | MVP is single-user, browser-based |
| Keyword / content analysis | Out of scope — focus is link equity only |
| Mobile responsive UI | PM tool, primarily desktop use |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CANVAS-01 ~ CANVAS-05 | Phase 1 | Pending |
| NODE-01 ~ NODE-03 | Phase 1 | Pending |
| EDGE-01 ~ EDGE-02 | Phase 1 | Pending |
| SCORE-01 ~ SCORE-04 | Phase 2 | Pending |
| SIDEBAR-01 ~ SIDEBAR-03 | Phase 2 | Pending |
| SCENARIO-01 ~ SCENARIO-03 | Phase 3 | Pending |
| EXPORT-01 ~ EXPORT-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after initialization*
