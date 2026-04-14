# SEO Internal Link Planner

## What This Is

A visual SEO internal link planning tool for PMs and SEO engineers to model and optimize website link structures. Users build a graph on a canvas by dragging URL template nodes and connecting them with directed edges, then the tool calculates a PageRank-style score to reveal which pages carry the most link equity.

## Core Value

Let PMs visually plan and simulate internal link structures — and immediately see which pages will rank highest — before any code is written or deployed.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] PM can create URL template nodes on a canvas (e.g. `/category/<dest>/<cat>/list`)
- [ ] Each node has a configurable **page count** (how many real pages this template represents)
- [ ] Directed edges between nodes represent internal links; each edge has a configurable **link count** (average links per source page pointing to destination)
- [ ] Canvas supports drag-to-create nodes and right-click / drag-from-edge to connect nodes
- [ ] PageRank-style score calculated per node, weighted by page count and link count
- [ ] Nodes are visually sized and colored by their score (larger + greener = higher score)
- [ ] Sidebar shows all pages ranked by score (high → low)
- [ ] Weak/isolated pages (low inbound links) are automatically flagged
- [ ] Multiple graph scenarios can be created and compared side-by-side
- [ ] Export graph data as CSV and JSON
- [ ] Nodes can be designated as "global" with named placements (Header Nav, Footer, etc.) and per-placement link counts; all other nodes auto-contribute inbound links without manual edges
- [ ] A filter panel lets users highlight global nodes and their placements on the canvas, dimming unrelated nodes

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
*Last updated: 2026-04-14 after v1.1 milestone initialization*
