# Handoff — OT.IO Stat Icons

Watercolor SVG replacement set for the 8 stat-readout glyphs currently
rendered as emoji (`☀️ 🗓️ 🐂 🍖 🎵 ❤️ 💵 💧`).

These icons sit in the **top-bar readout** and the **party-row mini stats**.
They render at 16/20/24/32 px against dark wood — small, inline, beside
typography. Same wash + ink vocabulary as the landmark icons.

---

## What's in this bundle

```
design_handoff_stat_icons/
├── README.md                    ← you are here
├── STAT_ICONS_CLAUDE.md         ← agent-facing brief: dispatcher pattern + tokens
├── colors_and_type.css          ← design tokens (shared)
├── Watercolor Sheet.html        ← runnable specimen — 8 glyphs × 4 sizes + context
└── src/
    └── stat-icons.jsx           ← committed glyph paths, ready to lift
```

---

## Status of each piece

| Stat | Token | Source |
|---|---|---|
| Day | `stats.day` | FRESH — sun w/ rays |
| Date | `stats.date` | FRESH — calendar w/ rust today-dot |
| Pace | `stats.pace` | **PORTED** from `OxHead` in `explorations/travel-scene/ox-team.jsx` |
| Rations | `stats.rations` | **PORTED** — drumstick matching `🍖` emoji directly |
| Morale | `stats.morale` | FRESH — concertina (period-correct 1840s instrument) |
| Health | `stats.health` | FRESH — heart |
| Cash | `stats.cash` | **PORTED** — folded notes matching `💵` emoji |
| Water | `stats.water` | FRESH — droplet w/ depth wash |

All eight are 24×24 viewBox, single-color when emoji-replaced, watercolor
wash + ink overlay when full-fidelity. Three glyphs preserve the silhouette
of existing OT.IO art so the visual handoff from emoji is recognizable.

---

## Maps onto

- `src/lib/data/icon-dictionary.ts` — `ICON.stats.{day,date,pace,…}` keys
- New: `src/lib/ui/StatIcon.svelte` — dispatcher mirroring `LandmarkIcon.svelte`
- Consumers (existing): top-bar readout components, `PartyPanel.svelte`
  mini-row, anywhere `ICON.stats.X` is currently rendered as a string

See `STAT_ICONS_CLAUDE.md` for implementation steps.
