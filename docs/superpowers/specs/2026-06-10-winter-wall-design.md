# Winter wall (#1304) — the designed late-season clock

**Problem.** Post-#1284 the game is honest but consequence-free on time: 2,500-run
timing data (Apr 15 start) shows aggressive/pace_pusher arriving median Oct 11–14
(historically correct) while every other persona medians **Nov 6–9** and tails run
to **Dec 29** — "successful" Christmas crossings of the Cascades, which historically
were rescue stories, not arrivals. There is no in-game day cap, no winter mechanic;
the only lateness penalty ever was the bot harness's synthetic cutoff. The lost
month decomposes to ~16 moving days of pace + ~10 unsuppressed rest days — and the
existing schedule-pressure machinery (`src/lib/game/ai/schedule.ts`: per-persona
`targetArrivalDay`, behind/critical states) **exempts family wagons entirely**
(#1235), which is historically inverted.

**Decisions (Dave, 2026-06-10):** progressive attrition + probabilistic closure
with a terminal snowed-in ending (Q1 opt 1); both gates + hidden yearly variance
(Q2 opt 1); signal-honest agents — bots/NPCs/players all read the same observable
signals, nobody reads the hidden severity (Q3 opt 1). Agent knowledge of the risk
is a first-class requirement.

## 1. Winter model

**Hidden severity:** per-run roll at game start (engine rng, stored in a
non-surfaced flag, e.g. `_winterSeverity: 'early' | 'normal' | 'late'`, weighted
~25/50/25). It shifts every date below by −14 / 0 / +14 days. NEVER read by any
agent or UI — it leaks only through the §3 signals.

**Two winter zones** (by trail-position range, derived from the landmark catalog,
not hardcoded raw miles without comment):
- **Blue Mountains** — the blue_mountains→grande_ronde climb region (~mile
  1840–1900): the first gate.
- **Barlow/Cascades** — barlow_road→laurel_hill→oregon_city (~mile 2070–2170):
  the trap (closes ~2 weeks later than the Blues; it is the gate late runs hit).

**Progression** (dates at 'normal' severity; all via the existing weather system —
`weather.ts` already has fall/winter snow/frost weights, this adds a zone+calendar
escalation, not a parallel weather system):
1. **Mountain storms** (from ~Oct 1): inside a winter zone, snow/storm weather
   gains a rising daily floor through October. Snow days in-zone: travel multiplier
   penalty (stacking with existing weather effects), elevated ox fatigue + party
   exposure pressure (existing systems — cold/fire/clothing already model camp
   misery; no new damage channel).
2. **Closure rolls** (from ~Nov 1): each in-zone snowstorm rolls closure odds that
   escalate with the calendar (e.g. ~10% per storm at Nov 1 → ~40% by Dec 1).
   A closure = the pass is impassable for `2 + rng(0..4)` days — the wagon camps
   in place, burning food/firewood, oxen weakening (the squeeze: every closure
   makes the next storm likelier to be fatal).
3. **Snowed in** (from ~Dec 1, or after N cumulative closure days in deep winter):
   a closure rolled in deep winter while the pass is still ahead becomes terminal:
   `outcome: 'snowed_in'` — a new game-over with its own end-screen narrative
   (tombstone copy; the cannibalism/starvation systems run their course in the
   epilogue text, not as playable days). NPC wagons in-zone roll the same fate.

## 2. Seasonal grazing decline (the organic leading edge)

`consumeOxenFeed` / grazing efficiency gains a calendar term: full grass through
August, declining through September–October to a winter floor (~40% efficiency by
November). Effect: ox recovery sags weeks before the first storm — lateness starts
compounding *naturally*, and the §3 signals land on a party already feeling slow.
Period-true (emigrant stock starved on dead autumn grass). Applies to player and
NPC wagons identically (grazing is shared math).

## 3. Signals — everyone reads the same world

All severity information reaches agents and players ONLY through observable state:
1. **News items** (`news.ts` — a "Heavy snow is in the high passes" line already
   exists): a seasonal snow-news schedule keyed to the hidden severity — first
   mountain snow reports appear ~Sep 20 ('early' years) / ~Oct 5 ('normal') /
   ~Oct 20 ('late'), escalating in tone ("first dustings" → "wagons turning
   back" → "the passes are closing"). News surfaces at posts, encounters, and
   the existing news channels.
2. **Felt weather**: first-frost and early-snow days on the party's own trail
   (the weather system, severity-shifted in fall) — observable in the log/UI.
3. **Fort gossip** at Hall / Boise / Whitman (the posts before the gates):
   landmark news lines that repeat the current severity signal — Grant at Hall
   warning emigrants is the period anchor.

## 4. Agent layer — how bots and NPCs know and act (first-class requirement)

**Shared estimator:** a pure function `estimateSnowSafeDay(state)` in
`schedule.ts` — derives the agent's current best guess of the safe-arrival day
from observable state only: baseline (historical prior ≈ day 185 / Oct 16) minus
an adjustment per signal seen (first snow-news day, frost-days count — read from
flags the news/weather systems already set or one small `_firstSnowNewsDay`
flag). Early-year agents see signals sooner → estimate drops sooner → react
sooner. The estimator is THE shared brain: bots, NPC captains, and the player UI
chip all call it.

**schedulePressure** becomes seasonal: `behind`/`critical` measured against
`min(doctrine.targetArrivalDay, estimateSnowSafeDay(state))`. The #1235 family
exemption is **inverted**: family wagons use a tightened margin (children in the
snow is the nightmare that drove real captains) — `applySchedulePressure`'s
family branch flips from exempt to -10 days on the estimate.

**Persona responses** (existing surfaces, no new ones): `pickPace` upgrades a
rung under `behind` and to fast under `critical` (health floors still respected);
`allowsSabbathRest` already consults pressure — sacred personas (faithful,
sunday_rester) hold the Sabbath until `critical`, then break it (the period
agony, in one line); discretionary camps (suppressCamp) veto under `behind`.

**NPC company governance:** `companyRestDecision` gains a season term — under
`behind`-or-worse (computed with the same estimator on the captain's state),
maintenance lay-bys are deferred and Sabbath lay-bys suppressed unless doctrine
is devout-and-not-critical; the existing dissent system then surfaces the
drama (devout members dissent against a pushing captain) with zero new UI.
Solo NPC wagons (loner personas) read the estimator through their own
schedulePressure as above.

**NPC parity:** weather/zone effects reach NPC wagons through the daily-steps
spine + TrainEnv weather (shared); closure days hold the whole train in place
(train-level: a closed pass closes it for everyone at that position); grazing
decline is shared math; snowed-in outcome applies to NPC wagons in-zone.

## 5. Player legibility

- **Projected-arrival chip** (top bar, near the date): "At this pace: Oregon City
  ~Nov 9" — `projectedArrivalDay(state)` already exists; the chip colors
  ok/behind/critical against `estimateSnowSafeDay` (the same brain the bots use —
  the player is told exactly what the agents know, nothing more).
- News dread + felt weather carry the rest. No other UI.
- Z Fold 4 width respected; chip degrades to an icon+date.

## 6. Gates

- bot-stats-250 + arrival-timing distribution (the /tmp/arrival-timing.ts probe
  graduates into `scripts/`), BEFORE = current master, 250×10 same seeds:
  - Arrival histogram SPLITS at the wall: normal-severity arrivals settle
    ~60–75% overall; aggressive/pace_pusher ≥ 85%; December ghost-arrivals
    become `snowed_in` endings.
  - **Signal-legibility check:** bucket runs by hidden severity — agents in
    'early' years must clear the Blue Mountains measurably sooner than 'late'
    years (proof the signals work; it is the same proof a player needs).
  - Persona medians compress toward Oct (the pressure works); cautious/family
    runs show the inverted exemption biting.
  - No starvation resurgence (the #1284 economy must absorb faster pace);
    verify + both mandatory axes named above.
- Watch-fors: pressure over-rotation (personas grueling-pace into ox death —
  health floors must hold); closure-camp death spirals reading as unfair
  (closure food burn vs the #1284 buffer).

## 7. Out of scope

- Scoring date tiers (#148). Relief parties (#1322 — natural pairing AFTER the
  wall exists: they meet late parties in the Barlow zone). Start-date grass-up
  gating (spring-side realism, separate). Multi-year saves / overwintering at
  forts (a snowed-in survivor mechanic — future). Art for snow states (GAP).
