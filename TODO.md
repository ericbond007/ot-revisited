# Remaining TODOs

As of 2026-04-25 (post-#110). 20 open.

## New mechanics

| #    | |
| ---- | ---------------------------------------------------------------- |
| #148 | Scoring system — miles × survivors + arrival + luxury-item bonus |

## More animals

| #    | |
| ---- | --------------------------------------------------------- |
| #139 | Milk cow — daily dairy, pace reduction, grazing-dependent |
| #140 | Pack mule — extra carry capacity outside the wagon        |
| #141 | Goats — poor-man's milk cow                               |

## System reworks

| #    | |
| ---- | -------------------------------------------------------------- |
| #107 | Per-wagon equipment requirements (yokes, spare-part bulk)      |
| #143 | Wet firewood — rainy-day fire failures                         |
| #151 | Rework dig-grave camp action — situational, not preemptive     |

## UI / UX polish

| #    | |
| ---- | ------------------------------------------------------ |
| #147 | Success/arrival view rework — pair with #148 scoring   |
| #90  | Hand-drawn map rework                                  |
| #87  | Rich event visuals                                     |
| #89  | Rich trading post / landmark display                   |
| #133 | EventModal polish — animations + glyphs                |
| #112 | Wagon modal visual redesign                            |
| #132 | Party view rework (denser / fullscreen)                |
| #86  | Expand hover tooltips across all data points           |
| #102 | Pre-made vs custom starter kit choice                  |
| #134 | Water keg/barrel glyph next to water amount            |
| #145 | Camp view — eliminate laptop scroll                    |

## Balance / audit

| #    | |
| ---- | --------------------------------- |
| #119 | Travel distance / map scale audit |

## Known design-incoming

- **Claude Design integration** — Dave is iterating on UI mockups in Claude Design (released this week, post-cutoff). Plan TBD pending the format of the handoff (mockups vs. code vs. tokens). Rework targets likely include `play/+page.svelte`, `CampStage`, `TownStage`, `OutfitView`, modals.

## Recently shipped

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
- **#105** terrain grazing for oxen — per-terrain × season grazing quality, oxen draw on grain when grass is thin (mountains/desert/winter), travel +40% fatigue and slower rest recovery without feed; mountain/desert posts now stock grain; thin-grass chip on WagonPanel
- **#110** varied diet + coffee/tea bonuses — drawing from ≥2 nutrition groups (starch / meat / fresh) gives +1 morale; coffee/tea pulled out of calorie draw, brewed daily for +1 morale and a wired-in waterborne-disease −40% modifier; ~1 lb per 5 brew-days
