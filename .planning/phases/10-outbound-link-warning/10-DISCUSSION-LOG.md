# Phase 10: Outbound Link Warning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 10-outbound-link-warning
**Areas discussed:** Outbound count formula, Canvas indicator style, Sidebar display treatment, Threshold configurability

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Outbound count formula | What goes into the total — explicit edges only, or include global placement injection? | ✓ |
| Canvas indicator style | Where/how the >150 warning renders on the node card. | ✓ |
| Sidebar display treatment | Always visible vs. silent-under-threshold; inline vs. dedicated section. | ✓ |
| Threshold configurability | Hardcoded, module constant, or user-configurable UI knob. | ✓ |

**User's choice:** All four areas selected.

---

## Outbound Count Formula

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror PageRank injection (Recommended) | explicit edges + (for non-global source: sum-of-placements per global node). Global-to-global excluded — matches Phase 4 D-01 exactly. | ✓ |
| Explicit edges only | Ignore implicit global contribution. Simpler but under-counts real per-page link load. | |
| Explicit edges + placement-slot count | Count each placement as +1 (ignore linkCount). Closer to "number of link slots" than "average links per page". | |

**User's choice:** Mirror PageRank injection (Recommended)
**Notes:** Reuses established mental model. Non-global source: add `sum(placements.linkCount)` for each global. Global source: implicit contribution = 0.

---

## Canvas Indicator Style

| Option | Description | Selected |
|--------|-------------|----------|
| Subtitle line, red TriangleAlert + count (Recommended) | `1 page · ⚠ 167 links` in red-500. Consistent with weak/orphan/depth inline pattern. Only shown when over threshold. | ✓ |
| Dedicated red badge in badge row | `150+` pill alongside Tier/Global/Root. More prominent but crowds badges. | |
| Subtitle count always + red only when over | Always shows `167 links` in muted color, turns red-500 when >150. More info but noisier. | |

**User's choice:** Subtitle line, red TriangleAlert + count (Recommended)
**Notes:** Indicator only shown when over threshold. Coexists with other warnings in subtitle, shown after orphan/unreachable/weak/depth.

---

## Sidebar Display Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on score line, red only when >150 (Recommended) | `0.1523 · Depth 2 · 167 links` — count always visible, red when over. Mirrors Phase 8 depth display pattern. | ✓ |
| Inline, silent under threshold | No text unless >150. Cleaner when nothing's wrong but requires checking canvas to see counts. | |
| Dedicated "Over-linked" section at top | Like orphan section — red header + list of offenders above Score Ranking. More severe treatment. | |

**User's choice:** Inline on score line, red only when >150 (Recommended)
**Notes:** Count always visible on the score line; red-500 styling applies only when >150.

---

## Threshold Configurability

| Option | Description | Selected |
|--------|-------------|----------|
| Module-private constant in graph-utils.ts (Recommended) | `const OUTBOUND_WARNING_THRESHOLD = 150` next to DAMPING/MAX_ITER/EPSILON. Matches existing style, trivially tweakable. | ✓ |
| Hardcoded inline at the check site | `outbound > 150` directly where used. Matches Phase 8 `depth > 3` pattern exactly. | |
| User-configurable via settings UI | Adds an in-app knob. Scope expansion — could be a future phase. | |

**User's choice:** Module-private constant in graph-utils.ts (Recommended)
**Notes:** Colocated with existing module constants. DRY since referenced from canvas and sidebar.

---

## Claude's Discretion

- Exact function name (suggested: `calculateOutboundLinks`)
- Tailwind separator spacing when multiple subtitle indicators stack
- Whether to thread `outboundCount` / `isOverLinked` through `enrichedNodes` (likely yes, mirroring Phase 8 pattern)
- JSON export inclusion of `outboundCount`
- TDD test enumeration for the pure function

## Deferred Ideas

- User-configurable threshold UI (possible future phase)
- CSV export column for outbound count (not required by OUTBOUND-03)
- Suggested-fixes actionable output (belongs to backlog Phase 999.9)
