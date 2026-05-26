# Landmark Visual References

Per-landmark visual research feeding the **FLUX backdrop + SVG overlay** rework tracked in Vikunja umbrella [#1078](https://projects.ericbond.net/tasks/1078) and its 54 children (#1079–#1132).

This is the **visual** complement to `04-landmarks.md` (which carries mile, name, kind, why-it-mattered, period status). Each file here adds: what the place actually looked like in 1843–1860, distinguishing features for instant recognition, period imagery references, draft FLUX prompts, and which variants the game needs (period gates, weather, abandoned state).

## Files

One file per landmark, named by the `LANDMARKS[].id` from `src/lib/game/content/landmarks.ts`:

- `_template.md` — the structure every per-landmark file follows. Updated 2026-05-25 to ~2000-word depth target.
- `<id>.md` — per-landmark research

## Status (2026-05-25)

**Done (5 / 54)**:

| File | Why it was researched | Words |
|---|---|---|
| [`chimney_rock.md`](./chimney_rock.md) | Simplest: pure landscape, no architecture, no period variant. Calibrates the template at its easiest end. | 2.7K |
| [`ft_laramie.md`](./ft_laramie.md) | **Architecture-heavy + soft period transition.** 1843–48 adobe stockaded Fort John → 1849+ open Army post w/ Old Bedlam. Two visual states inside one continuous timeline. | 4.8K |
| [`whitman_mission.md`](./whitman_mission.md) | **Hard period gate.** Active mission 1843–47 → burned ruin from Nov 1847 onward. Two completely different scenes; `abandonedAfterYear: 1847` in code. | 4.8K |
| [`south_pass.md`](./south_pass.md) | **Negative-space landmark.** The Continental Divide crossing is a 20-mi-wide treeless sage saddle with no dramatic features. Hardest FLUX challenge — model defaults will hallucinate notch + peaks. | 4.7K |
| [`ash_hollow.md`](./ash_hollow.md) | **Oasis landmark.** Counter-pole to the bleak Platte plain — green canyon, cold spring, ash grove. Two canonical compositions (arrival rim-down vs floor-view). Period arc from lush 1841 to abraded 1852 camp. 1855 battle context for late-window starts. | 4.9K |

**Remaining (49)** — Independence MO, Lone Elm, Kansas River, Vieux's Crossing, Alcove Spring, Big Blue River, Hollenberg, Rock Creek Station, Ft Kearny, Windlass Hill, Rachel Pattison's Grave, North Platte (east), Courthouse & Jail Rocks, Scotts Bluff, Robidoux Post, Register Cliff, Guernsey Ruts, Ft Caspar, Martin's Cove, North Platte (west), Willow Springs, Independence Rock, Devil's Gate, Sweetwater Ford, Cheyenne Camp, Ice Slough, Pacific Springs, Parting of the Ways, Green River, Big Hill, Ft Bridger, Shoshone Camp, Bear River, Soda Springs, Massacre Rocks, Ft Hall, Salmon Falls, Three Island, Ft Boise, Burnt River Canyon, Flagstaff Hill, Farewell Bend, Blue Mountains, Grande Ronde, Ft Walla Walla, The Dalles, Barlow Road, Laurel Hill, Oregon City.

These can fan out via parallel research subagents using the calibrated template + the 4 worked examples.

## How a render-ticket consumes this

Each child Vikunja ticket (#1079–#1132) instructs the implementer to:

1. Read `docs/historical-pass/13-landmark-visual-references/<id>.md`
2. Pull the **FLUX prompt building blocks** as a starting point
3. Generate 4–8 candidates at 3072×1024 via the `ht_landscape` LoRA v2_2000 pipeline
4. Iterate the prompt against the **Distinctive visual features** checklist (a candidate is wrong if it's missing the recognizable cues)
5. Wire the chosen image as the `<image href>` backdrop in `src/lib/ui/landmark-art/<Name>Art.svelte`, keeping the SVG layer for interactive overlay (wagon, NPCs, signage)

## Sourcing rules

| Source | Weight |
|---|---|
| **Period photographs** (William Henry Jackson 1866–1900+, Solomon Carvalho 1853, Andrew Russell 1860s) | Primary — actual evidence |
| **Period paintings/sketches** (Alfred Jacob Miller 1837, Frederick Piercy 1853, William Henry Tappan 1849) | Strong — eyewitnesses to the period |
| **Emigrant diary descriptions** | Strong for color/scale/atmosphere; weak for architectural detail (most weren't draftsmen) |
| **NPS / NHS site photos + interpretive panels** | Strong for terrain, weak for period state (modern landscaping, restored buildings) |
| **Modern paintings/illustrations** (Romanticized, post-1900) | Use only for composition cues; never for period accuracy |
| **Bierstadt-class luminism** | Mood / atmosphere only — Bierstadt explicitly compressed geography. Don't copy proportions. |

When sources conflict, **period photographs win** over paintings, paintings over modern reconstructions. Note conflicts in the file rather than picking silently.

## Conventions for FLUX prompt building blocks

- Lead with `horizon-vista` (this is the painted-backdrop format keyword)
- Include the biome explicitly (`high plains prairie`, `sage desert`, `cottonwood river bottom`, `pine timberline`)
- Name the **one** structural anchor (the spire, the fort, the river ford, the cluster of buildings)
- Add 2–3 period-detail tokens (wagon caravan in distance, lone tipi, US flag on pole, sage smoke)
- Close with a style anchor (`painterly oil on canvas, period accurate 1850, soft afternoon light`)
- Keep total prompt under 75 tokens — FLUX handles short prompts better than long
- Variant prompts override only the changing token (weather: replace `soft afternoon light` with `storm light, low ceiling, blowing rain`)

## Period gates

When a landmark has a code-level `abandonedBeforeYear` or `abandonedAfterYear`, the file MUST describe both states (active and not-yet-built / active and ruin). The implementer renders both backdrops and the component switches based on year.

Current period-gated landmarks (per `src/lib/game/content/landmarks.ts`):

- `rock_creek_station` opens 1857
- `whitman_mission` abandoned post-1847 (ruin variant required)
- `ft_hall` abandoned by HBC post-1856 (empty stockade variant)
- (any others discovered during research)
