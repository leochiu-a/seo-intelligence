# Phase 8: Crawl Depth & Orphan Detection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 08-crawl-depth-orphan-detection
**Areas discussed:** Depth & orphan indicators, Sidebar layout changes, Canvas node badges

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Root node designation | How does the user mark a node as root? Toggle in EditPopover? What if no root is set? | |
| Depth & orphan indicators | What icons/colors distinguish depth warning, unreachable, and orphan from weak-node amber TriangleAlert? | ✓ |
| Sidebar layout changes | How to display crawl depth alongside scores? Orphan grouping in sidebar? | ✓ |
| Canvas node badges | How do depth/orphan warnings appear on the node card? | ✓ |

---

## Depth & Orphan Indicators

### Depth Warning Color

| Option | Description | Selected |
|--------|-------------|----------|
| Orange/amber (Recommended) | Amber tone like weak-node but with a different icon. Familiar warning color, distinct via icon shape. | ✓ |
| Blue/info tone | Blue to signal 'informational warning' rather than danger. | |
| Purple | Distinct from all existing colors. Unique identity for depth. | |

**User's choice:** Orange/amber
**Notes:** Keeps depth in the warning family, differentiated by icon shape rather than color.

### Orphan Visual Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Red with Unplug icon (Recommended) | Red signals highest severity. Unplug icon communicates 'disconnected'. | ✓ |
| Red with CircleSlash icon | CircleSlash (Ø) conveys 'blocked/prohibited'. | |
| Amber with different icon | Keep amber family, distinguish only by icon. | |

**User's choice:** Red with Unplug icon
**Notes:** None.

### Unreachable Node Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Same red as orphan (Recommended) | Use same red Unplug icon but label says 'Unreachable'. Keeps palette simple. | ✓ |
| Darker red / different icon | Distinct treatment to separate unreachable from orphan. | |
| You decide | Let Claude choose. | |

**User's choice:** Same red as orphan
**Notes:** None.

---

## Sidebar Layout Changes

### Depth Display in Sidebar Row

| Option | Description | Selected |
|--------|-------------|----------|
| Inline after score (Recommended) | Show depth as small number/badge next to score. Compact, no layout change. | ✓ |
| Separate line below score | Depth gets its own line. More visible but rows taller. | |
| Column-style with header | Add a 'Depth' column header. Most structured but needs sidebar width. | |

**User's choice:** Inline after score
**Notes:** None.

### Orphan Grouping in Sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| Section headers (Recommended) | Labeled section dividers for orphan/unreachable above main ranked list. | ✓ |
| Inline with red badge only | No separate section. Orphans stay in ranked list with red badge. | |
| Collapsible alert panel at top | Collapsible alert box at sidebar top showing all issues. | |

**User's choice:** Section headers
**Notes:** None.

---

## Canvas Node Badges

### Badge Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Subtitle line with Weak (Recommended) | Add depth/orphan indicators in subtitle row alongside Weak. Top badges stay tier+global only. | ✓ |
| Top badge row | Add as colored badges next to tier and global. More prominent but crowded. | |
| Split: orphan top, depth subtitle | Orphan badge at top (severity), depth in subtitle (informational). | |

**User's choice:** Subtitle line with Weak
**Notes:** None.

### Root Node Badge

| Option | Description | Selected |
|--------|-------------|----------|
| Home icon + Root badge (Recommended) | Small Home icon badge in top badge row. Clear visual anchor for BFS start. | ✓ |
| No extra indicator | Root designation in EditPopover only. No visual on canvas. | |
| You decide | Let Claude choose. | |

**User's choice:** Home icon + Root badge
**Notes:** None.

---

## Claude's Discretion

- Root toggle UI details in EditPopover (follow existing Global toggle pattern)
- Exact lucide icon for depth >3 warning
- BFS implementation details
- Global node handling in BFS
- Exact Tailwind colors for indicators

## Deferred Ideas

None — discussion stayed within phase scope.
