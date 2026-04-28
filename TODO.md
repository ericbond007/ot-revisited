# Remaining TODOs

As of 2026-04-27 (post-#89). 31 open.

## New mechanics

| #    |                                                                   |
| ---- | ----------------------------------------------------------------- |
| #175 | California leg — Gold Rush headline unlocks alternate route       |
| #176 | Wagon trains — join 20-50 caravan for safety bonus                |
| #177 | Letters from home — rare fort event, morale shifts by content     |
| #178 | Independence Day — July 4 celebration morale bump                 |
| #179 | Lightening the wagon — discard at landmarks for ox-fatigue cut    |
| #180 | Year-sensitive dialogue — 1849+ California talk flavor            |

## More animals

| #    |                                                           |
| ---- | --------------------------------------------------------- |
| #139 | Milk cow — daily dairy, pace reduction, grazing-dependent |
| #140 | Pack mule — extra carry capacity outside the wagon        |
| #141 | Goats — poor-man's milk cow                               |

## System reworks

| #    |                                                            |
| ---- | ---------------------------------------------------------- |
| #174 | Bullets — split into lead + powder + caps for authenticity |

## UI / UX polish

| #    |                                                                  |
| ---- | ---------------------------------------------------------------- |
| #157 | Terrain + weather visual revisit — parallax, clouds, rain/snow   |
| #159 | WagonScene strip framing pass — viewBox crop + cloud anchoring   |
| #167 | Trail-map cluster labels overlap at modal tier 1                 |
| #169 | WagonScene paused state still reads as motion                    |
| #163 | PartyPanel mini-stats vs top-bar duplication — keep-or-drop      |
| #147 | Success/arrival view rework — richer than current score panel    |
| #133 | EventModal polish — animations + glyphs                          |
| #112 | Wagon modal visual redesign                                      |
| #132 | Party view rework — denser / fullscreen                          |
| #86  | Expand hover tooltips across all data points                     |
| #102 | Pre-made vs custom starter kit choice                            |
| #134 | Water keg/barrel glyph next to water amount                      |
| #145 | Camp view — eliminate laptop scroll                              |
| #170 | Use new ox-team design beyond the travel strip                   |
| #171 | Laurel Hill landmark art — only gap from #89 batch               |
| #172 | Travel mileage calibration second pass — Whitman/Barlow inserts  |
| #173 | TownStage hero art — hoist LandmarkArt into Visit view (Phase B) |

## For Claude Design or another SVG animation generator

| #156 | Wagon SVG visual revisit — proportions / damage / addons        |
| #87  | Rich event visuals                                              |
| #162 | Components revisit — StatBar + PartyPanel avatar designer pass  |

## Balance / audit

| #    |                                                            |
| ---- | ---------------------------------------------------------- |
| #182 | Hunt yields audit — tallow / animal fat as byproduct?      |

## Known design-incoming

- **Claude Design integration** — Dave is iterating on UI mockups in Claude Design (released this week, post-cutoff). Plan TBD pending the format of the handoff (mockups vs. code vs. tokens). Rework targets likely include `play/+page.svelte`, `CampStage`, `TownStage`, `OutfitView`, modals.

## Recently shipped

- **#168** Party Card hover desaturated — added the missing `background: var(--c-panel)` override (was letting the global `button:hover` rust fill bleed through) and dropped the per-row `.party-row:hover` rust tint (rows aren't individually clickable; whole panel is one button, so row-level hover just stacked rust on top of the panel hover). Ill / dead row treatments preserved — those still convey state.
- **#181** newspaper paper-styled modal — `applyNewspaper` now stages a `PaperBatch` on `flags._paperBatch` (postName + dateline + items[]), `NewspaperModal.svelte` mounts when the flag is present (same pattern as PostHuntModal / CampSummaryModal), `?/ackPaper` server action clears the flag on dismiss. Modal reuses `ParchmentBg` for the grain/age-stain layer; layout is intentionally plain (small-caps masthead, dashed-rule story dividers, IM Fell English serif) — Claude Design will rework when ready. `applyNewspaper` signature gained a `postName` param; tests + +page.server.ts updated.
- **historical pass** — period-flavor items + luxury haul + newspapers (#150 follow-up). Items: cornmeal, salt_pork, saleratus, lard, tar_bucket, vinegar; luxury haul (anvil 800 / china_tea_set 400 / feather_mattress 300); existing `sugar` re-flavored as period loaf form (loaf_sugar folded in rather than duplicated). New `news-headlines.ts` (35 curated headlines spanning 1846-1859, year+month gated), `generateNewspaper`/`applyNewspaper` interleave 2-4 historical headlines with 1-2 gossip items into the existing addNews pipeline, headline ids tracked in `flags._headlinesRead` to avoid re-serves. Headline effects use plain descriptors (`{kind: 'california_unlock'}` / `{kind: 'tribe_shift', ...}`) resolved at apply time — keeps `news-headlines.ts` a pure-data file (no circular import on systems/news.ts) and devalue-safe. Gold Rush headline flips `_californiaUnlocked` for the future California leg (#175). Treaty of Ft. Laramie 1851 nudges Sioux/Cheyenne attitude up; Grattan Affair 1854 + Harney 1855 nudge Sioux down; Whitman Massacre 1847 nudges Cayuse down. New `townNewspaper` server action ($1) + TownStage "Read the newspaper" service card gated on the same `gossip` service flag (clerks who chat have papers). 4 new regression tests covering: 2-4 headline counts, no-repeat read tracking, Gold Rush flag flip, JSON round-trip safety.
- **#89** rich landmark display — Claude Design handoff ported (39 of 38 plotted landmarks have bespoke SVG art; only `laurel_hill` lacks dedicated art and is logged as #171). New `src/lib/ui/landmark-art/` module: `LandmarkArtFrame.svelte` chrome, `LandmarkArt.svelte` id-dispatcher, 39 per-landmark `<g>`-only Svelte components, plus `landmark-art-tokens.ts` (`LMK` palette + `LandmarkId` union). `LandmarkStage.svelte`'s placeholder slot now renders `<LandmarkArt id={landmark.id} {abandoned} />` gated by `hasLandmarkArt()`. Three id remappings (`north-platte-east → north_platte_1`, `north-platte-west → north_platte_2`, `sweetwater-ford → sweetwater_1`). Two new LANDMARKS added: `whitman_mission` (mile 1885, `abandonedAfterYear: 1847`) and `barlow_road` (mile 2013). `/dev/landmark-art` harness for visual diff against the bundled atlas + per-region showcase HTMLs.
- **#158** ox + mule team visual revisit — full handoff port to `src/lib/ui/wagon/ox-team/` (Ox/Leg/OxHead/OxYoke/OxSingleYoke/OxPole/OxChain sub-components via Svelte snippets), `gait="walking"|"stopped"` prop with explicit at-rest pose, per-ox biological variance (deterministic phase ±0.03 + amplitude 0.88–1.12× hashed from pair-idx + near/far). Tokens refresh: OX_INK→#3a1a08, new OX_RED_LT/OX_WHITE_SH/POLE_WOOD; PAIR_PHASE_OFFSET 0.13→0.05; PAIR_SPACE 22→24. Architectural shift: OxTeam owns the shared `teamBob` over the entire hitched mass; WagonScene mirrors it on the wagon translate so they ride together (was independent double-frequency bounce that read as trotting). Mule fallback preserved.
- **#164** WagonScene rAF parking — wagon was animating continuously between turns, looked like the player was traveling when they weren't. WagonScene's rAF loop now lives inside a `$effect` that fully cancels when `paused`; `t` reads via `untrack` on resume so the effect doesn't tear itself down on every frame, and `t` holds its last value across pauses (wagon freezes mid-stride, no snap to t=0). /play tracks a `wagonRolling` flag set on day-change for 1500ms and passes `paused={!wagonRolling}` — wheels + parallax now only run for ~1.5s after a Travel action.
- **#166 + #160** trail-map data plumbing + visual revisit — both views were ignoring `currentMileage` (modal hardcoded the wagon glyph at `(700,260)` and the traveled/remaining paths to that frozen design-handoff state; snippet's SVG was a one-leg painting). Built `trail-map-svg/landmark-coords.ts` (per-landmark x,y in modal coord-space) + `TrailMapPaint.svelte` (shared SVG content, `paintScale` prop for proportional fonts/strokes when zoomed). `interpolatePosition()` now skips un-plotted landmarks so the wagon advances proportionally between adjacent plotted ones. Modal: wagon glyph + traveled/ahead polylines now data-driven from `currentMileage`. Snippet: 320×100 wagon-following camera window with `slice` aspect, wagon anchored at right-30% so most of the strip shows what's ahead (~2-3 upcoming landmarks). Bespoke per-leg snippet art (prairie stipple, sand dunes, named rivers) traded for honesty — per-region terrain repaint stays a future concern.
- **starter-kit audit** — BASE_KIT trimmed to a sensible day-1 floor: 300 flour + 50 beans + 30 bacon (variety unlocks #110), 2 coffee + 2 salt + 4 bandages + 1 cookware (brew/cure/triage paths all reachable), bullets dropped (useless without rifle — Hunter/Gunsmith bring one), water_skin dropped (wagons declare their own keg cap). Wagon spare parts no longer pre-loaded (player buys at outfit). Banker $800→$600. Preacher's duplicate shovel removed. Coffee/tea consumption now scales with adult count (1 oz/adult/day, 16 oz/lb) — 2 adults: 8 days/lb, 4 adults: 4 days/lb, children skip the brew.
- **#161B** BrandLockup SSR flicker — auto-variant SSR default flipped from mark to wordmark via `null`-sentinel for unmeasured `clientWidth`. Common case (wide containers) now renders correctly first paint, no hydration reflow. Narrow contexts pass `variant="mark"` explicitly.
- **#161A** icon-dictionary expansion — added 9 new categories (post_kinds, professions, town_services, fauna, ford_methods, journey_menu, end_screen, status, trend) covering ~50 emojis the brand pass left as literals. Consumers (ProfessionPicker, post-theme, HuntModal, PostHuntModal, FordModal, FordSummaryModal, TownStage, JourneyMenu, EndScreen, party-related modals, /new) all route through the typed dictionary now.
- **#151** dig-grave camp action — hidden until `_burialPending` is set, then handles the burial (clears flag, +2 morale w/ shovel). No more preemptive flavor click.
- **#143** wet firewood — rain/snow/storm cuts the day's gather (×0.5 / ×0.6 / ×0.2); wagon canvas keeps stockpiled wood dry. Multi-day wet weather drains the pile and the existing no-wood cold camp triggers naturally. Log line on noticeably-wet days.
- **#148** scoring system — miles + 200/survivor + 1000 arrival + luxury bonus on delivery. New `grandfather_clock` item (100 lb, $50, +1000 score) is the headline luxury — at Independence outfit + Ft. Laramie. Score breakdown surfaces on EndScreen.
- **#119** travel calibration audit — 8 high-plain landmarks reclassed mountains→prairie, Laurel Hill mountains→forest, mountain mult 0.55→0.65, base pace +2 mi/day. Realistic moderate-pace journey now hits ~150-day historical median.
- **#165** wagon clouds parallax-couple to scrollX — same axis as terrain, far/near depth jitter
- **#13** trail content — 2 road ranches + 4 scenic landmarks
- **#120** trading-post stock quantities + monthly restock
- **#121** Indian relations foundation — 9 tribes, attitudes, regions
- **#127** random encounters — 9 events, tribe-aware natives
- **#129** party events — quarrels, fistfights, romance, grudge tracker
- **#146** tombstone game-over screen
- **#149** cannibalism camp actions — corpse + draw-straws
- **#150** news/gossip system — clerk tips with real world-effects
- **#152** town services — round 1: blacksmith / inn / gambling / brothel
- **#152** town services — round 2: stepper inputs + ask-around news + pox risk + hire-a-guide + fullscreen TownStage replacing VisitModal
- **#154** profession rebalance — farmer berry-forage + Doctor / Blacksmith / Scout / Indian Trader bonuses wired, summaries cleaned
- **#155** starvation flow — HP curve + Starvation deathCause
- **#106** water rework — clean/dirty pools + find/boil camp actions, knowledge-gated UI
- **#136** water events — foul stream, alkali pond, keg break, spill, clear spring
- **#144** camp action time-cost rebalance — read_bible / find_water / dig_well retuned
- **#153** weather pass — 8-state daily Markov picker (terrain × season × stickiness), travel + water multipliers, rain refill / storm damage / frost morale, weather-gated event firings, WagonScene reads real state
- **#90** trail-map redesign — replaced flat parchment-strip with parchment-snippet HUD + click-to-expand pan/zoom modal showing the full 2,170-mi trail. SVG ported verbatim from Claude Design handoff. /dev/trail-map harness for visual diff.
- **#105** terrain grazing for oxen — per-terrain × season grazing quality, oxen draw on grain when grass is thin (mountains/desert/winter), travel +40% fatigue and slower rest recovery without feed; mountain/desert posts now stock grain; thin-grass chip on WagonPanel
- **#110** varied diet + coffee/tea bonuses — drawing from ≥2 nutrition groups (starch / meat / fresh) gives +1 morale; coffee/tea pulled out of calorie draw, brewed daily for +1 morale and a wired-in waterborne-disease −40% modifier; ~1 lb per 5 brew-days
- **#107** per-wagon equipment requirements — yokes now gate the hitched team (1 per pair of oxen); starter kit ships per-wagon yoke counts (1/2/3) and heavy wagons get a spare wheel + planks; major posts stock yokes; legacy saves get a one-time yoke top-up; "unyoked" warning chip on WagonPanel

## TODO

_(empty — items moved into the sections above)_
