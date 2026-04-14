---
phase: 4
slug: global-nodes
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.4 |
| **Config file** | vite.config.ts (inline vitest config) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-T0 | 01 | 0 | GLOB-02, GLOB-04 | stub | `npm test` | Wave 0 creates UrlNode.test.tsx + EditPopover.test.tsx | ⬜ pending |
| 4-01-T1 | 01 | 1 | GLOB-01, GLOB-03 | unit | `npm test -- graph-utils` | ✅ extend existing | ⬜ pending |
| 4-01-T2 | 01 | 1 | GLOB-05 | unit | `npm test -- graph-utils` | ✅ extend existing | ⬜ pending |
| 4-02-T1 | 02 | 2 | GLOB-01, GLOB-04 | component | `npm test -- EditPopover` | ✅ Wave 0 created | ⬜ pending |
| 4-02-T2 | 02 | 2 | GLOB-02 | component | `npm test -- UrlNode` | ✅ Wave 0 created | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/components/UrlNode.test.tsx` — stubs for GLOB-02 (global badge renders when isGlobal=true) — **created by Plan 04-01, Task 0**
- [x] `src/components/EditPopover.test.tsx` — stubs for GLOB-04 (add/edit/delete placements in popover) — **created by Plan 04-01, Task 0**

*graph-utils.test.ts already exists and covers GLOB-01, GLOB-03, GLOB-05 once extended.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PageRank sidebar updates immediately after toggling global | GLOB-05 | Requires browser rendering + React state | Toggle isGlobal on a node; observe sidebar re-ranks without page reload |
| Global badge visible on canvas | GLOB-02 | Visual rendering | Mark node as global; confirm Globe badge appears below tier badge |
| Placements section appears only when isGlobal=true | GLOB-04 | Conditional rendering | Toggle global on/off; confirm placement section appears/hides |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
