# Phase 12: Unified Pages Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 12-unified-pages-panel
**Areas discussed:** Old panels fate, Default sort, Row layout, Tree vs flat, Sort UI, Filters, Tier display

---

## Old panels fate

| Option | Description | Selected |
|--------|-------------|----------|
| Replace both (Recommended) | Delete ScorePanel.tsx + HealthPanel.tsx, SidePanel tabs become Filter / Pages. Phase 13 adds Selected Node → 3 tabs total. Cleanest, but existing tests need update. | ✓ |
| Keep Health, replace Score | Pages replaces ScorePanel, HealthPanel stays as dedicated diagnostic. Tabs: Filter / Pages / Health. Diagnostic data stays dedicated; 4 tabs after Phase 13. | |
| Add Pages alongside | Keep both old panels, add Pages. Tabs: Filter / Score / Health / Pages. Most conservative, but PM may still be confused. | |

**User's choice:** Replace both
**Notes:** Confirms clean break; downstream plan must handle test migration.

---

## Default sort ("weakness" definition)

| Option | Description | Selected |
|--------|-------------|----------|
| Issue-tier order (Recommended) | Orphan → Unreachable → ≥1 warning → clean (score asc within each group). Mirrors current ScorePanel banners + HealthPanel warnings-first. Most familiar for PM. | ✓ |
| Warnings-first + score asc | Simple two-layer: any warning → top; else score asc. Orphan/unreachable naturally float up but lose section divisions. | |
| Composite weakness score | Weighted formula (orphan=4, unreachable=3, each warning=1, low tier=1, 1/score). Precise but opaque. | |

**User's choice:** Issue-tier order
**Notes:** Default behavior carries forward existing UX familiarity.

---

## Row layout (240px narrow width)

| Option | Description | Selected |
|--------|-------------|----------|
| Two-line compact (Recommended) | Line 1: cluster dots + URL + warning badge(s). Line 2: score · depth · in/out · tier badge. Matches ScorePanel precedent; no sidebar width change needed. | ✓ |
| Single-line dense table | True columns: URL \| score \| depth \| in \| out \| ⚠. Header-click sort naturally. Too narrow at 240px, needs horizontal scroll or column hiding. | |
| Expandable rows | URL + score + warning count by default; click to expand. Cleanest visual but hides detail behind interaction. | |

**User's choice:** Two-line compact
**Notes:** Matches current ScorePanel/HealthPanel row heights; familiar information density.

---

## Tree vs flat

| Option | Description | Selected |
|--------|-------------|----------|
| Flat sortable (Recommended) | Fully flat list, drop buildUrlTree rendering. Any column sort breaks tree; hierarchy cue is worth less than sort flexibility. Depth still shown as `Depth N` text. | ✓ |
| Flat + optional tree toggle | Default flat; toggle for tree view (disables sort when tree). Covers both but adds UI switch complexity. | |
| Keep tree always | Tree permanent; sort only reorders within same parent. Preserves Phase 2/8 spatial cue but kills global weakness ranking. | |

**User's choice:** Flat sortable
**Notes:** Aligns with Pages panel goal of global weakness ranking. Tree view deferred.

---

## Sort UI

| Option | Description | Selected |
|--------|-------------|----------|
| Sort dropdown at top (Recommended) | "Sort by" dropdown at panel top: Issue-tier (default) / Score ↑↓ / Depth / Outbound / Inbound / URL. Narrow-friendly, supports asc/desc within options. | ✓ |
| Clickable column headers | First/second-line labels act as column headers. Table-like but two-line compact has no true column headers. | |
| You decide | Claude picks at implementation time. | |

**User's choice:** Sort dropdown at top
**Notes:** Allows PM to see all sort options up front.

---

## Filters (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Show warnings only | Carried from HealthPanel. Hides clean rows. | ✓ |
| Filter by tier (Low/Mid/High) | Toggleable tier pills. Matches issue-tier default sort use case ("show me only low tier pages"). | ✓ |
| Filter by warning type | Per-warning toggles (Orphan-only, Depth-only, etc.). Powerful but complex UI. | |
| Minimal: no filters | No toggles, sort-only. | |

**User's choice:** Show warnings only + Filter by tier
**Notes:** Per-warning-type filter deferred to post-v1.

---

## Tier display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline tier badge per row (Recommended) | Tier badge on line 2 of each row. Drop HealthPanel's separate Score Tier section. Cleanest. | |
| Drop tier column entirely | Tier not shown at all; score value is source of truth. Minimalist but loses glanceable tier. | |
| Both: inline badge + top summary | Per-row badge + "X Low / Y Mid / Z High" summary at panel top. Most information but some redundancy. | ✓ |

**User's choice:** Both: inline badge + top summary
**Notes:** Summary gives glance totals; per-row badge gives detail. Redundancy acceptable for PM scan speed.

---

## Claude's Discretion (captured in CONTEXT.md)

- Exact dropdown component (shadcn Select recommended)
- Tier filter primitive (chips vs segmented control)
- Animation on sort change (none — instant)
- Orphan vs unreachable icon differentiation (within the lucide-react vocabulary)
- Summary line counts vs percentages (counts — more actionable)
- Default tab on SidePanel mount (pages vs filter — Claude picks)

## Deferred Ideas

- Per-warning-type filter toggles (deferred to post-v1)
- Composite weakness score (rejected — opaque)
- Tree view toggle (rejected for v1 — git history preserves the old rendering)
- Filter persistence across sessions (ephemeral for now)
- Selected Node tab with inbound/outbound drill-down (that's Phase 13 — do not pre-build)
