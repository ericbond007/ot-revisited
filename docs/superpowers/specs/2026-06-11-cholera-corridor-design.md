# Cholera corridor (#1389) — design

**Problem.** The engine's death rate sits at the quiet-year historical
band (0.14/6-soul journey vs 0.12–0.15) while simulating an 1849 start —
a peak corridor year that should run 0.21–0.36 (Unruh 4% / Mattes 6% /
Bashore 3.5%). The year-gated cholera arrival events already fire 4–8×
more in 1849/1852 (year-sweep baseline,
`2026-06-11-year-sweep-baseline.md`) but kill nobody — the corridor
years announce themselves without biting.

**Historical basis** (mortality-calibration research, 2026-06-11):
Asiatic cholera clustered on the Platte flood plain, 1849–1853, tied to
the river's chemistry (Altonen, PSU 2000); it was "rarely mentioned in
diaries once they passed Fort Laramie." Attack rates in corridor years
back out to ~15–25% of emigrants; near-zero in 1845/1856–57. Crucially,
the RIVER WATER ITSELF was the vector and pre-germ-theory emigrants
could not tell — "clean" river-dipped water carried it. Boiling for
coffee/tea protected without anyone knowing why.

## Mechanic: ambient corridor incidence

New daily system `applyCholeraCorridorRisk` (own function in
`systems/consumption.ts` beside `applyDirtyWaterRisk`, registered
immediately after it on the daily spine — unscoped, NPC parity like its
sibling):

- **Gate:** `state.date.year` ∈ CHOLERA_CORRIDOR_YEARS (1849–1853
  inclusive, named set) AND `state.location.milesTraveled <
  CHOLERA_CORRIDOR_END_MI` — derived at module load from
  `runningMilesTo('ft_laramie')` (travel.ts helper), NOT hardcoded
  (Altonen: cholera faded past Laramie).
- **Roll:** ambient daily chance per member —
  `CORRIDOR_AMBIENT_CHOLERA_CHANCE = 0.005` (sweep-tuned start; see
  calibration) × `waterborneDiseaseModifier(state)` (the coffee/tea
  accidental-boil protection — LOAD-BEARING, keep) × the doctor halving
  (same shape as the dirty channel). Children at
  `CHILD_DIRTY_WATER_RISK_MULT` (1.5×, reuse the existing constant).
  Adults rolled first then children (stream-stability pattern from
  #1259 §1b); at most ONE infection per day across BOTH water channels
  combined (if the dirty channel already infected today, skip — read
  how the two can coordinate; simplest: corridor roll runs only when
  the dirty channel returned no infection).
- **Inflicts `cholera`** (the corridor was specifically Asiatic
  cholera; the dirty-keg channel keeps its cholera/dysentery pick).
  Skip members already carrying it.
- The existing low-grade dirty-keg channel and the year-gated news/
  arrival events are untouched — they're the "summer complaint" flavor
  and the signal layer; this adds the lethality.

**Calibration arithmetic** (comment it at the constant): the corridor is
~600 mi ≈ 45 travel days for a 6-soul party = 270 member-days; at 0.005
that's ~1.3 expected onsets/party-transit ≈ the 15–25% attack band.
Tune by sweep to land corridor-year deaths at 0.21–0.36/party.

## Mandatory axes

- **NPC parity (#298):** registered unscoped on the daily spine beside
  applyDirtyWaterRisk — NPC wagons inherit (verify their tick reaches
  it; sibling already does).
- **game-ai (#302):** no new persona surface. The signal layer exists
  (cholera-rumor news #230, year-gated arrival events); coffee/tea
  purchase is already in shopping lists; partyRiskAversion (#1388)
  handles child-aboard event caution. Signal-honest: agents and players
  read the same news.

## Gates

1. `scripts/year-sweep.ts --runs 60` AFTER vs the committed BEFORE:
   corridor years (1849/1852) deaths/party → **0.20–0.36**; quiet years
   (1843/1846/1855/1858) unchanged within noise; corridor deaths
   predominantly Cholera west-of-nothing (i.e., the cause table shows
   Cholera appearing in corridor years only).
2. `scripts/bot-stats-250.ts` (1849 start): child share stays **38–45%**
   (the #1259 band must hold — children roll the corridor at 1.5×).
3. `scripts/arrival-timing.ts --model so --runs 150`: family archetypes
   EXPECTED to dip at the 1849 default start; document the deltas —
   band misses here are honest 1849 reality and feed #1384's re-tier
   (sequenced next), not a reason to soften the corridor.
4. Full `npm run verify`.
