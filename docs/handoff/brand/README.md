# Handoff — OT.IO Brand Assets

The OT.IO brand vocabulary as drop-in SVG assets: the **wordmark**, the
**mark** (ox + wagon roundel), and an **icon dictionary** mapping every
in-game concept to its canonical glyph.

This bundle is small on purpose. Brand work is mostly file-copy plus a few
import-path decisions; there's no algorithmic translation needed.

---

## What's in this bundle

```
design_handoff_brand/
├── README.md              ← you are here
├── BRAND_CLAUDE.md        ← agent-facing brief: slot map, conventions
├── colors_and_type.css    ← design tokens (ported from theme.css)
└── src/
    ├── mark.svg           ← Roundel: stylized ox-and-wagon silhouette
    ├── wordmark.svg       ← Full lockup: "OT.IO" with the trail rule
    └── icon-dictionary.json  ← Concept → emoji-glyph mapping (canonical)
```

---

## Status of each piece

| Piece | File | Status | Notes |
|---|---|---|---|
| Mark | `src/mark.svg` | **Final** | Single-color SVG, scales cleanly down to 16px. Use as favicon, app-bar logo, splash. |
| Wordmark | `src/wordmark.svg` | **Final** | Full horizontal lockup. Use in headers, marketing pages, splash. |
| Icon dictionary | `src/icon-dictionary.json` | **Final** | Authoritative mapping of every game concept to its glyph. Lifted verbatim from the existing `src/lib/ui/*.svelte` files — this is descriptive of current usage, and meant to be enforced going forward. |

---

## How the icon dictionary works

The codebase already uses emoji as inline glyphs throughout — `🐂` for pace,
`🏰` for a fort, `🌩️` for a weather event. That's intentional and is the
committed aesthetic. The problem is that the same concept is sometimes
spelled different ways across files (e.g. `🛖` vs `🚐` vs `🛻` for "wagon").

`icon-dictionary.json` is the **canonical** mapping. When a concept appears
anywhere in UI code, use the listed glyph. The dictionary covers:

- `actions` — travel, rest, hunt, ford, visit, trade, camp, menu
- `stats` — day, date, pace, rations, morale, health, cash, water
- `pace_options` — slow, moderate, fast, grueling
- `rations_options` — meager, normal, filling
- `inventory_categories` — food, feed, medicine, weapon, ammo, tool, …
- `event_categories` — weather, health, wagon, encounter, …
- `people` — adult_male, adult_female, child_male, child_female, dog, dead
- `camp_scene` — moon, tent, fire, shelter, ox
- `landmarks` — every landmark in the `LANDMARKS` array (Independence,
  Kansas River, Ft. Kearny, …, Oregon City)

There's a **separate** track of work — the **action bar SVG icons** — that
replaces the action emoji with custom SVG glyphs (wagon-team for travel,
flintlock for hunt, wagon-crossing for ford, A-frame tent for rest, fort
gate for visit). That's covered in the **components** handoff bundle, not
here. The dictionary is still useful as the conceptual map.

---

## Design tokens

`colors_and_type.css` mirrors `src/lib/styles/theme.css` in the repo. The
brand assets themselves only need:

| Variable | Hex | Used for |
|---|---|---|
| `--c-ink` | `#3a1a08` | Mark + wordmark fill |
| `--c-rust` | `#c96a2a` | Wordmark accent |
| `--c-parchment` | `#e8d9b8` | Recommended background for the mark |

The SVGs use `currentColor` where appropriate so they inherit from the
parent CSS color — set `color: var(--c-ink)` on the wrapping element.

**Typography** (for any rendered text alongside the mark, not for the SVG
itself):

- Wordmark display: `'Rye', Georgia, serif` (from `--f-display`)
- Tagline / caption: `'IM Fell English', serif italic`

---

## Open questions / known issues

1. **Favicon.** The mark works as a favicon at 32×32 but compresses
   awkwardly at 16×16. Consider rendering a separate simplified 16×16
   variant for `<link rel="icon">`.

2. **Dark / light variants.** Currently single-color (ink). If a light
   variant is needed for dark backgrounds, the simplest path is a wrapper
   class that swaps `color: var(--c-ink)` → `color: var(--c-tan-bright)`.
   The SVGs are written to support this but it's not yet wired.

3. **Wordmark on small screens.** Below ~280px wide, the wordmark is too
   compressed. Use the bare `mark.svg` instead in those cases.

---

## Next steps for the implementer

See `BRAND_CLAUDE.md` for the focused build plan. In short:

1. Copy `mark.svg`, `wordmark.svg` into `src/lib/assets/brand/`.
2. Copy `icon-dictionary.json` into `src/lib/data/icon-dictionary.json` (or
   convert to a typed `.ts` module — see brief).
3. Audit existing emoji usage across `src/lib/ui/*.svelte` for any concept
   that uses a different glyph than the dictionary specifies; reconcile.
4. Wire the mark + wordmark into the landing page header and `/play` shell.
