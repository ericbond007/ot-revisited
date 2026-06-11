# Bot decision-surface audit (#1361) + SO tier calibration analysis (#1384)

Audit of every bot/agent decision surface ("are they taking into account
the proper things before they decide to act") run 2026-06-11 against
master f5a05b31 (post-#1304). One finding from the automated pass was
discarded as stale (pickPace "season-blind" — `winterPaceBoost` +
`companyPaceCap` + `schedulePressure` cover it since #1304); everything
below was spot-verified against master.

## Confirmed HIGH gaps (provably distort outcomes)

1. **pickFordMethod is seasonally naive** (`ai/personas.ts`, all personas)
   — reads cash + nativeFerry availability ONLY. No weather, no calendar
   (June snowmelt vs August trickle), no party HP, no river depth tier.
   A cautious wagon pays $10 ferry over an August trickle; an aggressive
   one fords a June flood. Period reality: crossing choice was THE
   judgment call of the trail.
2. **pickWaterRation ignores active party dehydration** — projects dry
   days ahead and reads keg totals, but never consults whether a member
   already carries the dehydration condition. A dehydrated party on a
   full keg before a dry stretch doesn't escalate rationing.
3. **pickOxSwapCount is terrain/grade-blind** — gap-aware (150/200 mi
   thresholds) but flat-earth: entering the Blues or Cascades with a
   3-ox worn team triggers nothing the prairie wouldn't. Also ignores
   recent ox-death history (a stampede-halved team doesn't panic-buy).
4. **pickRepairBudget is terrain/season-blind** — same shape as #3:
   condition thresholds don't scale for desert/mountain stretches ahead
   or the late-season load-bearing window.
5. **pickEventChoice is party-composition-blind** — `saferHealthChoice`
   exists, but no surface weights choices by Doctor presence or
   children present. The cautious schoolmarm and the all-male mess
   read a risky remedy identically.

## Confirmed MED gaps

- **pickRations is horizon-blind**: no calendar/remaining-miles term; a
  late-September wagon with 60 lb eats `filling`.
- **shouldHunt is terrain-deaf**: same lb-threshold on buffalo prairie
  (40 lb hauls) and forest (15 lb).
- **shouldFindWater lacks dirty-water urgency**: 50% clean + 15% dirty
  reads as 65% full; no boil-priority spike when dirtyWater is high and
  canBoilWater holds.
- **shouldTradeAtPost is wagon-condition/season-blind**: skips a
  last-post-before-gap when food is fine even with a 50% wagon.
- **bundleCampActions is weather/condition-blind**: a cholera party or a
  rainy day gets the same urgency mix as a sunny healthy one.
- **pickBarterDispositions doesn't pre-check post.barterPreferred**
  (quoteBarter vetoes downstream, so this only wastes proposals).
- **thirstWantsEasedPace reads ox hydration, not party dehydration.**
- **pickWheelBreakResponse lacks distance-to-smithy/season context.**
- **Sabbath/lay-by gates are weather-blind** (faithful keeps a Sabbath
  in a mountain blizzard until pressure says critical).

## Cleared as sound

pickPace (winter clock covered post-#1304), suppressCamp,
allowsSabbathRest, desertWaterFloor, shouldPan, gap-aware shopping
helpers (no logic drift found — shared helpers used consistently;
no stale clean-water-only inputs remain, #1281/#1136 convention holds).

## #1384 — SO tier calibration analysis

Final SO gate (150×14, post-#1304, docs/superpowers/specs/2026-06-11-so-final-1304.md):

| Tier | Actual | Authored target | Drivers |
|---|---|---|---|
| easy | 97% | 85–90 | Mess 97, Freight 98, Doctor 95 |
| moderate | 76% | 60–75 | TF 75 ✓, Honeymoon 73 ✓, Trader 75 ✓, Flock 80, Speculator 79 |
| hard | 81% | 40–55 | **Whore Train 95, Extended Clan 95**, Widow 73, Schoolmarm 63 |
| brutal | 37% | 25–40 | Mountain Man 74 vs Unprepared 0 |

The overshoot is concentrated: Whore Train (6 adults, teamster leader)
and Extended Clan (4 adults + teamster) are materially STRONG outfits —
the "hard" labels came from social narrative, not composition math. The
historical record (2026-06-11-party-composition-research.md) says
normal-year arrival ran ~80–90% and family wagons ~95%; the famous 50%
death cohorts were late starts, cholera years, and cutoff gambles — not
baseline compositions. The honest engine reproducing that is a feature.

Calibration options (Dave decides — ticket says don't tune unilaterally):
1. **Re-tier by composition math**: Whore Train + Extended Clan →
   moderate-or-easy bands; Mountain Man → hard until #1165 makes him
   actually solo; tighten easy to 90–97. Tiers mean "expected arrival
   for a competent agent of this composition."
2. **Keep authored bands, add composition weaknesses** (cash drains,
   social events, stock penalties) until the numbers fall. Manufactures
   weakness to hit a number — historically dishonest.
3. **Two-axis targets (recommended pairing with 1)**: keep arrival bands
   per option 1 AND add per-archetype death-rate/score bands. A Whore
   Train that arrives at 95% but buries two of six en route is still a
   "hard" experience; arrival-binary hides that. The bot report already
   carries endingAliveCount — the harness change is small.

## Disposition

#1361 fix work should be sliced: the five HIGHs are each a small,
testable PR (ford seasonality being the largest — it wants river-depth
metadata). MEDs ride along where they share a file. #1385 (chaos
self-wipe) stays separate.
