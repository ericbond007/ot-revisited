# Schedule-Pressure Gate (bot/NPC) — Design

**Ticket:** #1235 (reframed). **Date:** 2026-06-06.

**Goal:** Stop the player-bot and NPC drivers from dawdling themselves over the
220-day clock. Add a per-persona "am I behind schedule?" signal that suppresses
*discretionary* camping (hunt / pan / voluntary rest / opportunistic findWater)
when the season is burning, while *critical* needs (near-empty water, HP/oxen
crisis) and *sacred* observance (Sabbath, for the devout) always win.

## Why

Diagnostic (450-run 3/0 sweep, 2026-06-06): **61% of failures are stalls** —
parties that hit the 220-day cap ~370 mi short while **alive, fed, watered, and
holding cash** (morale 90, 3/3 alive). They are simply too slow: stalled runs
burn ~61 days on rest+hunt+findWater vs ~40 for arrivals. The daily decision
chain has **no clock awareness** — each persona's `shouldHunt`/`shouldRest`/
`shouldFindWater` fires on local state alone, never "I'm behind, push on."
(Deaths, separately, are dominated by dehydration — tracked in #1245, out of
scope here.)

Historically, emigrants ran on a strict schedule sense: ~15 mi/day, depart
mid-April (after grass is up), **Independence Rock (~mi 815) by July 4**, over
the final mountains before mid-October snows (the Donner Party's fatal miss).
Lay-bys were *strategic* (recuperate stock before a desert leg, weekly Sabbath),
and pressed parties cut them. This design encodes that judgment per persona.

## Architecture

### 1. Signal — `src/lib/game/ai/schedule.ts` (new, game-ai namespace #302)

Pure function of state; self-correcting (no magic pace constant):

```ts
// projected finish day if the party holds its average all-in pace so far
export function projectedArrivalDay(state: GameState): number | null {
  const journeyDay = state.day;                     // cumulative journey day (monotonic from 1)
  const miles = state.location.milesTraveled;
  if (journeyDay < MIN_JUDGE_DAYS || miles < MIN_JUDGE_MILES) return null; // too early
  return journeyDay * (TOTAL_TRAIL_MI / miles);
}

export type SchedulePressure = 'ok' | 'behind' | 'critical';

export function schedulePressure(
  state: GameState,
  targetArrivalDay: number | null
): SchedulePressure {
  if (targetArrivalDay === null) return 'ok';        // chaos: ignores the clock
  const proj = projectedArrivalDay(state);
  if (proj === null) return 'ok';                    // too early to tell
  if (proj <= targetArrivalDay) return 'ok';
  if (proj <= targetArrivalDay + CRITICAL_MARGIN) return 'behind';
  return 'critical';
}
```

Constants: `MIN_JUDGE_DAYS = 20`, `MIN_JUDGE_MILES = 100`, `CRITICAL_MARGIN = 15`.
`TOTAL_TRAIL_MI` already exists (`game/ai`). `state.day` is the engine's
cumulative journey-day counter (monotonic from 1, used as `state.day - X`
throughout the codebase) — no date helper needed.

### 2. Doctrine — `personaScheduleDoctrine: Record<PersonaId, ScheduleDoctrine>`

```ts
interface ScheduleDoctrine {
  targetArrivalDay: number | null;  // null = ignores the clock (chaos)
  sabbathSacred: boolean;           // true = never cut Sunday rest, even critical
}
```

| Persona | targetArrivalDay | sabbathSacred |
|---|---|---|
| pace_pusher | 165 | false |
| aggressive | 175 | false |
| balanced | 185 | false |
| generous | 190 | false |
| cautious | 190 | false |
| sunday_rester | 195 | **true** |
| faithful | 195 | **true** |
| hoarder | 205 | false |
| drinker | 205 | false |
| chaos | null | false |

Exposed on the persona (new optional `scheduleDoctrine` field on the Persona
interface, defaulting via the map) so both the bot runner and NPC drivers read
it the same way.

### 3. Gate — applied in the decision layer

The bot runner's daily chain (`src/lib/dev/bot/runner.ts`) and the NPC driver
(`src/lib/game/systems/wagon-train.ts`) consult `schedulePressure` before the
discretionary branches. A shared helper keeps the rule in one place:

```ts
// game/ai/schedule.ts
export function allowsCampAction(
  kind: 'hunt' | 'pan' | 'findWater' | 'voluntaryRest' | 'sabbath',
  pressure: SchedulePressure,
  doctrine: ScheduleDoctrine
): boolean
```

Rules:

| Action | `ok` | `behind` | `critical` |
|---|---|---|---|
| hunt (food above starvation floor) | yes | no | no |
| pan / raid / steal | yes | no | no |
| findWater, keg ratio in [0.25, 0.6) | yes | no | no |
| findWater, keg ratio < 0.25 | yes | yes | yes (critical override) |
| voluntary morale/HP rest | yes | trimmed | no |
| HP-crisis / oxen-worn-out rest | yes | yes | yes (critical override) |
| Sabbath rest, `sabbathSacred` | yes | yes | yes (sacred) |
| Sabbath rest, not sacred | yes | no | no |

"Critical override" branches are decided by the *existing* crisis predicates
(keg < 0.25, `minPartyHealth < crisisFloor`, `oxenWornOut`) — the gate only
suppresses the *discretionary* tier. Near-starvation likewise overrides the
hunt suppression (`foodOnHand < STARVATION_FLOOR`).

Wiring: the persona discretionary predicates (`shouldHunt`, `shouldRest`'s
voluntary branch, `shouldFindWater`'s non-critical branch, `shouldPan`) call
`allowsCampAction(...)` with the party's pressure + doctrine. Critical branches
remain unconditional. This preserves each persona's *local* triggers and only
adds the clock gate on top.

### 4. Parity & scope

- **NPC parity (#298):** non-company NPC wagons use their persona's doctrine via
  the same helper. **In-company rest (#927) is unchanged** — company-level
  schedule doctrine is a noted follow-up, not this ticket.
- **game-ai (#302):** signal + doctrine + helper all live under `game/ai`.
- **Human player UI: unchanged.** No gating of the human, no schedule nag. A
  player-facing "behind schedule / winter risk" hint is a separate UI ticket
  (YAGNI here).

## Testing

**Unit (`tests/`):**
- `projectedArrivalDay`: returns null before MIN_JUDGE thresholds; linear after
  (50% trail in 100 days → 200).
- `schedulePressure`: ok / behind / critical boundaries; chaos (null target) →
  always ok; early-game → ok.
- `personaScheduleDoctrine`: every PersonaId present; faithful & sunday_rester
  `sabbathSacred: true`, all others false.
- `allowsCampAction`: discretionary suppressed at behind/critical; critical
  overrides allowed at every tier; Sabbath sacred vs non-sacred.

**Sweep gate (`--runs 2`, 1.2k, BEFORE/AFTER):**
- **PASS** = stall% drops and arrived% rises **without wiped% spiking**
  (pushing on must not cause mass death) — checked per-shape and per-persona.
- Persona spread preserved: pace_pusher/aggressive big arrived gains;
  hoarder/drinker/chaos modest; faithful/sunday_rester still slower (Sabbath
  tax visible). If wiped% jumps materially, the gate is too aggressive — relax
  CRITICAL_MARGIN or the critical-override floors and re-sweep.

## Out of scope (tracked elsewhere)
- Dehydration as dominant death — #1245.
- Company-level (#927) schedule doctrine for in-train wagons.
- Player-facing schedule UI hint.

---

## Tuning outcomes (2026-06-07, implementation)

Implemented and sweep-gated. Final shipped constants (`schedule.ts`):
- `CRITICAL_WATER_RATIO = 0.35`, `STARVATION_FLOOR = 45` (raised from the spec's 0.25/30 during tuning).
- Fitness floor: `MIN_PUSH_HP = 60`, `MIN_PUSH_MORALE = 55` — schedule pressure stands down when a party is worn (protects sick adult companies from being pushed to death).
- **Children-aware exemption:** a party with any living child is never schedule-pushed. Rationale is **logistics/pace**, NOT child fragility — see below.

### Why children-aware (and why the fitness floor alone failed)

The seed-aligned BEFORE/AFTER sweep was expanded to 6 shapes (added **4/2** labor-rich family and **3/3** big family). With the fitness floor alone, family shapes regressed: **4/2 wiped +6** despite 4 robust adults — because the floor keys on the party's *minimum* HP/morale, which a labor-rich family keeps high while the party as a whole runs thin. Adding the children-aware exemption returned **every** family shape to exactly baseline while preserving the bachelor-shape gains:

| Shape | BEFORE | Fitness-floor only | Children-aware (shipped) |
|---|---|---|---|
| 3/0 | 19 | 23 (+4) | 23 (+4) |
| 4/0 | 28 | 43 (+15) | 43 (+15) |
| 2/2 | 24 | 19 (−5), wiped +3 | 24 (0) |
| 2/4 | 4 | 5 | 4 (0) |
| 4/2 | 9 | 13, wiped +6 | 9 (0) |
| 3/3 | 1 | 2 | 1 (0) |

The exemption is **logistics, not fragility**: more mouths thin provisions across one wagon, and families historically traveled at a measured pace (Faragher 1979). Notably, the engine models children as *hardier* than adults (0.7× dehydration & river-loss damage, 0.6×/0.5× consumption), and disease is not child-weighted — so the family-shape deaths are the adults/whole party, not the children.

### Coverage added
- Override-persona gate unit tests (cautious/aggressive/chaos) — `tests/schedule-gate-overrides.test.ts`.
- `tooFragileToPush` unit tests incl. the children exemption — `tests/schedule-pressure.test.ts`.
- All 10 personas (incl. the 6 #287b named variants) are exercised by the sweep.

## Out of scope (new follow-up)
- **Child mortality is historically under-modeled** (children are *hardier* in-engine, the reverse of history: dysentery was the #1 child killer, cholera hit children hardest, and wagon-wheel/drowning child accidents are absent). Filed as a separate content ticket. The schedule gate does not touch this — family wagons are exempted — so the two are orthogonal.
