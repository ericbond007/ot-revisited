# [Landmark Name] (mile [N], [STATE])

**Type:** [rock formation / military fort / trading post / spring / ford / settlement / etc.]
**Kind in code:** `[landmark / trading_post / river / start / end]` (id `[id]`)
**Existing component:** `src/lib/ui/landmark-art/[Name]Art.svelte` *(or)* **NONE — needs new component + registry entry**
**Vikunja child:** [#NNNN](https://projects.ericbond.net/tasks/NNNN)
**Period gates:** [None / opens YYYY / abandoned after YYYY → ruin variant required]

**Target depth:** ~2000 words. Heavy on diary excerpts, period art catalog, and atmosphere — the implementer should be able to FLUX-prompt without flipping back to source material every iteration.

---

## What it actually looked like (1843–1860)

[2–4 paragraphs. Cover: terrain context (what surrounds it, what's on the approach), structural elements (architecture / rock-form / water), scale (height, footprint, what dominates the frame), and the **arrival sequence** — what an emigrant saw first, then closer, then at the camp. Pull from period diaries: at least 3 quoted lines from 3 different diarists, attributed by name + year.]

## Distinctive visual features

The cues a viewer must see to recognize the place. A generated image without these is wrong — discard the candidate.

- [Cue 1 — specific shape / silhouette / proportion, with the failure mode if missed]
- [Cue 2 — color, named with hex if possible: e.g. "Brule clay tan #c9a872"]
- [Cue 3 — characteristic vegetation: e.g. "scattered cottonwoods along the bottom, sage prairie above"]
- [Cue 4 — period markers: caravan, tents, livestock, smoke, US flag, etc.]
- [Cue 5 — scale cues that anchor proportion: e.g. "wagons read as dots at the base"]

## Atmosphere and lighting

[1–2 paragraphs on how light plays at this landmark through the day — when did emigrants typically arrive, what color the rock/walls/water are at midday vs afternoon vs dusk, what weather periodicity (afternoon thunderstorms on the high plains, blue norther in fall, etc.), whether there are recurring atmospheric phenomena (heat shimmer, sage dust, river fog).]

## Period reference imagery

Primary sources. Each entry: artist/photographer, year, what it shows, link if available, blind-spot. Aim for **5–8 sources** spanning paintings, photographs, sketches, and diary descriptions.

### [Source 1 — artist / photographer, year]

- **What it shows:** [composition, angle, season, time of day]
- **Link:** [URL — Library of Congress, Walters Art Museum, NPS, OCTA, etc.]
- **What it adds:** [why this reference matters above the others]
- **Blind spot:** [where this source misleads — compression, anachronism, idealization]

### [Source 2 …]

[repeat for 5–8 sources]

## Composition references from period art

[Short section: how do period artists FRAME this landmark? Spire centered or off-center? Architecture dominant or wagons dominant? Sky-heavy or land-heavy composition? Foreground figures for scale? This tells the implementer where to place the camera in the FLUX prompt.]

## FLUX prompt building blocks

Starting points for the generation pass. Iterate against the **Distinctive visual features** checklist.

**Default (1843–1860, fair weather, afternoon):**
```
horizon-vista of [structural anchor], [biome], [period detail 1], [period detail 2], painterly oil on canvas, period accurate 1850, soft afternoon light
```

**Variant — storm:**
```
[same anchor], [biome], storm light, low ceiling, blowing rain, painterly oil on canvas, period accurate 1850
```

**Variant — dawn / dusk:**
```
[same anchor], [biome], dawn light, long shadows, low sun, painterly oil on canvas, period accurate 1850
```

**Variant — winter (if landmark is reached in winter game-states):**
```
[same anchor], [biome] under snow, overcast, painterly oil on canvas, period accurate 1850
```

**Period-variant (if `abandonedBeforeYear` / `abandonedAfterYear` set):**
```
[anchor in ruin / not-yet-built state — describe explicitly]
```

## Variants needed in-game

- Default 1843–1860 standard view
- Weather variants (storm, snow) — wired via existing `BackdropPainting` weather hook
- [Period variants if `abandonedBeforeYear` / `abandonedAfterYear` apply]
- [Special states: e.g. Whitman post-massacre ruin, Fort Hall empty stockade]
- [Approach vs arrived variant if landmark is visible from far out]

## What NOT to render

[Things modern photos / paintings show that are wrong for our 1843–1860 window. Anachronistic structures (modern visitor centers, post-period railroad bridges, restored facades that didn't exist yet). Modern signage, fences, paved roads, telephone poles. Plantings that postdate the period.]

## Sources

- [NPS / NHS / OCTA reference page URL]
- [Library of Congress collection URL]
- [Period diary source — book + page if known]
- [Modern academic / replica photo source]
- [Wikipedia entry if it has good period sourcing]

## Notes / open questions

[Anything the researcher couldn't resolve, conflicts between sources, things the renderer should flag back to Dave before committing, or scope tweaks (e.g. "we may want a passing-by parallax variant separate from the stop scene").]
