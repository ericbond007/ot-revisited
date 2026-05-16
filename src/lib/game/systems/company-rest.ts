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
import { isSunday } from '../utils/calendar';

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
