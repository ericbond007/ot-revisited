# Handoff — OT.IO UI Components

Polish pass on the existing in-game UI components: action bar, party panel,
event modal, stat readouts, buttons, and stat bars. Unlike the travel-scene
and trail-map bundles which add new files, **this bundle is mostly
modifications to existing Svelte components.**

The work is in three categories:

1. **Action bar icon swap** — replace the action emoji (`🚶 🏕️ 🏹 🛶 🏛️`) with
   custom-drawn SVG glyphs (wagon-team, A-frame tent, flintlock,
   wagon-crossing, fort-gate). Higher fidelity, more deliberate.
2. **Party panel polish** — add portrait avatars w/ status rings, HP bars
   with hatch ticks, sickness animations, morale ribbon, mini stats row.
3. **Event modal + button + stat readout pass** — eyebrow category pill,
   flush button styling, stat bars w/ tick marks.

---

## What's in this bundle

```
design_handoff_components/
├── README.md                       ← you are here
├── COMPONENTS_CLAUDE.md            ← agent-facing brief: per-file change plan
├── colors_and_type.css             ← design tokens (ported from theme.css)
└── src/
    ├── action-bar.html             ← FINAL.  ActionBar w/ SVG icon symbols + state styling
    ├── party-panel.html            ← FINAL.  PartyPanel w/ avatars, HP, morale, stats
    ├── event-modal.html            ← FINAL.  EventModal w/ category pill + serif title + choice buttons
    ├── buttons.html                ← FINAL.  Button styles: primary, ghost, danger, disabled
    ├── stat-bars.html              ← FINAL.  HP / morale / hunger bars w/ tick marks
    └── stat-readout.html           ← FINAL.  Top-bar stat readout cluster
```

---

## Status of each piece

| Piece | File | Status | Maps onto |
|---|---|---|---|
| Action bar | `src/action-bar.html` | **Final** | `src/lib/ui/ActionBar.svelte` (modification) |
| Party panel | `src/party-panel.html` | **Final** | `src/lib/ui/PartyPanel.svelte` (modification) |
| Event modal | `src/event-modal.html` | **Final** | `src/lib/ui/EventModal.svelte` (modification) |
| Buttons | `src/buttons.html` | **Final** | global button styles in `theme.css` (modification) |
| Stat bars | `src/stat-bars.html` | **Final** | wherever HP/morale/hunger bars are currently rendered |
| Stat readout | `src/stat-readout.html` | **Final** | top-bar status cluster (PaceReadout/RationsReadout/etc.) |

These are **modifications**, not new files. The brief in
`COMPONENTS_CLAUDE.md` is a per-file change plan, not a slot map.

---

## What changes in the action bar

The current `ActionBar.svelte` uses inline emoji for the five primary
actions: `🚶 Travel · 🏕️ Rest · 🏹 Hunt · 🛶 Ford · 🏛️ Visit`.

The new design replaces those with custom-drawn SVG glyphs in a single
`<svg><defs><symbol>` block, used via `<use href="#gi-…">`:

| Action | Old emoji | New SVG | Glyph description |
|---|---|---|---|
| Travel | 🚶 | `#gi-travel` | Ox + wagon side view, ~64×40 |
| Rest | 🏕️ | `#gi-rest` | A-frame tent, ~32×32 |
| Hunt | 🏹 | `#gi-hunt` | Single-shot flintlock rifle, ~64×32 |
| Ford | 🛶 | `#gi-ford` | Wagon crossing river, ~64×40 |
| Visit | 🏛️ | `#gi-visit` | Log fort gate w/ blockhouses, ~32×32 |

State styling is unchanged from the existing component: rust-orange primary
(contextual action), brown secondary, disabled at 0.5 opacity. The blue
border on the action bar still cues "river nearby" when applicable.

The rest of the icon dictionary stays as emoji — only these five action
icons are upgraded.

---

## What changes in the party panel

The current panel renders a list of party members with name, profession,
and a thin HP bar. The new design adds:

- **Portrait avatar** (24×24 SVG) with a colored status ring:
  - Sage green = healthy
  - Rust = ill (with dashed ring + shake animation)
  - Brown = dead (gravestone silhouette, line-through name, faded)
- **HP bar with hatch ticks** at 25/50/75 — sage→bright-sage gradient when
  healthy; rust→bright-rust when ill, with pulse animation
