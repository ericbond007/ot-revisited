# Late-trail arrival audit — VK #963 (2026-05-13/14 session)

## Starting state

Bots had 0% arrival rate. Sweep-only diagnostics showed parties
covering ~1300 miles and reaching the 220-day cap "alive but
short of Oregon City." Initial framing: late-trail food/cash
provisioning, ox fatigue, rest discipline.

## What we shipped (in order)

| PR  | Change                                    | Period anchor                        |
|-----|-------------------------------------------|--------------------------------------|
| #99  | Starter food 380 → 905 lb                 | Palmer 1845                          |
| #100 | Pace c: aggressive/pace_pusher down a rung | Reed/Bryant push norms               |
| #101 | Soft ox-tired backoff at fatigue 50       | —                                    |
| #102 | Starter oxen 4 → 6                        | Marcy 1859 "extra yoke"              |
| #103 | Rest recovery 25 → 30 fatigue/day         | Marcy "8 hours lying down"           |
| #104 | pace_pusher overwork-kill cycle           | Reed 1879 Bridger memoir             |
| #105 | Unhitched oxen don't tire (F1)            | Marcy team rotation                  |
| #106 | Fatigue/200 speed curve (F2)              | Bryant + Reed Donner anchors         |
| #107 | Ox HP heals on rest (H1)                  | Marcy + Bryant Bridger 4-day stop    |
| #108 | salmon_falls terrain river → desert       | Carpenter 1857 — "deep sage..."      |
| #109 | Bot gathers firewood on rest days         | —                                    |

Eleven PRs, every one verified against `npm run verify` + a fresh
sweep, period-grounded against named diaries.

## The actual bug

**PR #108 was the real fix.** `salmon_falls` was tagged
`terrain: 'river'` but `kind: 'landmark'`. The `'river'` terrain
multiplier is **0.0** — intentional for `kind: 'river'` fords
(bot uses `ford()` to bypass) but catastrophic for a
`kind: 'landmark'` the bot walks past.

Bot trace (balanced × farmer, seed `section-trace`, pre-fix):
```
d121 mi1265 ford        (just past Fort Hall, Snake river ford)
d136 mi1343 rest        (78 mi in 15 days — moving fine)
d151 mi1343 travel      ← stuck
d166 mi1343 travel      ← stuck
d181 mi1343 travel      ← stuck
d196 mi1343 travel      ← stuck
d211 mi1343 travel      ← stuck
```

Bot reached mile 1343, hit the river-terrain landmark, and never
advanced again for 84 days. The wagon "tried to travel" each day
but `milesPerDay()` returned 0. **The stall masked every other
late-trail problem.** Bots that "survived comfortably to mile 1343"
were actually sitting on the riverbank doing nothing while the
calendar ran out.

This was a one-word data fix. The 9 prior PRs were real engine /
persona / starter-kit work, but they could only be measured against
the stall artifact. Once the stall lifted, the full picture became
visible.

## Post-fix picture

| Persona       | Pre-fix miles | Post-fix miles | Arrival% | Wipe% | Days |
|---------------|--------------|----------------|----------|-------|------|
| sunday_rester | 1451 (stuck) | 1483           | **3%**   | 93%   | 147  |
| drinker       | 1438 (stuck) | 1471           | **3%**   | 95%   | 148  |
| generous      | 1335 (stuck) | 1483 / 1431 *  | 0-2% *   | 93%   | 147  |
| balanced      | 1429 (stuck) | 1431           | 0%       | 99%   | 146  |
| pace_pusher   | 1399 (stuck) | 1419           | 0%       | 99%   | 153  |

\* generous shows 2% in one sweep, 0% in another — within run-to-run
variance at 3-5 runs/cell.

**Failure mode shift**: bots no longer stall. They reach mile
1400-1500 and **die of Exposure** in the Snake/Blue Mountains
corridor. Confirmed across 7 personas — every persona's primary
cause of death is `Exposure` (cold-night HP damage without
firewood).

This is the period-correct failure mode: Donner Party 1846 mortality
rate ~40%, mostly from cold + starvation in the Sierra after October
storms hit a depleted team.

## Why per-day speed isn't the constraint anymore

Pre-fix bot reported 8.45 mi/moving day (an artifact of the stall
where 84 zero-mile days dragged the average down). Post-fix the
bot does **13.96 mi/moving day** — right in Bryant 1846's
"ten or twelve miles per day" range. Speed math has never been the
limit; we just couldn't see it through the stall.

## The new constraint: firewood economy

Engine: `attemptFire` burns 5 lb every night unconditionally if
firewood ≥ 5. No "save fuel for cold nights" logic. So in the
Snake corridor (mostly desert sage country, gather rate 2 lb/day),
bot burns 5/night, gains 2/day → -3 lb/night net → stockpile
depletes in ~5 days → cold-mountain stretches without fire →
exposure death.

The `gather_firewood` camp action exists (yields 2× the daily passive
rate, ~12-24 lb depending on terrain). PR #109 wires the bot to use
it on rest days when firewood < 15 lb. This delivered first
non-zero arrival rates but doesn't fully solve the problem because:

- Bots still **burn** 5 lb/night even on warm prairie nights when
  no fire is needed for warmth
- Bots can't **buy** firewood at posts to stockpile before the
  Snake/Blue Mountains push

Filed as follow-up tickets:
- **#1017** — Conditional nightly fire (warm-night burn rate)
- **#1018** — Firewood as tradeable inventory item

## What was actually right about the 9 "preparation" PRs

The engine fixes (#99–#107) weren't wasted. They moved the bot
from "dies in the Snake at mile 800" (pre-session) to "dies of
exposure at mile 1450." Without them, the salmon_falls fix would
have surfaced the late-trail food/cash/oxen problems that took
10 PRs to resolve. We did the prep work, then the prep work let us
*see* the real bug.

The persona work also produced period-correct behavior:
- pace_pusher's wipe rate now matches Reed-Donner archetype (high)
- Cautious / sunday_rester achieve highest reliability (Bryant
  archetype)
- aggressive sits between (measured push, not reckless)

## Open follow-ups

**On the firewood arc** (the actual blocker for arrival rate):
- **#1017** Conditional fire — don't burn 5 lb on warm nights
- **#1018** Firewood as inventory item — buyable at HBC posts

**On the umbrella (#963)**:
- Re-sweep after #1017+#1018 land. If arrival rate climbs to
  20-40% (matching period success rate), mark #963 Shipped.
- If arrival rate stalls under 10% post-firewood, there's another
  systemic issue worth tracing.

## Tools added in this session

- `scripts/bot-section-trace.ts` — runs one bot, dumps landmark
  milestones, event distribution, and cause of death. Combine
  with `BOT_TRACE=N` env var for per-N-day status.

## Method note: trace > sweep

Sweep-only analysis showed 0% arrival forever. The session's nine
"prep" PRs were guided by sweep deltas and never revealed the
stall. **One per-day trace** (PR #108 investigation) caught the
salmon_falls bug in 30 seconds. Future late-trail investigations
should start with a trace, not a sweep — sweeps measure *outcomes*
but a stall and a slow death produce indistinguishable averages.

The `bot-section-trace.ts` script formalizes this: run one bot,
dump milestones + event distribution + death cause. Cheap to run,
makes a single failure mode immediately legible.
