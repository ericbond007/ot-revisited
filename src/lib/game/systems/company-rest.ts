// #1046 — company rest & recovery, slice C1: the captain-owned daily
// rest decision engine. PURE — no side effects, no engine call sites
// in C1 (wired in C2). Spec: docs/superpowers/specs/2026-05-15-1046-
// company-rest-recovery-design.md
import type {
  GameState,
  CaptainDoctrine,
  CompanyRestMode,
  CompanyRestDecision
} from '../types';
import type { PersonaId } from '../ai/types';
import type { Rng } from '../rng';
import { isSunday } from '../utils/calendar';
import { leaveTrain } from './wagon-train';
import { schedulePressure, doctrineFor, captainPressure, companyPaceCap } from '../ai/schedule';
// #1304 T2 — captainPressure + companyPaceCap live in ai/schedule.ts to avoid
// the company-rest ↔ wagon-train import cycle (company-rest already imports
// leaveTrain from wagon-train). Re-exported here so callers that naturally
// reach for company-rest as the governance module still find them in one place.
export { captainPressure, companyPaceCap };

/** Captain persona → chartered doctrine. aggressive-family pushes
 *  (hard_driver); the devotion/caution personas keep the Sabbath
 *  (devout); everything else, incl. chaos and the 'balanced' filler
 *  default, sits at the prudent middle. Spec §4. */
export function personaToDoctrine(persona: PersonaId | undefined): CaptainDoctrine {
  switch (persona) {
    case 'aggressive':
    case 'pace_pusher':
      return 'hard_driver';
    case 'cautious':
    case 'faithful':
    case 'sunday_rester':
      return 'devout';
    default:
      return 'prudent';
  }
}

export interface TrainAggregate {
  avgOxFatigue: number;
  /** Lowest alive-member HP across the whole company; 100 if nobody
   *  alive anywhere (degenerate — keeps the decision from resting). */
  minPartyHP: number;
}

/** Aggregate the whole company: the player wagon (state.party /
 *  state.oxen) plus every companion wagon. Weakest-wagon-weighted —
 *  the captain watched the company and the train moved at the
 *  condition of its worst wagon (Unruh 1979 / Faragher 1979). */
export function trainAggregate(state: GameState): TrainAggregate {
  const partyGroups = [state.party, ...(state.wagonTrain?.companions ?? []).map((w) => w.party)];
  const oxGroups = [state.oxen, ...(state.wagonTrain?.companions ?? []).map((w) => w.oxen)];

  // #1046 §13 (B) — weakest *viable* wagon. Skip a wagon whose every
  // alive member is ≤EFFECTIVE_DEAD_HP (corpse-in-motion; can't be
  // saved by laying by). Fallback: if NO group is viable (whole company
  // terminal) use all groups — don't fabricate a healthy aggregate that
  // marches into mass death (crisis fires; CRISIS_MAX_DAYS breaks it).
  const groupViable = (party: typeof partyGroups[number]) => {
    const alive = party.filter((m) => !m.dead);
    return alive.length > 0 && alive.some((m) => m.health > EFFECTIVE_DEAD_HP);
  };
  const viable = partyGroups.filter(groupViable);
  const hpGroups = viable.length > 0 ? viable : partyGroups;

  let minHP = 100;
  for (const party of hpGroups) {
    for (const m of party) {
      if (m.dead) continue;
      if (m.health < minHP) minHP = m.health;
    }
  }

  let oxSum = 0;
  let oxCount = 0;
  for (const oxen of oxGroups) {
    for (const o of oxen) {
      if (o.health <= 0) continue;
      oxSum += o.fatigue;
      oxCount += 1;
    }
  }
  const avgOxFatigue = oxCount > 0 ? oxSum / oxCount : 0;

  return { avgOxFatigue, minPartyHP: minHP };
}

interface DoctrineParams {
  sabbath: boolean;
  /** maintenance lay-by triggers (whole-company aggregate). */
  maintOxFatigue: number;
  maintMinHP: number;
}

/** Spec §4 starting values — calibration (a later slice) tunes these
 *  via the sweep; C1 locks the shape, not the final numbers. */
export const DOCTRINE_PARAMS: Record<CaptainDoctrine, DoctrineParams> = {
  hard_driver: { sabbath: false, maintOxFatigue: 65, maintMinHP: 25 },
  prudent:     { sabbath: false, maintOxFatigue: 50, maintMinHP: 40 },
  devout:      { sabbath: true,  maintOxFatigue: 50, maintMinHP: 40 }
};

/** Universal crisis floor — even a hard_driver stops here. Mirrors
 *  the existing engine emergency bar (min HP < 20). */
const CRISIS_MIN_HP = 20;

