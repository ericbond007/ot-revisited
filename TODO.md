# Remaining TODOs

As of 2026-04-26 (post-#143). 23 open.

## New mechanics

| #    | |
| ---- | ---------------------------------------------------------------- |
| _(none open)_ | |

## More animals

| #    | |
| ---- | --------------------------------------------------------- |
| #139 | Milk cow — daily dairy, pace reduction, grazing-dependent |
| #140 | Pack mule — extra carry capacity outside the wagon        |
| #141 | Goats — poor-man's milk cow                               |

## System reworks

| #    | |
| ---- | -------------------------------------------------------------- |
| #151 | Rework dig-grave camp action — situational, not preemptive     |

## UI / UX polish

| #    | |
| ---- | ------------------------------------------------------------------------- |
| #156 | Wagon SVG visual revisit — proportions / damage / addons (post-playtest)  |
| #157 | Terrain + weather visual revisit — parallax, clouds, rain/snow feel       |
| #158 | Ox + mule team visual revisit — proportions, gait, yoke (post-playtest)   |
| #159 | WagonScene strip framing pass — viewBox crop + sun/cloud anchoring        |
| #160 | Trail-map visual revisit — snippet framing, modal pan/zoom, route coords  |
| #161 | Brand revisit — extend icon-dictionary, BrandLockup SSR flicker           |
| #162 | Components revisit — StatBar bar retrofit, PartyPanel avatar designer pass |
| #163 | PartyPanel mini-stats vs top-bar duplication — keep-or-drop call          |
| #164 | WagonScene — park rAF tick when stopped (atLandmark / camp / rest)        |
| #147 | Success/arrival view rework — richer than the current score panel         |
| #87  | Rich event visuals                                                        |
| #89  | Rich trading post / landmark display                                      |
| #133 | EventModal polish — animations + glyphs                                   |
| #112 | Wagon modal visual redesign                                               |
| #132 | Party view rework (denser / fullscreen)                                   |
| #86  | Expand hover tooltips across all data points                              |
| #102 | Pre-made vs custom starter kit choice                                     |
| #134 | Water keg/barrel glyph next to water amount                               |
| #145 | Camp view — eliminate laptop scroll                                       |

## Balance / audit

| #    | |
| ---- | --------------------------------- |
| _(none open)_ | |

## Known design-incoming

- **Claude Design integration** — Dave is iterating on UI mockups in Claude Design (released this week, post-cutoff). Plan TBD pending the format of the handoff (mockups vs. code vs. tokens). Rework targets likely include `play/+page.svelte`, `CampStage`, `TownStage`, `OutfitView`, modals.

## Recently shipped

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