- **Heart icon** to the left of the bar (filled with bar color)
- **Numeric HP readout** to the right in monospace
- **Status badge** (✓ healthy, ! ill) in the rightmost cell
- **Profession glyph** as a tiny corner badge (red cross for doctor,
  binoculars for scout, etc.) — when present
- **7-day morale sparkline** in the panel header
- **Morale ribbon meter** at the bottom — diagonal-stripe gold pattern,
  numeric + trend arrow
- **Mini stats row** at the very bottom — 3 columns: rations days, ox count,
  pace setting

---

## What changes in the event modal

The existing `EventModal.svelte` is text-heavy with simple yes/no buttons.
The new design adds:

- **Category pill** at the top — eyebrow-styled, with the category emoji
  (from the icon dictionary) and the category name
- **Serif display title** for the event headline (Rye font)
- **Body in IM Fell English**, 1.55 line height
- **"WHAT DO YOU DO?"** eyebrow above the choices
- **Choice buttons** — full-width, with the relevant emoji at left, choice
  text in bold, rust border for primary, brown border for secondary
- **Outer rust border** + heavy box-shadow for elevation

---

## Design tokens

All components use only existing tokens from `colors_and_type.css`:

| Token | Hex | Used for |
|---|---|---|
| `--c-bg` | `#1a0f08` | Modal backdrop, top-bar surface |
| `--c-panel` | `#3d2817` | Party panel surface, modal surface |
| `--c-rust` | `#c96a2a` | Primary action, accent borders, ill state |
| `--c-rust-dark` | `#8a3a1a` | Pressed primary, deep accent |
| `--c-tan` | `#e8c89a` | Body text |
| `--c-tan-bright` | `#f5e6c8` | Selected / important text |
| `--c-ink` | `#3a1a08` | Strokes inside SVG icons |
| `--c-sage` | `#8bb96a` | Healthy state, HP bar |
| `--c-amber` | `#f5c96a` | Morale meter |
| `--c-river-blue` | `#4a8bc9` | Ford action, water cue |

Status palette additions (already in theme.css if recently touched):

- `#6a9a4a` (sage darker — HP bar gradient bottom)
- `#a83a2a` (rust darker — ill HP bar gradient bottom)
- `#e85a4a` (alarm — fever, low HP, danger)
- `#d4a850` (amber darker — morale meter stripes)

If any of these are missing from the repo's `theme.css`, add them as a
small set; don't introduce them inline.

---

## Open questions / known issues

1. **SVG sprite location.** The action bar's `<symbol>` defs live in a
   single hidden `<svg>` at the top of `action-bar.html`. In the target
   repo, decide whether to:
   - Inline the defs in `ActionBar.svelte` (simplest, scoped)
   - Move to a project-wide `IconSprite.svelte` mounted in `+layout.svelte`
     (reusable elsewhere, but requires the layout to render it before any
     consumer)
   - Use SvelteKit's `?raw` SVG import per icon
   The inline-in-component option is fine for now since these icons are
   only used in the action bar.

2. **Animation pause.** The party panel uses CSS animations
   (`@keyframes hpPulse`, `ill`, `drip`, `moralePulse`). These are
   self-driven and don't pause when the game pauses — that's correct for
   the panel, but confirm with the designer if pause-aware behavior is
   needed.

3. **Sparkline data source.** The 7-day morale sparkline needs a 7-element
   array of recent morale values. Confirm the source store with the
   designer; the prototype uses a hardcoded sample.

4. **Mini-stats row coupling.** The bottom mini-stats row repeats data
   that's also in the top-bar stat readout cluster. Confirm this is
   intentional duplication (panel is self-sufficient at a glance) and not
   a layout mistake.

---

## Next steps for the implementer

See `COMPONENTS_CLAUDE.md` for the focused build plan. In short:

1. Audit each existing component file (`ActionBar.svelte`,
   `PartyPanel.svelte`, `EventModal.svelte`, etc.); make a per-file diff
   plan against the bundled HTML.
2. Pull the SVG icon sprite into the action bar.
3. Restructure the party panel rows to the new grid; add the avatar SVG,
   HP bar, sparkline, morale ribbon, mini-stats row.
4. Restyle the event modal with the category pill + serif title.
5. Verify against each bundled HTML preview visually.