/** #1046 §13 (B) — a wagon whose every alive member is pinned at/below
 *  this is a corpse-in-motion: laying by cannot save it, so it is not
 *  the "weakest *viable* wagon" the captain holds the company for.
 *  Excluding it stops an A+D lay-by-healed undead wagon pinning the
 *  company in a permanent crisis. Starting value; slice-5 sweep-tuned. */
const EFFECTIVE_DEAD_HP = 3;

/** #1304 T1 — the company stands a one-day death-watch/burial halt
 *  (Bishop 1849 near Torrington WY: company stopped, he died at 1 p.m.,
 *  military funeral the same day; Stout 1853: one short day for Mr.
 *  Houlett). Extended convalescence is the sick family's own affair —
 *  they drop behind and the train rolls on (Martha Read 1852: one week
 *  roadside, passing trains did not join). Replaces the ahistorical
 *  12-day cap that was serially re-stamped, costing ~47 days/run.
 *  See docs/superpowers/specs/2026-06-11-train-governance-research.md. */
const CRISIS_HOLD_DAYS = 1;

/** Hysteresis: once a maintenance lay-by is called it holds until
 *  avg ox-fatigue drops a margin below the trigger (and HP recovers a
 *  margin) — prevents 1-day-rest-then-instant-retrigger thrash. */
const HYSTERESIS_OXFAT = 15;
const HYSTERESIS_HP = 10;

export function companyRestDecision(state: GameState): CompanyRestDecision {
  const train = state.wagonTrain;
  // Solo / no captain: C1 returns travel (the solo per-wagon path is
  // unchanged and owns that case; C2 only consults this in a train).
  if (!train) return { mode: 'travel', reason: 'no train' };

  const agg = trainAggregate(state);

  // 1. Crisis — highest precedence, doctrine-independent.
  if (agg.minPartyHP < CRISIS_MIN_HP) {
    const block = train.companyDecisionBlock;
    const crisisHeld =
      block?.mode === 'crisis_layby' ? state.day - block.blockStartDay : 0;

    if (crisisHeld >= CRISIS_HOLD_DAYS) {
      // #1304 T1 — one-day death-watch is over; the train breaks camp.
      // Identify NPC companion wagons still in crisis (min alive-member HP
      // < CRISIS_MIN_HP, or no alive members). These wagons drop behind to
      // nurse their own — period reality: week-long convalescence was
      // family-scale (Martha Read 1852; Bruff's company never sent relief).
      // Dead members are excluded — only alive HP counts for the drop test.
      const dropWagonIds = train.companions
        .filter((w) => {
          const alive = w.party.filter((m) => !m.dead);
          if (alive.length === 0) return true; // no survivors — not viable
          return alive.some((m) => m.health < CRISIS_MIN_HP);
        })
        .map((w) => w.id);

      if (dropWagonIds.length > 0) {
        return {
          mode: 'travel',
          reason: 'sick wagons drop behind to nurse their own',
          dropWagonIds
        };
      }
      // Player-party-only crisis: the company will not wait (Bruff's
      // company never sent the promised relief). The player's own
      // persona rest logic handles their family lay-by.
      return { mode: 'travel', reason: 'crisis hold complete — company breaks camp' };
    }
    return { mode: 'crisis_layby', reason: `crisis: min HP ${Math.round(agg.minPartyHP)}` };
  }

  const params = DOCTRINE_PARAMS[train.doctrine];

  // #1304-T4 — Season term: compute schedule pressure from the captain's
  // perspective. The captain is represented by `train.doctrine` but the
  // persona target/estimate needs a GameState reference. We derive pressure
  // using the captain's persona doctrine (if known) or fall back to
  // 'prudent' (balanced doctrine). This is the same estimator the player
  // UI chip and per-wagon pace logic uses — shared brain.
  //
  // Identify the captain's persona from the doctrine. We don't store
  // captain personaId directly — map from doctrine as a proxy:
  //   hard_driver → aggressive (target 175) or pace_pusher (165); use
  //     the doctrine-keyed personaId that best represents it.
  //   devout → faithful / sunday_rester (target 195)
  //   prudent → balanced (target 185) as the middle ground
  //
  // This is a first approximation. When a train stores captainPersonaId
  // in a future slice, read it directly. For now the mapping is:
  //   hard_driver → pace_pusher (tighter target, more conservative estimate)
  //   devout      → faithful
  //   prudent     → balanced
  const DOCTRINE_PERSONA: Record<CaptainDoctrine, PersonaId> = {
    hard_driver: 'pace_pusher',
    devout:      'faithful',
    prudent:     'balanced'
  };
  const captainPersona = DOCTRINE_PERSONA[train.doctrine];
  const captainDoctrine = doctrineFor(captainPersona);
  const pressure = schedulePressure(state, captainDoctrine.targetArrivalDay);

  // 2. Sabbath — devout doctrine on the Sabbath day.
  //
  // #1304-T4 season term: suppress Sabbath lay-bys when behind+ unless
  // doctrine is devout AND pressure is merely 'behind' (not critical).
  // devout + critical → push (the pass > the Sabbath, period reality).
  // dissent system surfaces the drama: devout members still dissent.
  if (params.sabbath && isSunday(state.date)) {
    // Devout + ok/behind → keep the Sabbath as before.
    // Devout + critical → do NOT call a Sabbath lay-by (push).
    if (pressure !== 'critical') {
      return { mode: 'sabbath_layby', reason: 'Sabbath observance' };
    }
    // Fall through to travel — devout captain breaks Sabbath when critical.
    // (No early return; travel will be returned at the end.)
  }

  // 3. Maintenance — condition-driven, with hysteresis. If we're
  //    already mid maintenance/crisis block, hold until the company
  //    clears the trigger by a margin (no 1-day-thrash). Otherwise,
  //    fire when the doctrine's threshold is first crossed.
  //
  // #1304-T4 season term: under behind+ pressure, defer maintenance
  // lay-bys unless the crisis floor fires (which is handled above).
  // The company pushes through maintainable wear when the clock is ticking.
  if (pressure === 'ok') {
    const inLaybyBlock =
      train.companyDecisionBlock?.mode === 'maintenance_layby' ||
      train.companyDecisionBlock?.mode === 'crisis_layby';

    const oxTrigger = inLaybyBlock
      ? params.maintOxFatigue - HYSTERESIS_OXFAT
      : params.maintOxFatigue;
    const hpTrigger = inLaybyBlock
      ? params.maintMinHP - HYSTERESIS_HP
      : params.maintMinHP;

    if (agg.avgOxFatigue > oxTrigger || agg.minPartyHP < hpTrigger) {
      const why = agg.avgOxFatigue > oxTrigger
        ? `maintenance: avg ox-fatigue ${Math.round(agg.avgOxFatigue)}`
        : `maintenance: min HP ${Math.round(agg.minPartyHP)}`;
      return { mode: 'maintenance_layby', reason: why };
    }
  }

  return { mode: 'travel', reason: pressure !== 'ok' ? `season pressure: ${pressure}` : 'no rest trigger' };
}

