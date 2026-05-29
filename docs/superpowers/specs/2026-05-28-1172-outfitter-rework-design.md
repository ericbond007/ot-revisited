# #1172 — Outfitter rework (UI-redesign PR2): bundles + coverage + broadsheet

**Status:** design complete, awaiting implementation plan. Closes #1172.

**Goal:** The outfitter surface port for the UI redesign rollout, combined with the
#1172 feature: restyle `/outfit` to the 1840s-broadsheet paper system AND add
one-click historical **bundle presets** + **coverage hints**. The Claude Design
handoff (`docs/handoff/ui-redesign/Outfit Screen.html`, `outfit-data.jsx`,
`outfit-single.jsx`) is the layout + data reference.

**Rollout context:** PR0 (paper foundation) + PR1 (shared atoms) already merged;
`--of-*` tokens + `.ds-*` utilities + ported NumberStepper/StatBar/CardRadio are
available. This is PR2 of the rollout spec
(`docs/superpowers/specs/2026-05-28-ui-redesign-rollout-design.md`).

---

## Decisions (locked with Dave, 2026-05-28)

1. **Bundle data home:** new `src/lib/game/content/bundles.ts` — real typed content.
2. **Pricing model: presets at à-la-carte price, NO separate cost.** Clicking a
   bundle adds its items to the basket at normal per-item prices; the totals bar
   reflects the honest sum of parts. Value is convenience, never a discount —
   so a bundle can never be a "premium." (The handoff's fixed `cost` field is
   dropped; an audit found its costs inconsistent: Marcy 58% discount … Frontier
   42% PREMIUM.)
3. **Coverage hints: recompute against the real engine consumption model**, not
   the mock's Palmer-1845 approximation — the hint must match what the player
   actually experiences.
4. **Inert-items check passes:** frontier_starter items (plow/seed_grain/
   fruit_tree_saplings/garden_seeds/family_bible) carry real arrival scores +
   epilogue lines in `scoring.ts`, surfaced by `EndScreen.svelte`. Bundling them
   satisfies "items must do something."
5. **Bot/NPC parity (#298/#302): no gap.** `ai/shopping.ts` composes item-by-item
   with no bundle awareness; bundles are player-only UI sugar over the identical
   basket → starter-kit application. Bots unchanged.

---

## Section 1 — data + mechanics

### `src/lib/game/content/bundles.ts` (new)

```ts
export interface Bundle {
  id: string;
  name: string;        // "Marcy's top-up"
  sub: string;         // "1859 · prudent"  (eyebrow)
  blurb: string;       // period-citation flavor
  icon: string;        // emoji glyph (placeholder until icon set)
  tone: 'rust' | 'good' | 'warn' | 'neutral';
  kit: Record<string, number>;   // itemId → qty, ADDITIVE onto basket
}
export const BUNDLES: Bundle[] = [ /* 5 from the handoff, compositions verbatim */ ];
```

The 5 loadouts (compositions + blurbs taken verbatim from the handoff's
`OF_BUNDLES`; **no `cost` field**):
- `marcy_topup` — "Marcy's top-up" · 1859 · prudent
- `palmer_generous` — "Palmer's generous" · 1845 · 4 souls × full ration
- `bryant_minimum` — "Bryant's minimum" · 1846 · light & fast
- `frontier_starter` — "Frontier starter" · build a life in Oregon
- `hunter_pack` — "Hunter pack" · heavy on powder & shot

### Apply mechanic

"Add to outfit" on a bundle card folds `kit[item] × qty` into the existing
`buyQty` basket state in `+page.svelte` (additive — stacks onto whatever's
already in the basket, per the handoff). No discount, no separate charge: the
totals bar reflects the added items at their normal per-item prices. The player
adjusts quantities afterward with the existing NumberStepper. Pure client state;
the existing `?/outfit` form-submit path is unchanged (it already serializes the
basket). Clicking a bundle twice adds twice (additive is intentional; the
steppers let the player trim).

### Coverage hints

`computeCoverage(party, basket, starterKit)` — new helper (co-located with or
importing the real consumption constants). Returns the hint set the UI shows:
- **Food days** — total food weight ÷ (daily-food-per-adult × adult count),
  using the SAME constants the engine consumes per day. "Food: N days for M souls."
- **Water days** — water capacity ÷ daily water use.
- **Ammo** — rounds vs a hunts-worth, if surfaced.

Recomputes reactively as the basket changes. Driven by the engine constants so
the hint cannot drift from real consumption (the explicit reason we recompute
rather than port the mock's approximation).

---

## Section 2 — layout, token port, testing

### `src/routes/outfit/+page.svelte` restructure

Reorganize to the `Outfit Screen.html` broadsheet layout:
- **Bundles strip** (new) — 5 carved `.ds-paper` cards above the item grid: icon,
  name, `sub` eyebrow (IM Fell English SC), citation blurb, "Add to outfit"
  button, `tone`-colored accent. Extract a `BundleCard.svelte` for the card.
- **Per-category item grid** — the existing buyable categories, restyled to paper
  rows (`.ds-row`) with NumberStepper (already `.ds-stepper` from PR1).
- **Wagon + oxen pickers** — restyled; CardRadio (PR1) for wagon model select.
- **Totals + coverage bar** — à-la-carte total, weight vs capacity
  (`.ds-progress`), and the coverage hints. Extract `CoverageHints.svelte` if it
  earns its own file.

Stays one route component; extractions follow the existing component-split
pattern. Migrate `/outfit` + `WagonPicker` + `ProfessionPicker` +
`CustomPartyBuilder` off `--c-*` → `--of-*` directly (the surface-port token
migration — these 4 files leave the bridge).

### Testing

- `tests/bundles-1172.test.ts` — every `kit` item id exists in `ITEMS`; bundle
  ids unique; all 5 present.
- `tests/coverage-1172.test.ts` — `computeCoverage` returns the expected food-day
  count for a known party + basket, asserted against the real consumption
  constants (e.g. 4 adults + Palmer bundle → matches the daily-food math).
- `npm run verify` — check + test green.
- **Playwright sweep** (per `feedback_verify_ui_myself`): `/outfit` via a dev
  scenario — screenshot the bundle strip; click "Add to outfit" and confirm the
  basket totals + coverage update; confirm broadsheet layout + no `--c-*`
  residual breakage.

### PR shape

Closes #1172. ~3 commits: (1) `bundles.ts` + coverage helper + tests, (2) outfit
screen restructure + token port, (3) picker token migration. Then verify +
screenshot + PR.

---

## Out of scope

- Scoring-screen work (#148, separate).
- Trading-post restyle (rollout PR3).
- Bundle-aware bots (bots compose item-by-item; no change).
- Per-item icon set (bundle/item glyphs stay emoji placeholders until the icon
  pass).

---

## Execution

Own `writing-plans` + execution cycle (this is a feature, not just a restyle).
After the implementation plan, subagent-driven execution per the rollout's
per-surface PR shape.
