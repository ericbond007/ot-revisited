# Child mortality (#1259) — design

**Problem.** The engine models children as uniformly hardier-than-or-equal
to adults — the reverse of history. Measured at scale (ticket, 2,500
runs): children are 33% of every party but only 24% of deaths.

**Historical basis** (research pass 2026-06-11; key source Bashore/Tolley,
"Mortality on the Mormon Trail 1847–1868", BYU Studies 53:4 2014,
n=56,042, the only rigorous age-stratified trail dataset): mortality was
a J-curve — infants 12.69%, ages 1–9 3.94%, teens 1.45% (the safest
cohort), prime adults ~2.0–2.5%, elderly far worse. Disease caused ~9 of
10 deaths; for children the dehydrating diseases (cholera, dysentery)
dominated — small bodies fail in hours-to-days. The signature child
accident was the wagon run-over (Joel Hembree 1843, George Collins 1846,
Richard Harvey; Catherine Sager 1844 survived with a crushed leg).
Two emphatic NON-findings: drowning skewed adult-MALE (men did the
ferrying — 37 drowned at Green River in 1850 alone), and famine/cold
skewed adult-male too (Donner: 61% of adults died vs 31% of children;
no girl aged 4–16 died).

**Decision (Dave, 2026-06-11):** single-lever damage multiplier
(option 1) — no victim-selection bias, no flat child-fragility.

## 1. Age-banded disease lethality — dehydrating diseases only

`CHILD_DEHYDRATING_DISEASE_MULT = 1.75` (named, sweep-tunable; the
1.3–1.8x research band's upper-center because our 8-year-olds sit in
the 1–9 cohort) applied to the DAILY CONDITION DAMAGE a child takes
from conditions in a named set `DEHYDRATING_CONDITIONS` = cholera,
dysentery, plus the dirty-water disease channel's condition(s) — read
`content/conditions.ts` + `systems/conditions.ts` and `applyDirtyWaterRisk`
to enumerate exactly (typhoid/mountain_fever/measles stay FLAT — epidemic
but not child-lethality-skewed in the data).

One multiplier at the shared condition-tick damage site → player, bot,
and NPC wagons inherit identically (NPC parity by construction — verify
the NPC condition tick flows through the same function and name the
check in the commit).

## 2. `child_wagon_fall` event

Rare travel-day accident, fires only when a live child is aboard;
victim is always a child. No player choice — it happens (period: there
was no decision point; supervision was the prevention and the trains
moved anyway). Outcome roll: ~40% killed instantly (Hembree/Collins
copy — "fell from the wagon tongue; both wheels passed over him"),
~60% `broken_leg` condition (the Sager outcome). Weight calibrated
LOW — the most memorable child death, deliberately not the most common
(research: a few percent of child deaths at most). Match the existing
accident-event catalog pattern (content/events.ts) for weights/category/
deathCause plumbing; deathCause 'wagon_accident' (or the existing
nearest cause id — reuse before inventing).

## 3. Deliberately unchanged (document, don't touch)

- Ford child-loss 0.7x protection — drowning was adult-male-skewed.
- Starvation / cold exposure — Donner says adults (esp. men) die first.
- Dehydration-counter 0.7x child scaling — children got water priority
  during consumption; already modeled.
- No infant band — the game has no infants; if trail pregnancy ever
  lands (#1259 research §5), infants are a 4–6x category of their own.

## 4. Riders (folded in per Dave)

Stamp `flags._lastOxDeathDay = state.day` at the two event/action ox-kill
sites the #1388 recency window can't see: the raid-revenge ox kill in
`content/encounters.ts` (~line 1155) and the stray-loss kill in
`systems/strays.ts` (~line 76). One flag-merge per site + a test each.

## Mandatory axes

- **NPC parity (#298):** the multiplier lives in the shared condition
  damage tick; the event fires through the shared event system (NPC
  wagons' event exposure — verify whether NPC wagons roll catalog events;
  if their synth path doesn't, the disease lever still reaches them and
  the event is player/bot-facing — state which in the PR).
- **game-ai (#302):** no new persona surface. #1388's partyRiskAversion
  already makes child-carrying bots pick safe choices on health events —
  the agent layer responds to the new risk with zero new code.

## Gates

1. `scripts/bot-stats-250.ts` BEFORE (master base, captured at branch
   start) vs AFTER: child share of deaths 24% → **38–45%** (the
   research target band; tune the multiplier within 1.5–2.0 if the
   first run lands outside).
2. `scripts/arrival-timing.ts --model so --runs 150` vs
   `2026-06-11-so-after-1388.md`: family archetypes are EXPECTED to drop
   (possibly below band) — that is the honest outcome this ticket
   exists to produce; #1384's re-tier calibrates against it next.
   Non-family archetypes must hold (no child = no delta; regression).
3. Full `npm run verify` per task.