// ── #1046 B: Dissent trigger + resolution ────────────────────────────────────

const OVERRIDE_MORALE_COST = 5;
const LOBBY_FAIL_MORALE_COST = 2;
const LOBBY_BASE_CHANCE = 0.35;
const LOBBY_MORALE_PIVOT = 50;
const LOBBY_MORALE_COEFF = 0.005;
const LOBBY_PRIOR_FAIL_COEFF = 0.05;
const LOBBY_HARD_DRIVER_PENALTY = 0.10;
const LEFT_TRAIN_COOLDOWN_DAYS = 10;

export type DissentChoice = 'abide' | 'override' | 'lobby' | 'press_on';

/** Predicate: should the dissent prompt be shown right now?
 *  True iff: the player is in a captained wagon train, the current company
 *  mode is a lay-by (any variant), and no choice has been recorded yet. */
export function dissentTrigger(state: GameState, companyMode: CompanyRestMode): boolean {
  const block = state.wagonTrain?.companyDecisionBlock;
  if (!state.wagonTrain || !block) return false;
  // Dissent is for DOCTRINE lay-bys only (maintenance / Sabbath). A
  // crisis_layby is the doctrine-independent universal safety floor
  // (spec §4 "even a hard-driver stops") — C2 contractually advances
  // the day on it; never pause/prompt there.
  if (companyMode === 'travel' || companyMode === 'crisis_layby') return false;
  return block.dissentChoice === undefined;
}

/** Apply the player's (or bot's) dissent answer. Pure — returns a new GameState.
 *  The recorded dissentChoice is sticky: calling this a second time with a
 *  different choice is a caller bug; the function will overwrite but callers
 *  should gate on dissentTrigger first. */
