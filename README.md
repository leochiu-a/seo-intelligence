# SEO Internal Link Planner

A visual internal-link planning tool for PMs and SEO engineers. Build a directed graph of URL templates on a canvas, and the tool runs a PageRank-style algorithm in real time to show which pages will carry the most link equity — before any code is written or deployed.

## Core Value

> Let PMs visually plan and simulate internal link structures, and immediately see which pages will rank highest.

- **Target users**: non-technical PMs who think in flows/diagrams, and SEO engineers who want to quantify link equity
- **Primary use case**: optimizing an existing website's internal link structure (not designing from scratch)
- **MVP scope**: single-user, browser-based, no backend required

## Features

### Canvas Editor
- Add URL template nodes by dragging from the palette or double-clicking the canvas
- Each node has a configurable **URL template** and **page count** (how many pages the template represents)
- Draw **directed edges** between nodes by dragging from a handle; each edge has a configurable **link count**
- Select, move, and delete nodes and edges; pan and zoom the canvas
- Edit node and edge properties via an inline popover

### PageRank Scoring & Analysis
- PageRank recalculates **instantly** on every graph edit — no manual recalculate button
- Nodes are visually **sized and color-coded** by their score
- A sidebar ranks every node from highest to lowest score
- **Weak-page warnings**: nodes with low inbound link equity show a warning indicator in both the sidebar and on the canvas
- Clicking a sidebar row highlights the corresponding canvas node

### Global Nodes & Placements
- Toggle any node as **global**, meaning every other node implicitly links to it (e.g. Header, Footer, Breadcrumb)
- Each global node supports multiple named **placements** (e.g. `Header Nav`, `Footer Links`), each with its own link count
- Global nodes display a visible badge on the canvas
- PageRank automatically injects the "every non-global node → all global nodes" links into the calculation
- **Placement autocomplete**: when naming a placement, suggestions appear from placement names already used on other global nodes — reduces typos and keeps naming consistent

### Placement Filter Panel
- Filter panel groups by **unique placement name** (deduplicated across all global nodes) as the top-level checkbox
- Checking "Header" highlights every global node that carries a Header placement; all other nodes dim so you stay oriented in complex graphs
- Each placement entry expands to show which global nodes use it
- Unchecking all filters restores the canvas to normal opacity

### Persistence & Import / Export
- Graph (nodes + edges) auto-persists to `localStorage` and restores on refresh
- **JSON export** of nodes, edges, and scores
- **CSV export** of the score ranking (`url_template, page_count, score`)
- **JSON import** via the Import Dialog to restore an existing graph

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite 6
- **Canvas**: [React Flow](https://reactflow.dev) 11
- **UI**: Tailwind CSS + [Base UI](https://base-ui.com) + shadcn
- **Icons**: lucide-react
- **Font**: Geist Variable
- **Testing**: Vitest + Testing Library + jsdom

## Development

```bash
# Install
pnpm install

# Dev server
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint

# Production build
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
src/
├── App.tsx                    # Main canvas, state management, localStorage
├── components/
│   ├── UrlNode.tsx            # URL template node (global badge, score-driven style)
│   ├── LinkCountEdge.tsx      # Directed edge with link count label
│   ├── EditPopover.tsx        # Node editing (placement CRUD + autocomplete)
│   ├── Toolbar.tsx            # Add-node and import/export actions
│   ├── ScoreSidebar.tsx       # Ranked sidebar
│   ├── FilterPanel.tsx        # Placement-centric filter panel
│   ├── ImportDialog.tsx       # JSON import dialog
│   └── ui/                    # shadcn / Base UI primitives
├── hooks/
│   └── useFilterState.ts      # Filter checkbox state
└── lib/
    ├── graph-utils.ts         # PageRank, node/edge factory, serialization
    └── utils.ts               # cn() and other shared helpers
```

## Design Principles

- **Approachable for non-technical PMs**: minimize jargon, maximize visual feedback
- **PageRank, not raw counts**: iterative algorithm with a damping factor — reflects real link-equity propagation
- **URL templates + page count**: PMs already think in templates, not individual URLs; this scales to large sites without enumeration
- **Instant feedback**: every edit triggers an immediate recalculation and re-render

## Out of Scope

- Real website crawling or importing live URL data — this tool is for **simulation**, not auditing
- User authentication or multi-user collaboration — MVP is single-user
- Content analysis or keyword tracking — outside the SEO scope of this tool
