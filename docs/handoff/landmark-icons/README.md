# Handoff — OT.IO Landmark Icons

A complete watercolor icon set for all 38 landmarks on the Oregon Trail, from
Independence MO to Oregon City. Each icon has bespoke art tied to the
historical record — Chimney Rock's clay spire, Fort Hall's Union Jack, the
Sweetwater cutting through Devil's Gate's cleft. No category fallbacks; every
landmark has its own face.

This bundle is a sibling to the **trail map** and **landmark art** handoffs.
The trail map renders these icons as small landmark pins on the parchment;
landmark art uses them as the hero glyph in the arrival modal.

---

## What's in this bundle

```
design_handoff_landmark_icons/
├── README.md                       ← you are here
├── LANDMARK_ICONS_CLAUDE.md        ← agent-facing brief
├── colors_and_type.css             ← design tokens
├── Specimen Sheet.html             ← all 38 icons at 24/32/48 px
└── src/
    ├── icon-base.jsx               ← palette (LI) + HybridBadge primitive + <Icon> wrapper
    ├── icons-trading-posts.jsx     ← 9 fort/post components
    ├── icons-rivers.jsx            ← 8 river-ford components
    ├── icons-arrival.jsx           ← 11 natural-landmark components
    ├── icons-passbys.jsx           ← 8 pass-by + 2 bookend components
    ├── LandmarkIcon.jsx            ← unified React dispatcher (id → component)
    └── LandmarkIcon.svelte         ← Svelte port (registry of inline-art components)
```

---

## What to ship

**`LandmarkIcon.svelte` is the component to add to the repo.** It takes an
`id` from the existing `landmarks.ts` and renders the matching watercolor
icon at any size.

```svelte
<script>
  import LandmarkIcon from "$lib/ui/LandmarkIcon.svelte";
</script>

<LandmarkIcon id={landmark.id} size={32} />
```

The 38 inner-art components live in `landmark-art/<id>.svelte` — the
dispatcher imports them all by id. The React versions in `src/icons-*.jsx`
are reference implementations; port each `<g>…</g>` body verbatim into a
`.svelte` file (no script needed — they're pure SVG).

---

## The set at a glance

| Group | Count | Treatment | Examples |
|---|---|---|---|
| **Trading posts** | 9 | Circular badge, warm/cool/gold tone | Fort Kearny (US flag), Fort Hall (Union Jack), The Dalles (false-front town, gold) |
| **River fords** | 8 | Circular badge, cool tone | Kansas (ferry), Three Island (3 islands), Green (deep + fast) |
| **Arrival landmarks** | 11 | Circular badge, warm tone | Chimney Rock, Devil's Gate, Soda Springs, South Pass |
| **Pass-bys** | 8 | Bare silhouette on parchment | Courthouse Rock, Parting of the Ways, Blue Mountains |
| **Bookends** | 2 | Medallion | Independence MO (compass star), Oregon City (Willamette Falls) |
| **Total** | **38** | | exactly matches `landmarks.ts` |

The visual distinction between **stops** (badged) and **pass-bys** (bare) is
load-bearing: it tells the player at a glance whether arriving here will
trigger a modal. Don't let pass-bys grow badges in implementation.

---

## Design tokens

The icon set uses a fixed palette defined as `LI` in `icon-base.jsx`. It's a
strict subset of the project's parchment vocabulary — same hues as
`colors_and_type.css`, called out by role:

| Token | Hex | Used for |
|---|---|---|
| `LI.ink` | `#2a1a08` | All linework, primary stroke |
| `LI.parchment` | `#e8d9b8` | Default badge fill (warm tone) |
| `LI.parchCool` | `#dfe2d8` | River-ford & HBC badge fill (cool tone) |
| `LI.parchGold` | `#f5e4b6` | The Dalles & start/end (gold tone) |
| `LI.earth` / `earthLight` | `#8a6a3a` / `#b89a6a` | Sandstone, log walls, bluffs |
| `LI.sage` / `sageDark` | `#7a8458` / `#4a5a38` | Prairie, willows, conifers |
| `LI.water` | `#7a96a0` | River surfaces |
| `LI.redFlag` / `navyFlag` | `#a8281a` / `#1a3a6a` | US / British flags |
| `LI.bone` | `#d8c8a0` | Whitewashed walls, ribbons |
| `LI.rust` | `#a83a18` | Compass star, accent |

**Don't introduce new hues.** If a new landmark is added, it has to compose
from this palette so the set stays cohesive.

---

## Tone-by-id quick reference

The badge tone (warm / cool / gold) is part of the icon's identity — it
signals affiliation:

- **Warm** (`#e8d9b8`) — US-side trading posts (Kearny, Laramie, Bridger,
  Hollenberg, Robidoux), all natural arrival landmarks
- **Cool** (`#dfe2d8`) — River fords (cool because water-dominated) and HBC
  posts (Hall, Boise, Walla Walla — British company)
- **Gold** (`#f5e4b6`) — End-of-trail markers (The Dalles, Oregon City,
  Independence MO start)

---

## Open questions / known issues

1. **The Svelte port hasn't been generated yet.** The dispatcher
   (`LandmarkIcon.svelte`) wires up imports by id, but the 38
   `landmark-art/*.svelte` files need to be created from the React
   reference. Each is just the inner `<g>…</g>` body — pure markup, no
   script. The conversion is straightforward find-and-replace
   (`className` → `class`, camelCase SVG attrs → kebab-case, `{LI.ink}` →
   the literal hex). I can hand off a script to do this if useful.

2. **Some icons reference helper components.** `icons-rivers.jsx` defines
   `<RiverSurface>`, `<FloatingWagon>`, `<ShallowFordWagon>` and reuses
   them across multiple icons. The Svelte port needs to either inline
   these helpers per file or set up a shared `_helpers.svelte` and import.

3. **Sizing.** All icons are designed at the 24×24 viewBox and tested at
   24/32/48. Below 20px, the linework starts to compete with itself —
   especially Devil's Gate, Register Cliff, and Three Island. If the trail
   map needs <20px pins, consider a simplified low-fidelity variant or
   fall back to a colored dot.

4. **Pass-by silhouettes have no badge.** When a pass-by is rendered
   *outside* parchment context (e.g. on a dark UI surface), it'll need a
   manual parchment chip background. The dispatcher doesn't add one.

---

## Next steps for the implementer

See `LANDMARK_ICONS_CLAUDE.md` for the focused build plan. In short:

1. Create `src/lib/ui/landmark-art/` with one `.svelte` file per landmark
   id. Port the React `<g>` body verbatim.
2. Add `LandmarkIcon.svelte` to `src/lib/ui/`.
3. Replace emoji-based pins in `LandmarkPin.svelte` with `<LandmarkIcon
   id={landmark.id} />`.
4. Replace emoji-based hero glyphs in arrival/ford/trade modals.
5. Verify against `Specimen Sheet.html` visually.
