# Phase 9: Scenario Comparison - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 09-scenario-comparison
**Areas discussed:** Scenario Switcher UI, New Scenario Origin, Comparison View Layout, Existing Data Migration

---

## Scenario Switcher UI

| Option | Description | Selected |
|--------|-------------|----------|
| Tab bar below toolbar | Horizontal row of tabs below header, double-click to rename, × to delete | ✓ |
| Dropdown in toolbar | 'Scenario: [Current ▼]' selector in top toolbar | |
| Left sidebar panel | Narrow panel listing scenarios as cards | |

**Sub-question: Rename/delete interaction**

| Option | Description | Selected |
|--------|-------------|----------|
| Double-click to rename, × to delete | Inline-editable on double-click | |
| Right-click context menu | Context menu on right-click | |
| Click to open popover | Gear/chevron opens rename/delete popover | ✓ |

**Sub-question: Minimum scenario count**

| Option | Description | Selected |
|--------|-------------|----------|
| Always at least 1 | Delete disabled when only one scenario exists | ✓ |
| Allow deleting all | Empty-state 'Create your first scenario' | |

---

## New Scenario Origin

| Option | Description | Selected |
|--------|-------------|----------|
| Clone current scenario | New scenario starts as a deep copy of current | |
| Always start blank | New scenario starts with empty canvas | |
| User chooses at creation time | Prompt: blank or clone? | ✓ |

**Sub-question: Default name**

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-increment: 'Scenario 1', 'Scenario 2'… | Generic incrementing names | ✓ |
| Prompt user to name it first | Name input before tab is created | |
| 'Untitled' (always the same) | Always 'Untitled', user renames | |

---

## Comparison View Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Score delta panel in sidebar | Lightweight table in sidebar with Score A, Score B, Delta | ✓ |
| Split-screen canvases | Two React Flow instances side by side | |
| Full-screen comparison modal | Full-screen modal overlay with delta table | |

**Sub-question: How to trigger comparison**

| Option | Description | Selected |
|--------|-------------|----------|
| Compare button in toolbar, scenario dropdowns | Toolbar button + two pickers in delta sidebar | ✓ |
| Right-click tab → 'Compare with…' | Context-driven from tab | |
| Always delta vs. previous tab | Automatic, no picker | |

**Sub-question: Nodes in only one scenario**

| Option | Description | Selected |
|--------|-------------|----------|
| Show as added/removed with distinct label | Green 'Added' / red 'Removed' labels | ✓ |
| Only show shared nodes | Comparison table limited to nodes in both | |
| Claude's discretion | Let Claude decide | |

**Note:** User subsequently decided to drop comparison diff entirely (SCENE-04, SCENE-05) from Phase 9.

---

## Existing Data Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-migrate to scenario named 'Default' | Existing graph wrapped into 'Default' automatically | ✓ |
| Silently drop old data, start fresh | New key, old data ignored | |
| Prompt the user to migrate | One-time banner asking user to confirm | |

**Sub-question: Storage structure**

| Option | Description | Selected |
|--------|-------------|----------|
| Single key with all scenarios as array | 'seo-planner-scenarios' holds full structure | ✓ |
| One key per scenario | Separate keys per scenario + meta key | |

**Sub-question: Old key cleanup**

| Option | Description | Selected |
|--------|-------------|----------|
| Remove old key after successful migration | Delete 'seo-planner-graph' after migrating | ✓ |
| Keep old key as backup | Leave old key intact | |

---

## Claude's Discretion

- Tab bar visual style (Tailwind classes, active/inactive states)
- Exact popover design for rename/delete per tab
- ID generation for new scenarios
- Whether switching scenarios saves current graph first or relies on the change-triggered save effect

## Deferred Ideas

- **SCENE-04 / SCENE-05: Score delta comparison panel** — user explicitly dropped from Phase 9 scope. Noted for a future phase after Phase 10.
- **Comparison: added/removed node labeling** — discussed but deferred with comparison feature.
