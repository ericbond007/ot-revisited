# OT.IO Game UI Kit

A working hi-fi prototype of the OT.IO game shell, with **three swappable map treatments** for the in-progress map rework.

## Files

- `index.html` — entry point. Loads React + all components. Includes a Tweaks panel that lets you swap the **map variant** live.
- `Logo.jsx` — wordmark.
- `TopBar.jsx` — DAY · DATE · PACE · RATIONS readout.
- `TrailMapClassic.jsx` — current parchment-and-dashed-line map (faithful to `TrailMap.svelte`).
- `TrailMapTerrain.jsx` — **NEW.** Realistic regional terrain — shaded biome bands (prairie / plains / mountains / desert / Cascade), inked landmarks, ridgelines.
- `TrailMapHandDrawn.jsx` — **NEW.** Treasure-map style — hand-drawn ink lines, sketched landmarks (forts, peaks, rivers as flowing curves), wagon as a tiny silhouette.
- `ActionBar.jsx`, `PartyPanel.jsx`, `InventoryPanel.jsx`, `WagonPanel.jsx`, `EventModal.jsx`, `CampStage.jsx`, `StatBar.jsx`, `Eyebrow.jsx` — building blocks.

## Tweaks
The user can toggle Tweaks from the toolbar to:
- Swap map variant (Classic / Terrain / Hand-drawn)
- Toggle the event modal
- Toggle camp view
- Cycle weather/time-of-day overlay

## Notes on the map variants

All three accept identical props (`{landmarks, currentMileage, totalMileage}`) so the game logic doesn't change. They only swap visual rendering.

- **Classic** — verbatim port. Strip layout, parchment background, dashed rust trail, emoji landmark dots. Best for clarity.
- **Terrain** — bird's-eye view of a regional map slice (current leg + lookahead). Biome shading from green prairie → ochre plains → grey mountains → tan desert → green Cascade. Ink contour lines. Landmarks become ink-stamped icons.
- **Hand-drawn** — full-territory pen-and-ink overview. Wavy coastlines, hatched mountains, scribbled rivers, the route drawn as a wandering ink line, the wagon as a small silhouette that walks the line.