export function resolveCompanyDissent(
  state: GameState,
  choice: DissentChoice,
  rng: Rng
): GameState {
  const train = state.wagonTrain;
  if (!train || !train.companyDecisionBlock) return state;
  const block = train.companyDecisionBlock;

  /** Helper: stamp a dissentChoice onto the block and merge any extra GameState
   *  fields (morale delta, eventLog append, flags patch). */
  const setChoice = (
    c: NonNullable<typeof block.dissentChoice>,
    extra: Partial<GameState> = {}
  ): GameState => ({
    ...state,
    ...extra,
    wagonTrain: { ...train, companyDecisionBlock: { ...block, dissentChoice: c } }
  });

  if (choice === 'abide') return setChoice('abide');

  if (choice === 'press_on') {
    // Leave the train entirely — wagonTrain becomes null.
    const left = leaveTrain(state);
    return {
      ...left,
      flags: { ...left.flags, _leftTrainCooldownUntilDay: state.day + LEFT_TRAIN_COOLDOWN_DAYS }
    };
  }

  if (choice === 'override') {
    // Player-captain only: override the lay-by, pay the morale cost.
    return setChoice('override', {
      morale: Math.max(0, state.morale - OVERRIDE_MORALE_COST),
      eventLog: [...state.eventLog,
        { day: state.day, text: `You overruled the company's lay-by. (−${OVERRIDE_MORALE_COST} morale)` }]
    });
  }

  // choice === 'lobby': appeal to the NPC captain.
  // Devout captains will not break the Sabbath under any argument.
  if (train.doctrine === 'devout' && isSunday(state.date)) {
    return setChoice('lobby_fail', {
      morale: Math.max(0, state.morale - LOBBY_FAIL_MORALE_COST),
      eventLog: [...state.eventLog,
        { day: state.day, text: `The captain will not break the Sabbath, whatever you say. (−${LOBBY_FAIL_MORALE_COST} morale)` }]
    });
  }

  // Gated lobby roll: morale bonus, prior-fail penalty, doctrine stubbornness.
  const moraleBonus = (state.morale - LOBBY_MORALE_PIVOT) * LOBBY_MORALE_COEFF;
  const priorFails = (state.flags._failedLobbyCount as number | undefined) ?? 0;
  const failPenalty = priorFails * LOBBY_PRIOR_FAIL_COEFF;
  const stubborn = train.doctrine === 'hard_driver' ? LOBBY_HARD_DRIVER_PENALTY : 0;
  const threshold = LOBBY_BASE_CHANCE + moraleBonus - failPenalty - stubborn;

  if (rng.chance(Math.max(0, threshold))) {
    return setChoice('lobby_ok', {
      eventLog: [...state.eventLog,
        { day: state.day, text: `Your appeal carried — the captain calls a travel day.` }]
    });
  }

  return setChoice('lobby_fail', {
    morale: Math.max(0, state.morale - LOBBY_FAIL_MORALE_COST),
    flags: { ...state.flags, _failedLobbyCount: priorFails + 1 },
    eventLog: [...state.eventLog,
      { day: state.day, text: `The captain refused your appeal. (−${LOBBY_FAIL_MORALE_COST} morale)` }]
  });
}

// ── #1304 T2 — Lift-log: captain orders longer marches ────────────────────
//
// Level-trigger: fires once when pressure first crosses into behind/critical
// for an episode, then stays silent until pressure returns to ok (flag clears).
// Pure in the "same inputs → same outputs" sense; the side-effect is appending
// to eventLog + toggling a flag, but there is no I/O.
//
// Called from the daily-steps spine (POST_BRANCH_STEPS) so both player and
// bot runs emit the log on the same code path — same contract as checkSnowNews.

/**
 * #1304 T2 — Emit a one-time "captain orders longer marches" event log entry
 * when schedule pressure first rises above 'ok' for a new episode.
 *
 * State flags:
 *   _trainPaceLiftFlagged  true while the lift-log has been emitted and
 *                          pressure is still behind/critical.  Cleared when
 *                          pressure returns to 'ok' so the next behind/critical
 *                          episode re-arms the log.
 *
 * Period anchor: the Donner Party's decision to push vs. rest at Truckee
 * (Breen Oct 1846); the Willie Company Florence vote (Aug 1856) — company
 * assembled, captain announced longer marching days.
 */
export function checkTrainPaceLift(state: GameState): GameState {
  if (!state.wagonTrain) return state; // solo — no captain
  if (state.completed) return state;

  const pressure = captainPressure(state);
  const flagged = !!state.flags._trainPaceLiftFlagged;

  // Re-arm: pressure returned to ok — clear the flag so next episode re-fires.
  if (pressure === 'ok' && flagged) {
    return { ...state, flags: { ...state.flags, _trainPaceLiftFlagged: null } };
  }

  // Lift: pressure first crosses above ok in this episode — log once.
  if (pressure !== 'ok' && !flagged) {
    return {
      ...state,
      flags: { ...state.flags, _trainPaceLiftFlagged: true },
      eventLog: [
        ...state.eventLog,
        {
          day: state.day,
          text: `The captain orders longer marches — the company fears the snows in the passes.`
        }
      ]
    };
  }

  return state;
}
