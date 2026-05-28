# OT.IO UI Redesign Rollout — Design Spec

**Status:** design complete, awaiting per-surface implementation plans.

**Goal:** Apply the Claude Design "1840s broadsheet" paper-light visual system
across EVERY surface of the game — landing, outfitter, trade post, the live
`/play` screen, its chrome (action bar, HUD), all modals, and the camp/landmark
stages. No dark wood survives. The painted travel-scene SVG art stays verbatim;
only its frame is restyled.

**Source design system:** `docs/handoff/ui-redesign/` — `colors_and_type.css`
(the `--of-*` tokens + `.ds-*` utilities), `Design System.html` (specimen),
`Outfit Screen.html` + `Trade Post.html` (reference builds), the play-shell mock
at `ui_kits/game/index.html`, and the real `WagonScene` source under
`ui_kits/game/wagon/`. Direction recorded in `HANDOFF.md` §0 CORRECTION:
**paper-broadsheet everywhere**, overriding the handoff's §3 dark-chrome prose
and §6 dark-frame assumption.

---

## Decisions (locked with Dave, 2026-05-28)

1. **Rollout shape: big-bang flip + per-surface design ports.** A Foundation PR
   flips the entire app to paper at once via an inversion-aware token bridge;
   subsequent PRs upgrade each surface from "generically flipped" to "designed
   per the broadsheet reference."
2. **Legacy `--c-*` tokens: migrate-and-delete.** The bridge is temporary. Each
   surface port migrates that surface's files from `--c-*` to `--of-*` directly
   (one touch per file: restyle + migrate together). When every surface is
   ported, a final PR deletes the `--c-*` alias block.
3. **#1172 outfitter rework IS the outfitter port.** The broadsheet Outfit Screen
   is the redesign #1172 was waiting for; one PR closes both.
4. **Travel-scene seam: implement + screenshot, decide then.** Build the paper
   frame around the locked warm-sepia art, screenshot the real composite, judge
   the warm-on-warm seam with eyes on it; add a thin ink keyline only if it reads
   washed-out.

---

## Why big-bang is safe here

The handoff's play-shell mock (`ui_kits/game/index.html`) proves the token
remap can be **inversion-aware**: surfaces flip to paper, but the *text* tokens
flip to ink, so light-on-dark becomes dark-on-light correctly rather than
vanishing.

```
--c-bg / --c-bg-raised   → --of-paper          (surfaces → paper)
--c-panel                → --of-paper-soft
--c-border               → --of-rule
--c-wood                 → --of-ink-soft        (wood-brown borders → ink)
--c-ink                  → --of-ink-soft
--c-tan / --c-tan-bright → --of-ink             (light text → dark ink — the fix)
--c-rust / --c-rust-dark → carry over
```

45 of the ~59 `var(--c-*)` consumers use `--c-tan` / `--c-cream` / `--c-parchment`
as a TEXT color. The inversion-aware bridge is what makes a one-shot flip clean
instead of producing 45 files of invisible light-on-light text.

The mock only remaps 11 tokens; the Foundation PR MUST extend the bridge to
every token the app actually consumes — also `--c-cream`, `--c-paper`,
`--c-wood-soft`, `--c-amber-dark`, `--c-sage`, `--c-river`, `--c-river-pale`,
`--c-blood`, `--c-parchment`, `--c-parchment-visited/-trade/-end`, `--c-good`,
`--c-warn`, `--c-danger`, `--c-bg-raised`, `--c-sage-dark`, `--c-ill-dark`.
Each classified as surface / text / border / accent and mapped to the matching
`--of-*` value (semantic status colors `--of-good/-warn/-bad` carry the
sage/amber/red roles).

---

## Foundation PR (PR 0)

1. Merge the `--of-*` token block + `.ds-*` utility classes into
   `src/lib/styles/theme.css` (single source — do NOT add a second stylesheet;
   theme.css already holds the full `--c-*` set the app imports via the layout).
2. Add the complete inversion-aware `--c-* → --of-*` alias bridge.
3. Rework the global element styles in `theme.css` that hardcode dark
   assumptions, to the paper treatment:
   - `button` → `.ds-btn` look (paper bg, ink text, neutral emboss); a
     `.btn-strong` / primary path → `.ds-btn-strong` (rust bg, paper text).
     Keep `.btn-ghost` / `.btn-danger` semantics, re-skinned.
   - `input` / `select` / `textarea` → paper field + ink border + rust focus.
   - `.panel` → `.ds-paper` (paper-soft + double-rule ink border + soft shadow;
     foxing/fold gradients baked in).
   - `.modal-body` / `.modal-title` → paper modal chrome (drop the rust-border /
     dark-elevation recipe).
   - `.eyebrow` → IM Fell English SC small-caps in ink-soft.
   - `html, body` base → paper bg, ink text, `--of-body` font.
