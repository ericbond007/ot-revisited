# OT.IO — UI Redesign Handoff

Period-broadsheet redesign of the game UI. Established on the **Outfit Screen**,
codified in the **design system**, and rolled across the live surfaces.

Aesthetic in one line: **1840s emigrant broadsheet** — handmade rag paper,
iron-gall ink, carved "crown-molded" controls, period type
(Rye / IM Fell English / Special Elite).

---

## 0. CORRECTION — light paper EVERYWHERE (Dave, 2026-05-28)

> The original handoff (this doc's §3 "Dark-surface contexts" and §6's
> dark-frame assumption) says the in-game `/play` chrome stays **dark wood**.
> **That guidance is rejected.** The project direction is **paper-broadsheet
> everywhere** — the Outfit Screen / Trade Post treatment is the template for
> every surface, including the play screen, its action bar, HUD, and all
> modals.
>
> The handoff's own play-shell mock (`ui_kits/game/index.html`) already proves
> this is the intent: it remaps the legacy dark tokens to the paper palette at
> the `body` level (`--c-bg: var(--of-paper)`, `--c-panel: var(--of-paper-soft)`,
> `--c-wood: var(--of-ink-soft)`, …). The §3 dark-chrome prose is a stale hedge;
> the mock is the truth.
>
> **Consequences:**
> - The `--tp-emboss` / `--tp-emboss-active` dark-sibling tokens are NOT needed
>   for the play screen. They remain only as documentation of the two-context
>   pattern, in case a genuinely-dark moment (e.g. a night scene) ever needs them.
> - The travel scene's painted art (wagons / oxen / terrain SVGs) STILL stays
>   verbatim warm-sepia per §6 — that part of §6 holds. Only §6's assumption that
>   the *frame around it* stays dark is overturned: the frame becomes paper like
>   every other panel. The warm painting mats onto a broadsheet page. This is the
>   one seam that needs a real eyes-on contrast check (warm-on-warm risk).
> - Foundation strategy: redefine the `--c-*` tokens to resolve to `--of-*`
>   values globally (the mock's approach), so the ~59 existing files that use
>   `var(--c-*)` flip to paper with minimal per-file edits.

---

## 1. Source of truth

Build everything from these three:

| File | What it is |
|---|---|
| `colors_and_type.css` | **The spine.** All `--of-*` design tokens (palette, type scale, emboss stacks, paper textures) + `.ds-*` utility classes. Also keeps the legacy `--c-*` vars for backward-compat. |
| `Design System.html` | Specimen sheet — palette, typography, components (buttons / stepper / progress / ledger row), emboss reference, paper texture. The visual dictionary. |
| `Outfit Screen.html` | The reference implementation — the screen that set the direction. When in doubt, copy how this does it. |

If a token or pattern isn't in `colors_and_type.css`, it isn't canonical yet —
add it there rather than hand-rolling per file.

---

## 2. The tokens (what to use)

**Palette** — paper + ink, rust accent, sage/amber/red status:
```
--of-paper / --of-paper-soft / --of-paper-deep / --of-paper-edge
--of-ink / --of-ink-soft / --of-ink-faded
--of-rust / --of-rust-dark
--of-good / --of-warn / --of-bad
```

**Type** — four-family stack + a clamp() scale that stays legible when the
artboard is scaled down:
```
--of-display  (Rye)              — titles, prices, big numerals
--of-body     (IM Fell English)  — body + italic flavor
--of-sc       (IM Fell English SC) — eyebrows, labels, stamps
--of-mono     (Special Elite)    — tabular numerals, ledgers
--of-fs-eyebrow … --of-fs-h1     — use these, not hard px
```

**Emboss** — the carved "crown molding" look (stacked inset + drop shadows):
```
--of-btn-emboss          neutral paper buttons
--of-btn-emboss-strong   rust primary CTAs
--of-btn-emboss-active   pressed state (recessed)
--of-channel-emboss / --of-channel-fill-emboss   progress bars
```

**Texture** — single-instance SVGs (never tiled):
```
--of-tex-crinkle / --of-tex-fiber
```
Apply with `background-size: 100% 100%; background-repeat: no-repeat;`.
**Do not** use `repeat` — tiled noise shows seams (we hit this; it reads as banding).

**Utility classes** (opt-in, prefer over hand-rolling):
`.ds-eyebrow · .ds-paper · .ds-btn · .ds-btn-strong · .ds-stepper · .ds-bulk-chip · .ds-progress (+ .ds-progress-fill) · .ds-leader · .ds-row`

---

## 3. Integration recipe (any screen)

1. **Link the stylesheet + fonts.**
   ```html
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rye&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Special+Elite&display=swap" />
   <link rel="stylesheet" href="colors_and_type.css" />
   ```
2. **Paper, not panels.** Surfaces use `.ds-paper` (or the `--of-paper-soft`
   bg + `3px double var(--of-ink-soft)` border + soft drop-shadow recipe).
   Foxing/fold/corner-aging gradients are baked into `.ds-paper`.
3. **Carved controls.** Buttons/steppers/chips take an emboss var and press
   to `--of-btn-emboss-active` on `:active`. Light buttons = neutral; primary
   CTAs = `.ds-btn-strong` / `--of-btn-emboss-strong`.
4. **Type discipline.** Titles in Rye, body in IM Fell English (italic for
   flavor), labels/eyebrows in IM Fell English SC small-caps, numerals in
   Special Elite. Use the `--of-fs-*` clamp sizes.
5. **No hard edges in texture.** Gradients fade over wide stops; no tiled SVG.
6. **Soften hover.** Hover darkens a border to ink, not a rust flash; reserve
   rust for active/primary.

### Dark-surface contexts (in-game chrome)
Some surfaces stay dark wood by design — anything layered over the dimmed
`/play` screen. **Trade Post** is the worked example: its modal is parchment,
but it documents a **dark-mode emboss sibling** (`--tp-emboss` /
`--tp-emboss-active`) for controls that sit on dark wood. Reuse that pattern
for any dark chrome (action bar, HUD) rather than forcing paper everywhere.

---

## 4. What's been migrated (done)

| Surface | File | Notes |
|---|---|---|
| Design tokens | `colors_and_type.css` | canonical |
| Specimen | `Design System.html` | reference doc |
| Outfit / Independence | `Outfit Screen.html` + `outfit-*.jsx` | the reference build |
| Trade post + barter | `Trade Post.html` + `trade-post-*.jsx` | parchment modal, dark `/play` backdrop |
| Play-screen shell | `ui_kits/game/index.html` + `Components.jsx` + `game-modals.jsx` | header, rail, modals on new style |
| Wagon / Ox specimens | `Wagon Showcase.html`, `Ox Team.html` | Rye headings + carved cards |
| Foundation previews | `preview/*` | color/type/spacing/emboss on new palette |
| Review surfaces | `OT.IO Component Review.html`, `OT.IO Component Canvas.html` | lead with canonical section |

---

## 5. Known gaps / caveats (READ before shipping)

1. **Travel `WagonScene` is NOT restyled — see §6.** This is the one real hole.
   The mock shows a placeholder where the animated scene goes.
2. **Mocks are visual, not wired.** Confirm/save/reset are no-ops. Outfit
   profession discounts are conceptual (not computed).
3. **Placeholders remain** — trade-post glyphs are 2-letter rust badges;
   some landmark icons are stand-ins. Swap for the real icon set.
4. **Stale folders — ignore them.** `handoff_bundle/` and the eight
   `design_handoff_*/` folders are the PREVIOUS system. A dev pulling tokens
   from there will get the old palette. They're kept for history only;
   do not reference them in new work.

---

## 6. Integrating the travel scene (`WagonScene`)

The travel hero is **not** a flat panel to repaint — it's a live, composed
parallax scene. The real source is imported (verbatim from `master`) at:

```
ui_kits/game/wagon/
  WagonScene.svelte        ← the composer (z-ordered layer stack, rAF tick)
  WagonShadows.svelte
  wagon-svg/               ← PrairieSchooner, LightWagon, HeavyFreighter,
                             Driver, ChickenCoop, wheels … (hand-drawn SVG art)
  ox-team/                 ← OxTeam, SingleOx, tokens
  terrain/                 ← BackdropPainting, GroundBand, parallax layers
  landmarks/               ← ChimneyRock, ScottsBluff, Fort, …
  weather/                 ← sky accents, clouds, precip, storm vignette
```

### Principle: restyle the FRAME, never redraw the ART
The wagon/ox/terrain SVG art is the product's signature and must be lifted
**verbatim** — do not re-draw or approximate it. The redesign touches only the
*chrome around* the scene, not the painted scene itself.

### What the redesign changes
- The `.status.panel` / `.landscape` wrapper in `WagonScene.svelte` should
  adopt the paper-card treatment: `--of-paper-soft` frame, `3px double
  var(--of-ink-soft)` border, the soft drop-shadow recipe — matching every
  other panel. (Today it uses `--c-panel` + `--c-wood`; those legacy vars
  still resolve, so it won't break, but it reads as old chrome.)
- Any **text/HUD overlaid on the scene** (mileage, weather label, day) uses
  the period type stack + small-caps eyebrows.
- The **bottom row** beside it (EventLog + TrailMap snippet) is already on the
  new style in the mock — match that.

### What the redesign must NOT change
- The painted backdrops, ground band, ox-team, and wagon SVGs — palette and
  all. These are warm/sepia by design and already harmonize with parchment.
  Recoloring them to the token palette would flatten the art.
- The rAF animation model (parallax/wheel/gait timing).

### Practical port path (when someone tackles it)
1. Keep `WagonScene.svelte` as the Svelte source of truth in the real app —
   it does not need a React rewrite to ship; only its wrapper CSS changes.
2. In the **prototype/mock** (`ui_kits/game/index.html`, React), if a live
   preview is wanted, port only the *composer + wrapper*; pull the SVG bodies
   in verbatim as static markup. Budget real time for this — it's ~40 files.
3. Verify the restyled frame against `Outfit Screen.html` panels so the border
   weight, corner radius, and shadow match exactly.

> Honesty note for the receiver: in this repo the mock's travel hero is a
> placeholder. The real scene art lives at `ui_kits/game/wagon/`. Treat that
> folder as the canonical art; the redesign is a CSS-frame change around it.

---

## 7. File map (quick reference)

```
colors_and_type.css          ← tokens + utilities (START HERE)
Design System.html           ← specimen / dictionary
Outfit Screen.html           ← reference implementation
  outfit-data.jsx / outfit-single.jsx
Trade Post.html              ← buy/sell + barter (parchment modal)
  trade-post-data.jsx / trade-post-modal.jsx
ui_kits/game/
  index.html                 ← play-screen shell mock
  Components.jsx             ← TopBar, ActionBar, panels, EventModal
  game-modals.jsx            ← Mud-abandon, Company-dissent, Party-member, Newspaper, Letter
  wagon/                     ← REAL WagonScene source (imported; restyle frame only)
preview/                     ← foundation specimens (color/type/spacing/emboss)
OT.IO Component Review.html  ← linear audit, leads with canonical section
OT.IO Component Canvas.html  ← pan/zoom canvas, leads with canonical section

IGNORE (stale prior system):
  handoff_bundle/  design_handoff_*/
```
