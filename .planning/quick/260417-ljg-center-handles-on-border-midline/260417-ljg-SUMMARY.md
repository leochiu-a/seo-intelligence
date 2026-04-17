---
quick_id: 260417-ljg
description: 連接點沒有對齊線
date: 2026-04-17
commit: 9f9b67b
status: completed
---

# Quick 260417-ljg: Summary

## Problem

UrlNode's 4 handle circles (width/height: 12px, border: 2px) appeared misaligned
with incoming/outgoing edge lines. Edges terminated ~2px inside the node border
instead of at the visible circle centers.

## Root Cause

React Flow v11.11.4's default CSS positions handles with hardcoded `-4px` offsets
(`.react-flow__handle-top { top: -4px; transform: translate(-50%, 0); }`, etc.).
These only correctly center ~8px handles. With our 12px handles, each handle box
spanned from `-4px` to `+8px` relative to its axis — visual center (and the
`getBoundingClientRect`-derived edge routing point) both landed 2px inside the
node, not on the border midline.

## Change

`packages/web/src/index.css` — added overrides after `.react-flow__controls-button:hover`:

```css
.react-flow__handle-top    { top: 0;    left: 50%; transform: translate(-50%, -50%); }
.react-flow__handle-bottom { top: 100%; bottom: auto; left: 50%; transform: translate(-50%, -50%); }
.react-flow__handle-left   { top: 50%; left: 0;    transform: translate(-50%, -50%); }
.react-flow__handle-right  { top: 50%; left: 100%; right: auto; transform: translate(-50%, -50%); }
```

Anchoring at `0 | 100% | 50%` plus `translate(-50%, -50%)` centers the handle box
on the border midline for any size. React Flow's edge routing (via
`getBoundingClientRect`) reads the same post-transform center, so edges and
visible circles coincide.

## Verification

- `pnpm -C packages/web test` — 211 tests pass across 10 files
- Inline Handle styles (`background`, `border`, `width`, `height`) unchanged;
  CSS rules only affect positioning
- No `!important` needed — rules have equal specificity to React Flow defaults
  and load after `@tailwind utilities` in cascade order

## Files Changed

- `packages/web/src/index.css` (+25 lines)

## Commit

`9f9b67b` fix(web): center React Flow handles on node border midline
