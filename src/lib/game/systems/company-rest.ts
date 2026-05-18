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

  let minHP = 100;
  for (const party of partyGroups) {
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
    return { mode: 'crisis_layby', reason: `crisis: min HP ${Math.round(agg.minPartyHP)}` };
  }

  const params = DOCTRINE_PARAMS[train.doctrine];

  // 2. Sabbath — devout doctrine on the Sabbath day.
  if (params.sabbath && isSunday(state.date)) {
    return { mode: 'sabbath_layby', reason: 'Sabbath observance' };
  }

  // 3. Maintenance — condition-driven, with hysteresis. If we're
  //    already mid maintenance/crisis block, hold until the company
  //    clears the trigger by a margin (no 1-day-thrash). Otherwise,
  //    fire when the doctrine's threshold is first crossed.
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

  return { mode: 'travel', reason: 'no rest trigger' };
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