4. Self-host **IM Fell English SC**: add `im-fell-english-sc-latin.woff2` to
   `/static/fonts/`, declare `@font-face` for `'IM Fell English SC'`, point
   `--of-sc` at it. (Today the app only self-hosts regular IM Fell English; SC
   is a fallback string and silently degrades.)
5. Specimen route `/dev/design-system` rendering the Design System reference for
   visual diffing during the rollout.

**After PR 0 the whole app is paper.** Un-ported surfaces look "generically
flipped but correct" (no inverted text); designed ports follow.

---

## Surface inventory + PR sequence

| # | PR | Files | Reference |
|---|---|---|---|
| 0 | Foundation | `theme.css`, fonts, `/dev/design-system` | `colors_and_type.css` + `Design System.html` |
| 1 | Shared atoms | StatBar, StatPicker, NumberStepper, Tooltip, ItemTooltip, CardRadio | specimen components |
| 2 | Outfitter (=#1172) | `/outfit`, WagonPicker, ProfessionPicker, CustomPartyBuilder | `Outfit Screen.html` |
| 3 | Trade + town | TradeModal, TradeReceiptModal, TownActionModal, TownStage | `Trade Post.html` |
| 4 | Play shell | `/play`, ActionBar, PartyPanel, InventoryPanel, WagonPanel, EventLog, JourneyMenu | `ui_kits/game/Components.jsx` |
| 5 | Modals batch | EventModal, Hunt/Ford/FordSummary/PostHunt/CampSummary/MudAbandon/CompanyDissent/Party/PartyMember/Wagon/WagonTrain/Inventory/Feedback | `game-modals.jsx` |
| 6 | New-journey flow | NewJourneyWizard, landing `+page.svelte`, `/load` | — |
| 7 | Camp / landmark stages | CampStage, LandmarkStage | — |
| 8 | WagonScene frame | `wagon/WagonScene.svelte` (frame only — art locked) | HANDOFF §6 |
| 9 | Cleanup | 14 dev harnesses + `+error.svelte` + delete `--c-*` alias block | — |

**Order rationale:** shared atoms (PR 1) go before composed surfaces so PRs 2-8
inherit correct buttons / steppers / bars. The `--c-*` block can only be deleted
in PR 9 once every prior surface has migrated off it.

---

## Per-surface PR shape (uniform, PRs 1-8)

1. Restyle the surface to its broadsheet reference (the matching `.html` / `.jsx`
   mock).
2. Migrate that surface's files `--c-*` → `--of-*` directly (touch each file once
   — restyle + token migration together).
3. Fix the surface's contrast stragglers (hardcoded hex, per-component overrides
   the bridge can't catch).
4. `npm run verify` (svelte-check + vitest) — must pass.
5. **Screenshot the surface in a real browser** via Playwright at its dev-scenario
   URL (per the `feedback_verify_ui_myself` rule — type-pass ≠ correct render).
   Diff against the `/dev/design-system` specimen.
6. Open PR; merge on green.

---

## Travel-scene frame (PR 8) — the one locked-art seam

- The painted backdrops, ground band, ox-team, and wagon SVGs stay verbatim
  warm-sepia (HANDOFF §6 — recoloring flattens the art). This part of §6 holds.
- §6's assumption that the *frame* stays dark is overturned: the
  `.status.panel` / `.landscape` wrapper in `WagonScene.svelte` adopts the
  `.ds-paper` treatment (paper-soft, `3px double var(--of-ink-soft)` border, soft
  drop-shadow) like every other panel.
- Any HUD text over the scene (mileage, weather label, day) uses the period type
  stack — Special Elite numerals, IM Fell English SC small-caps eyebrows.
- The rAF animation model (parallax / wheel / gait timing) is untouched.
- **Open risk:** the warm painting matted on light parchment may read
  warm-on-warm / low-contrast at the seam. Resolution: implement, screenshot the
  real composite, judge with eyes on it; add a thin `--of-ink` keyline + inner
  shadow between art and frame ONLY if it reads washed-out. Do not pre-add it.

---

## Out of scope

- Redrawing or recoloring the travel-scene SVG art (locked).
- Layout / information-architecture changes beyond what the broadsheet mocks
  imply (e.g. #1172's bundle restructuring is its own design concern; this
  rollout restyles, the bundle mechanic is tracked separately if it diverges
  from `Outfit Screen.html`).
- The dev-harness routes get only a token migration in PR 9, not a design port.

---

## Execution model

This spec defines the whole rollout. Each PR (0-9) gets its OWN
`superpowers:writing-plans` + execution cycle — they are independently shippable
and reviewable. We do NOT write one 10-surface mega-plan. Start with PR 0
(Foundation); it unblocks everything else.
