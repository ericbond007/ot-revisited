# Train governance under pressure — historical research (#1304 tuning)

Research check on the three proposed fixes for the family-drag findings
(`2026-06-11-family-drag-probe-results.md`): (1) the crisis-lay-by hostage
loop, (2) the #176 train pace clamp vs schedule pressure, (3) personas
leaving a too-slow train. Three independent web-research passes, 2026-06-11.

## 1. How companies actually handled sick wagons

**Verdict: our current mechanic (serial 12-day whole-company holds, ~47
lost days/run) is firmly ahistorical.** The documented menu:

- **Default: carry the sick in the wagon bed at full pace.** Mary Homsley
  (1852) rode feverish on a featherbed for days while her measles-ridden
  train kept moving (WyoHistory.org). George Winslow's 1849 company
  "carried George in a wagon for the next six days" of cholera (NPS).
  Martha Read (1852): "jolting along in a wagon through the day."
- **Whole-company halts were ~1 day, for imminent death + same-day
  burial.** Charles Bishop (1849, near Torrington WY): company halted one
  day, he died at 1 p.m., military funeral the same day (WyoHistory.org).
  Samuel Stout's train (1853): one short day for the dying Mr. Houlett.
- **Week-long convalescence was FAMILY-scale**: the sick wagon laid by on
  its own (Martha Read's family: one week) or dropped behind with kin /
  a doctor escort and caught up later. Passing trains did not join the
  roadside family camps "waiting for someone to die" (Mattes).
- Cholera-years strategy was the OPPOSITE of holding: trains accelerated
  to out-travel the epidemic zone (Hickman 1852; Mattes p.86 burning of
  the dead's belongings).
- Even 1849 company constitutions created no enforceable wait-for-the-sick
  duty — Capt. Bruff's own company promised relief and never sent it (NPS).
- Dark end of the spectrum: abandonment of the kinless sick is repeatedly
  documented and condemned (Clay 2014, npshistory.com).

**Design implications:** company sick-halt capped at ~1 day (death-watch /
burial, small cohesion payoff); per-wagon "drop behind" state for extended
convalescence (wagon leaves the train aggregate, optionally with doctor,
rejoins later); carried-in-bed stays the travel default. Kinship governed
accommodation — strangers got dirt shoveled over them.

## 2. Late-season pace pushing by the company

**Verdict: "captain lifts the pace clamp under schedule pressure" is
historically right in shape.** Evidence:

- Schedule awareness was calendar-anchored and universal: Independence
  Rock by July 4; "everyone who came overland knew they had to be over
  the mountains by October" (1849 Rucker relief dispatch rationale).
- The push-vs-rest debate is directly documented in the Donner train,
  Oct 1846 (John Breen: "Some wanted to stop and rest their cattle.
  Others, in fear of the snow, were in favor of pushing ahead as fast as
  possible"). The Donner disaster is largely a story of FAILING to push:
  pace decayed 15→12→10 mi/day, then 4-5 days resting cattle at Truckee
  Meadows, then one fatal overnight rest below the pass. Harlan-Young,
  same trail same season, kept moving and got over (Oct 8).
- Willie handcart company (Florence, Aug 1856): a formal company VOTE to
  push on despite the season — the cleanest documented company-level
  governance decision to accept schedule risk.
- Sabbath travel was the lateness lever; "the passion for speed fractured
  companies into even smaller units that treated all days alike"
  (Christian History Institute / Cambridge Church History).
- Captains really did set the march clock — start horn, nooning, halt,
  campsite (Applegate's "Cow Column" 1843; NPS).
- **The nuance: speed-up = longer DAYS, not faster animals.** Oxen walk
  ~2 mph regardless; forced pace = 18-20 mi/day vs 12-15 via earlier
  starts and dusk driving. The cost was ox attrition, amplified by
  eaten-down late-season grass (Scharmann 1849: "1,663 oxen, either dead
  or dying" on one forced desert stretch; Marcy 1859 stock-first
  doctrine). Our ox-aware winterPaceBoost ceilings already model exactly
  this trade — keep them at the train level.

**Design implications:** the train clamp lifts under behind/critical
pressure read from the shared estimator (period-true signals: milestone
calendar, first snow on peaks, news). Surface as a captain's-council
decision so the dissent system can host the period drama (the Breen quote
is ready-made copy). Worn stock limits how hard the push can go — reuse
the ox-aware ceilings.

## 3. Wagons leaving a too-slow train

**Verdict: splitting was the RULE, not the exception; pace disagreement is
the single best-documented cause.** Evidence:

- Unruh: most formally organized companies "disintegrated in bickering
  and frustration"; property-division procedures existed BECAUSE splits
  were routine. 1847 trains "were in constant transition" (Oregon
  Pioneers).
- 1843 Great Migration split at the Big Blue over loose cattle (light
  column vs cow column — Applegate). The 120-wagon monolith fractured
  within ~3 weeks; later seasons settled on 12-24 wagon trains.
- 1846 Russell company: the CAPTAIN himself quit for pace (Russell left
  with Bryant on pack mules, June 18); the Donner Party itself was a
  route-choice split-off (Little Sandy, July 19).
- Late-season variant directly attested: 1852 Oregon press-ahead factions
  "advised repeatedly to move quickly — their lives depending on crossing
  the Cascades before the snows" (BYU Trails of Hope); Barlow Road snow
  closures 1847/1852 made the fear concrete.
- **The cost of leaving was labor and crisis resilience, NOT attack
  risk.** Unruh: ~360 emigrants killed by Indians across 1840-60;
  "thievery and not murderous attack constituted the major threat." In
  peak seasons the trail was a moving micro-society — a departing family
  joined a stream of other wagons within a day's drive. Departures were
  routine, often amicable, sometimes within "supporting distance."

**Design implications:** persona leave-train under critical pressure is
period-true and should be COMMON, not exceptional. Cost model: slower
fords/repairs, night-watch fatigue, worse crisis outcomes — not raids and
not a morale penalty (regained agency could even lift morale). #127
re-join cooldown matches the "joined a different train days later" norm.

## Sources (key)

WyoHistory.org (Bishop, Homsley, Martin's Cove, trails); NPS (cholera,
Bruff, Barlow Road, emigrant trails, Sweet Freedom's Plains quoting Unruh
1979); Mattes via Altonen medical notes; Clay "Emigrants and Death along
the Overland Trail" (2014); donnerpartydiary.com + Donner timeline;
Applegate "A Day with the Cow Column in 1843"; BYU Trails of Hope 1852
essays; Christian History Institute "No Rest for the Weary"; Ford &
Kreutzer "Oxen: Engines of the Overland Migration" (Overland Journal
33:1); Marcy "The Prairie Traveler" (1859); Oregon Encyclopedia.
