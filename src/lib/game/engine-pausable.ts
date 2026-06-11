import type { GameState, CompanyRestMode } from './types';
import { makeRng } from './rng';
import type { Rng } from './rng';
import { upgradeState } from './upgrade';
import { tickWeather } from './systems/weather';
import { checkClosure, isPassClosed, winterZoneAt } from './systems/winter';
import { recoverOxenFatigue, recoverOxenHealth, snowCoverGrazingMult } from './systems/oxen';
import { pushMoraleHistory } from './systems/morale';
import { applyTravel, milesToLandmark } from './systems/travel';
import { rollEvent, resolveEvent } from './systems/events';
import { advanceTrain, applyNpcPostRestock, leaveTrain } from './systems/wagon-train';
import { companyRestDecision, dissentTrigger, resolveCompanyDissent } from './systems/company-rest';
import type { DissentChoice } from './systems/company-rest';
import { maybeElectCaptain, forceElection } from './systems/wagon-train-elections';
import type { CrisisVoteReason } from './systems/wagon-train-elections';
import type { GameEvent } from './content/events';
import { getLandmark } from './content/landmarks';
import { getLandmarkArrivalEvent } from './content/landmark-arrival-events';
import { pickApproachEvent, approachFiredFlag } from './content/landmark-approach-events';
import { pickText } from './content/text-pools';
import { isSunday } from './utils/calendar';
import { sundayLayBy, defaultSabbathActions } from './actions/sunday-lay-by';
import { runSteps, MORNING_STEPS, TRAVEL_OX_WAGON_STEPS, POST_BRANCH_STEPS, PRE_TRAVEL_STEPS, POST_EVENT_TAIL_STEPS, type TickCtx } from './daily-steps';
import { hasFoodOnHand } from './systems/cannibal';
import { canSlaughterOx } from './actions/camp-actions';

function advanceDate(d: { year: number; month: number; day: number }) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = (d.year % 4 === 0 && d.year % 100 !== 0) || d.year % 400 === 0;
  const cap = d.month === 2 && leap ? 29 : daysInMonth[d.month - 1];
  let { year, month, day } = d;
  day += 1;
  if (day > cap) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

// #1284 T4 — Player-facing ox-slaughter starvation prompt.
// Fires as a level-trigger (same pattern as #1279 NPC crisis): when food
// hits 0 AND a slaughterable spare ox exists AND we haven't asked this
// spell yet (_oxSlaughterAskedDay unset). One shot per zero-food spell;
// re-arms when food recovers (cleared in morning steps below when hasFoodOnHand).
// The 'slaughter' choice applies the camp action directly; 'hold_out'
// dismisses and day advances normally. This surfaces the §3 mechanic so
// no player starves not knowing the lever exists.
const OX_SLAUGHTER_PROMPT_EVENT: GameEvent = {
  id: 'ox_slaughter_prompt',
  category: 'health',
  title: 'The flour sack is empty',
  body: 'The flour sack is empty. Old Bright looks back at you.',
  weight: 0, // synthetic — never rolls from the random-event bank
  choices: [
    {
      id: 'slaughter_now',
      label: 'Slaughter the weakest ox',
      apply: (s) => {
        // Directly apply the slaughter_ox action effect inline so we don't
        // need to import the action object — avoids a circular dep on rng.
        if (!canSlaughterOx(s)) return s;
        const sorted = s.oxen.slice().sort((a, b) => {
          if (a.health !== b.health) return a.health - b.health;
          return b.fatigue - a.fatigue;
        });
        const victim = sorted[0];
        const oxen = s.oxen.filter((o) => o.id !== victim.id);
        const inventory = { ...s.inventory, game_meat: (s.inventory.game_meat ?? 0) + 325 };
        const flags = { ...s.flags, _gameMeatSpoilDay: s.day + 3 };
        return {
          ...s, oxen, inventory, flags,
          eventLog: [...s.eventLog, { day: s.day, text: `Slaughtered ${victim.id}. Dressed out ~325 lb of beef. Eat it fresh or cure it within 3 days.` }]
        };
      }
    },
    {
      id: 'hold_out',
      label: 'Hold out — not yet',
      apply: (s) => s
    }
  ]
};

export interface PausableTickResult {
  state: GameState;
  pendingEvent?: GameEvent;
}

/** Surface a fired event for the player by resolving its dynamic
 *  context (bodyKey text-pool variant, then the optional `prepare`
 *  hook for #282/#289-style events). Used at all 3 firing sites
 *  (rollEvent / arrival / approach) so the wire is one-place-only and
 *  testable in isolation. */
export function prepareEventForSurfacing(
  state: GameState,
  event: GameEvent,
  rng: Rng
): GameState {
  let s = state;
  if (event.bodyKey) {
    const resolvedBody = pickText(event.bodyKey, rng, event.body);
    s = { ...s, flags: { ...s.flags, _pendingEventBody: resolvedBody } };
  }
  if (event.prepare) {
    if (import.meta.env?.DEV && event.bodyKey) {
      // The prepare hook is allowed to overwrite _pendingEventBody, but
      // doing so silently masks the bodyKey resolution. Surface this in
      // dev so it's visible when an event accidentally sets both.
      // eslint-disable-next-line no-console
      console.warn(
        `[event ${event.id}] sets both bodyKey and prepare — prepare's body wins.`
      );
    }
    s = event.prepare(s, rng);
  }
  return s;
}

export function tickDayPausable(state: GameState): PausableTickResult {
  const normalized = upgradeState(state);

  // #1189 — auto-Sabbath rest. When the toggle is on AND today is a
  // Sunday, intercept BEFORE any daily systems run (including tickWeather)
  // and delegate entirely to sundayLayBy, which calls rest() internally.
  // rest() handles all the daily mechanics (consumption, healing, weather,
  // etc.) so there's no double-application. Skipped for wagon-train members
  // — the company-rest decision (C2/#1046) governs train Sundays and wins.
  if (
    normalized.flags._autoSabbathRest === true
    && isSunday(normalized.date)
    && !normalized.completed
    && !normalized.wagonTrain
  ) {
    const actions = defaultSabbathActions(normalized);
    return { state: sundayLayBy(normalized, actions), pendingEvent: undefined };
  }

  const rng = makeRng(`${normalized.seed}:${normalized.day}`);

  let s = tickWeather(normalized, rng);

  // #1304 — closure check. After weather is known, if the party is in a
  // winter zone and today is a snowstorm past CLOSURE_START_DOY, roll to see
  // if the pass closes. Uses sub-rng `winter:${seed}:${day}` — does NOT
  // disturb the main daily rng. If snowed_in triggers, the tick returns early
  // (completed game, no further systems run). Log line for closure + snowed_in.
  if (!s.completed && winterZoneAt(s.location.milesTraveled)) {
    const closureResult = checkClosure(s);
    if (closureResult.closureTriggered) {
      const closedUntil = closureResult.state.flags._passClosedUntil as number;
      const duration = closedUntil - s.day;
      if (closureResult.snowedIn) {
        s = {
          ...closureResult.state,
          eventLog: [
            ...closureResult.state.eventLog,
            {
              day: s.day,
              text: `The pass is closed by a deep winter storm. The company is trapped.`
            }
          ]
        };
        return { state: s };
      } else {
        s = {
          ...closureResult.state,
          eventLog: [
            ...closureResult.state.eventLog,
            {
              day: s.day,
              text: `The pass is snowed in — the way is impassable for ${duration} day${duration === 1 ? '' : 's'}.`
            }
          ]
        };
      }
    }
  }

  // #285 phase 2 — crisis-triggered re-election. Consumed at the top of
  // the next tick after the trigger was set (currently the only
  // trigger is refusing a starvation share; see npc-crisis-events).
  // Runs before the morale / travel / event systems below so the new
  // captaincy is in effect for those — `tickWeather` above is purely
  // meteorological and has no captaincy dependency. If a future system
  // is captaincy-sensitive AND must run before this block, move it
  // below; otherwise leave it.
  const pendingVote = s.flags._pendingCaptaincyVote as
    | { reason: CrisisVoteReason }
    | undefined;
  if (pendingVote && s.wagonTrain) {
    s = forceElection(s, rng, pendingVote.reason).state;
  } else if (pendingVote) {
    // Trigger set but the player left the train — drop the flag so it
    // doesn't sit forever.
    const cleared = { ...s.flags };
    delete (cleared as Record<string, unknown>)._pendingCaptaincyVote;
    s = { ...s, flags: cleared };
  }

  // #1055 — Sabbath debit moved out of this slot. It used to fire
  // unconditionally on Sundays, BEFORE the company-rest decision was
  // computed — which penalised devout companies that lay-by on the
  // Sabbath (the entire point of the devout doctrine). Now gated on
  // companyMode === 'travel' and applied after the decision is known
  // (search for "Sabbath-breaking morale debit" below).

  // ctx unused by morning steps; companyMode not yet decided
  s = runSteps(MORNING_STEPS, s, rng, { traveled: false, driver: 'player' });

  // #1284 T4 — Spell-clear: if the player now has food again (found a post,
  // traded for salmon, hunted, etc.), clear the ox-slaughter asked flag so
  // a future empty spell will re-fire the prompt. Mirrors the NPC
  // crisisAskedDay clear in wagon-train.ts:advanceTrain.
  if (hasFoodOnHand(s) && s.flags._oxSlaughterAskedDay !== undefined) {
    const cleared = { ...s.flags };
    delete (cleared as Record<string, unknown>)._oxSlaughterAskedDay;
    s = { ...s, flags: cleared };
  }

  // #review (lay-by oxen) — decide travel-vs-lay-by BEFORE today's ox /
  // wagon wear, so a company lay-by day doesn't tire the oxen or age the
  // wagon (this mirrors the NPC `traveled` gate in tickNpcWagon). Solo
  // wagons have no train, so the decision is { mode:'travel' } and their
  // behaviour is byte-identical to before. The decision block + dissent
  // are still persisted further down, reusing `restDecision`.
  const restDecision = s.wagonTrain ? companyRestDecision(s) : null;
  const companyMode: CompanyRestMode = restDecision?.mode ?? 'travel';
  const ctx: TickCtx = { traveled: companyMode === 'travel', driver: 'player' };
  if (companyMode === 'travel') {
    s = runSteps(TRAVEL_OX_WAGON_STEPS, s, rng, ctx);
  } else {
    // Lay-by: the team rests rather than pulls — no fatigue, no wagon
    // wear.  Uses terrain × snow-cover recovery (same as rest.ts + NPC path
    // post-T6b/T6c): no calendar/seasonal term, but snow cover applies
    // because a trapped team in a snowed pass starves (Marcy cured-grass
    // principle + 2578–2581 pawing-through snow).
    const coverMult = snowCoverGrazingMult(s.weather ?? 'clear');
    const recovery = Math.round(
      (s.location.terrain === 'desert' || s.location.terrain === 'mountains' ? 5 : 15) * coverMult
    );
    s = { ...s, oxen: recoverOxenHealth(recoverOxenFatigue(s.oxen, recovery)) };
  }
  s = runSteps(POST_BRANCH_STEPS, s, rng, ctx);

  // Snapshot which landmark we'd already passed before today's travel —
  // used below to detect a fresh arrival.
  const prevLandmarkBefore = s.location.previousLandmarkId;

  // #1046 C2 — the captain's daily decision gates the whole company.
  // companyRestDecision reads the PRIOR companyDecisionBlock for
  // hysteresis; persist the updated block right after (for tomorrow's
  // hysteresis + slice-B dissent). No train → decision is
  // { mode:'travel' } so solo behavior is byte-identical to before.
  // companyMode + restDecision were computed above (before ox/wagon wear).
  // Persist the updated decision block for tomorrow's hysteresis + slice-B
  // dissent. No train → nothing to persist; solo behaviour unchanged.
  if (s.wagonTrain && restDecision) {
    // #1304 T1 — before stamping the block, drop any sick companion wagons
    // that the decision has flagged. These wagons nurse their own and the
    // company rolls on; each earns a period-voiced log line. Done first so
    // the day proceeds as a genuine travel day with the slimmed roster.
    if (restDecision.dropWagonIds && restDecision.dropWagonIds.length > 0) {
      const dropSet = new Set(restDecision.dropWagonIds);
      const toLog: string[] = [];
      const remaining = s.wagonTrain.companions.filter((w) => {
        if (dropSet.has(w.id)) {
          // Capitalize the wagon name for period-voiced log sentence.
          const displayName = w.name.charAt(0).toUpperCase() + w.name.slice(1);
          toLog.push(`${displayName} drops behind to nurse their sick. The company rolls on.`);
          return false;
        }
        return true;
      });
      const dropEntries = toLog.map((text) => ({ day: s.day, text }));
      s = {
        ...s,
        wagonTrain: { ...s.wagonTrain, companions: remaining },
        eventLog: [...s.eventLog, ...dropEntries]
      };

      // #1304 review Finding 4 — if every companion just dropped, dissolve
      // the train entirely. The player continues alone; train-level perks
      // (TRAIN_MORALE_PER_DAY, night-risk halving, pace cap) must not persist
      // with an empty companions list.
      if (s.wagonTrain && s.wagonTrain.companions.length === 0) {
        s = leaveTrain(s);
        // leaveTrain appends its own "Split off…" log; append the dissolve note.
        s = {
          ...s,
          eventLog: [
            ...s.eventLog,
            {
              day: s.day,
              text: `The last wagons have fallen behind — the company is no more. The family travels alone.`
            }
          ]
        };
        // wagonTrain is now null; the block-stamp below would read s.wagonTrain
        // which is null — skip it by jumping past the if(s.wagonTrain) guard.
        // restDecision block ends here; nothing more to stamp.
      }
    }

    // Re-read wagonTrain after the possible drop/dissolve mutation above.
    // If dissolve fired (all companions dropped), wagonTrain is now null —
    // skip the block-stamp entirely; there is no captain to update.
    if (s.wagonTrain) {
      const train = s.wagonTrain;
      const block = train.companyDecisionBlock;
      const isNewBlock = !block || block.mode !== restDecision.mode;
      s = {
        ...s,
        wagonTrain: {
          ...train,
          companyDecisionBlock: isNewBlock
            ? { mode: restDecision.mode, blockStartDay: s.day }
            : block
        },
        eventLog: isNewBlock
          ? [...s.eventLog, { day: s.day, text: `The company ${restDecision.mode === 'travel' ? 'breaks camp' : 'lays by'} — ${restDecision.reason}.` }]
          : s.eventLog
      };
    }
  }

  // #1046 B — dissent. On a forced lay-by the player hasn't answered
  // for THIS block, pause for the modal. Resume is NOT a re-tick — the
  // play route / bot calls applyCompanyDissent (a tail-only
  // continuation, like applyPendingChoice) so the daily systems that
  // already ran above are not double-applied.
  if (s.wagonTrain && dissentTrigger(s, companyMode)) {
    s = { ...s, flags: { ...s.flags, _companyDissentPending: true } };
    return { state: s };
  }

  s = runSteps(PRE_TRAVEL_STEPS, s, rng, ctx);

  // #300 — capture miles before travel so advanceTrain can drive the
  // NPC axle-grease consumption cycle off the same daily delta.
  const milesBeforeTravel = s.location.milesTraveled;
  if (companyMode === 'travel') {
    s = applyTravel(s, rng);
  }
  const milesTraveledToday = s.location.milesTraveled - milesBeforeTravel;

  const arrivedAtLandmark = s.location.atLandmarkId !== null && s.location.atLandmarkId !== undefined;

  // #285 — Wagon-train captain elections. Fires when the player
  // arrives at a major post (Kearny / Laramie / Bridger / Hall /
  // Boise) while in a train AND avg train morale is below the
  // threshold (period-faithful: re-elections were petitioned by an
  // unhappy company, not scheduled). Per-(landmark, day) flag inside
  // maybeElectCaptain prevents re-rolls; just adds a log line + may
  // swap leaderId. No modal yet — the player learns the result via
  // the day's log.
  if (arrivedAtLandmark && s.wagonTrain) {
    s = maybeElectCaptain(s, rng).state;
    // #299 — NPC food restock at trading posts. Per-(landmark, day)
    // flag inside applyNpcPostRestock prevents re-fire when bouncing
    // through TownStage; gates internally on landmark.kind ===
    // 'trading_post'.
    s = applyNpcPostRestock(s);
  }

  // #1021 — free water refill at trading-post arrival. Period reality:
  // every Oregon Trail trading post was sited next to a year-round
  // water source (Platte, Laramie, Black's Fork, Snake, Boise, Walla
  // Walla), and emigrant diaries are unanimous that refilling the
  // cask was free and routine. Bryant 1846: "we watered the team and
  // the cask at every fort." Royce 1849: "the cask was full again at
  // Bridger." Carpenter 1857 at Hall: "topped off everything at Hall
  // before the desert." Per-(landmark, day) flag prevents re-fill on
  // every TownStage tick. Gated on kind === 'trading_post' so river
  // crossings (which are gated by the ford action) don't double-dip.
  if (arrivedAtLandmark && s.location.atLandmarkId) {
    const here = getLandmark(s.location.atLandmarkId);
    const flag = `_wateredAtPost:${s.location.atLandmarkId}:${s.day}`;
    if (here?.kind === 'trading_post' && !s.flags[flag]) {
      const cap = s.resources.waterCap;
      const beforeWater = s.resources.water;
      if (beforeWater < cap) {
        s = {
          ...s,
          resources: { ...s.resources, water: cap },
          flags: { ...s.flags, [flag]: true },
          eventLog: [
            ...s.eventLog,
            { day: s.day, text: `Topped off the water cask at ${here.name}. (${cap - beforeWater} gal)` }
          ]
        };
      } else {
        s = { ...s, flags: { ...s.flags, [flag]: true } };
      }
    }
  }

  const prevLandmarkAfter = s.location.previousLandmarkId;

  // #1039 — water refill when the party passes a scenic landmark
  // flagged `waterSource` (Salmon Falls = the Snake River fishery). The
  // #1021 post refill is gated on kind:'trading_post' and fords refill
  // via the ford action; this is the third water-access channel — a
  // walk-past landmark that nonetheless sits on a year-round source the
  // emigrants descended to. Fires once per (landmark, day) like #1021.
  if (
    prevLandmarkAfter
    && prevLandmarkAfter !== prevLandmarkBefore
  ) {
    const passed = getLandmark(prevLandmarkAfter);
    const flag = `_wateredAtSource:${prevLandmarkAfter}`;
    if (passed?.waterSource && !s.flags[flag]) {
      const cap = s.resources.waterCap;
      const beforeWater = s.resources.water;
      if (beforeWater < cap) {
        s = {
          ...s,
          resources: { ...s.resources, water: cap },
          flags: { ...s.flags, [flag]: true },
          eventLog: [
            ...s.eventLog,
            { day: s.day, text: `Descended to the water at ${passed.name} and filled the cask. (${cap - beforeWater} gal)` }
          ]
        };
      } else {
        s = { ...s, flags: { ...s.flags, [flag]: true } };
      }
    }
  }

  // Landmark arrival events fire when we cross a scenic landmark (one
  // that doesn't already pause for a Visit/Ford/End screen). Detected by
  // a change in previousLandmarkId during this tick. Skipped at
  // stop-worthy landmarks so the post/river/end UI is the moment.
  // #1046 C2 — lay-by days don't move, so prevLandmarkId can't change;
  // gate on companyMode === 'travel' defensively.
  if (
    companyMode === 'travel'
    && !arrivedAtLandmark
    && prevLandmarkAfter
    && prevLandmarkAfter !== prevLandmarkBefore
    && s.flags._lastEventDay !== s.day
  ) {
    const arrival = getLandmarkArrivalEvent(prevLandmarkAfter, s);
    if (arrival) {
      s = prepareEventForSurfacing(s, arrival, rng);
      return { state: s, pendingEvent: arrival };
    }
  }

  // Approach events (#233) — first-sight vignettes that fire BEFORE
  // reaching a landmark, when its silhouette first becomes visible from
  // miles out. One-shot per landmark via _approachFired_<id>. Skipped on
  // arrival days so the at-landmark stage takes precedence.
  // #1046 C2 — no approach events on lay-by days (the company isn't moving).
  if (companyMode === 'travel' && !arrivedAtLandmark && s.flags._lastEventDay !== s.day) {
    const approach = pickApproachEvent(s, (id) => milesToLandmark(s, id));
    if (approach) {
      s = {
        ...s,
        flags: { ...s.flags, [approachFiredFlag(approach.landmarkId)]: true }
      };
      s = prepareEventForSurfacing(s, approach.event, rng);
      return { state: s, pendingEvent: approach.event };
    }
  }

  // Travel events fire only on the road, never on arrival at a landmark
  // (trading post, river, end). If the day's travel just parked us at a
  // stop-worthy landmark, the player gets the landmark stage first; any
  // on-road event from today would arrive on top of the trading-post UI.
  // Check event WITHOUT resolving. If cooldown allows, roll; if one fires, pause here.
  // #1046 C2 — no travel events on lay-by days.
  if (companyMode === 'travel' && !arrivedAtLandmark && s.flags._lastEventDay !== s.day) {
    const pending = rollEvent(s, rng);
    if (pending) {
      s = prepareEventForSurfacing(s, pending, rng);
      return { state: s, pendingEvent: pending };
    }
  }

  // No event — continue.
  s = runSteps(POST_EVENT_TAIL_STEPS, s, rng, ctx);

  // #280b/#288 — advance NPC wagons one day alongside the player.
  // traveled = whether the company actually moved today (#1046 C2).
  // Each companion runs its own attrition. May return a pendingEvent
  // if a companion just hit a starvation crisis — surface it before
  // advancing the day.
  const trainResult = advanceTrain(s, companyMode === 'travel', milesTraveledToday);
  s = trainResult.state;
  if (trainResult.pendingEvent) {
    // #1266 stage3 — the tail (POST_EVENT_TAIL_STEPS) + advanceTrain already
    // ran this tick; stamp the day so applyPendingChoice doesn't double-apply
    // them on resume.
    s = { ...s, flags: { ...s.flags, _tailRanDay: s.day } };
    // #1279 — mark crisisAskedDay on the target companion so the
    // level-trigger doesn't re-fire this spell while the modal is
    // live. The continuations that DROP the event (applyCompanyDissent,
    // applyPendingChoice's tailAlreadyRan path) do NOT mark — so a
    // dropped event re-fires next tick via the unmarked crisisAskedDay.
    const npcWagonId = trainResult.pendingEvent.npcWagonId;
    if (npcWagonId && s.wagonTrain) {
      s = {
        ...s,
        wagonTrain: {
          ...s.wagonTrain,
          companions: s.wagonTrain.companions.map((c) =>
            c.id === npcWagonId ? { ...c, crisisAskedDay: s.day } : c
          )
        }
      };
    }
    return { state: s, pendingEvent: trainResult.pendingEvent };
  }

  // #1284 T4 — Ox-slaughter starvation prompt (player-side).
  // Level-trigger: fires while food=0 AND a slaughterable spare ox exists
  // AND we haven't asked this spell yet. Once per zero-food spell; the
  // _oxSlaughterAskedDay flag is cleared in engine-pausable.ts (morning
  // steps) when food recovers (same pattern as NPC crisisAskedDay).
  // Only fires if the party is still alive (wiped state skips it).
  //
  // PLACEMENT: checked AFTER POST_EVENT_TAIL_STEPS and advanceTrain have
  // both run. This matches the NPC-crisis pause invariant exactly, so
  // applyPendingChoice's _tailRanDay guard correctly skips tail + advanceTrain
  // on resume without also skipping the day-advance. Placing it before
  // advanceTrain (the original position) would have meant advanceTrain never
  // ran before the pause — stamping _tailRanDay there would have caused
  // applyPendingChoice to skip advanceTrain on resume too (NPC wagons
  // wouldn't tick that day). Placing it after advanceTrain avoids all of
  // this: both systems ran, _tailRanDay correctly reflects that, and
  // resume skips them as designed.
  if (
    s.outcome === 'in-progress'
    && !hasFoodOnHand(s)
    && canSlaughterOx(s)
    && s.flags._oxSlaughterAskedDay === undefined
    && s.party.some((p) => !p.dead)
  ) {
    // Stamp _oxSlaughterAskedDay so the spell doesn't re-fire while modal is live.
    // Stamp _tailRanDay so applyPendingChoice skips tail + advanceTrain on resume
    // (both already ran above — same invariant as the NPC crisis pause).
    s = {
      ...s,
      flags: {
        ...s.flags,
        _oxSlaughterAskedDay: s.day,
        _tailRanDay: s.day
      }
    };
    return { state: s, pendingEvent: OX_SLAUGHTER_PROMPT_EVENT };
  }

  s = pushMoraleHistory(s);
  return {
    state: {
      ...s,
      day: s.day + 1,
      date: advanceDate(s.date)
    }
  };
}

/** #1046 B — resume a dissent pause. Tail-only continuation (mirrors
 *  applyPendingChoice): the daily systems already ran in the paused
 *  tickDayPausable, so this resolves the choice then ONLY finishes the
 *  day (travel-if-the-company-moves, fire, death, advanceTrain,
 *  day-advance). Never re-runs progressConditions/consumption/etc. */
export function applyCompanyDissent(
  state: GameState,
  choice: DissentChoice,
  rng: Rng
): GameState {
  let s = resolveCompanyDissent(state, choice, rng);
  const clearedFlags = { ...s.flags };
  delete (clearedFlags as Record<string, unknown>)._companyDissentPending;
  s = { ...s, flags: clearedFlags };
  const dc = s.wagonTrain?.companyDecisionBlock?.dissentChoice;
  const travels = !s.wagonTrain || dc === 'override' || dc === 'lobby_ok';
  // #1266 stage3 — PRE_TRAVEL via the spine: lay-by recovery (kept even on
  // override — the team rested while the company argued), #910 train share
  // (self-gates to lay-by blocks), and the Sabbath debit — previously skipped
  // here, so an override on a Sabbath lay-by dodged the morale cost.
  s = runSteps(PRE_TRAVEL_STEPS, s, rng, { traveled: travels, driver: 'player' });
  if (travels) {
    // #1266 stage1b — an override-to-travel day charges the same wear as any
    // travel day: ox fatigue + hydration + wagon wear. The morning's lay-by
    // recovery stays — the team rested while the company argued, then pushed on.
    s = runSteps(TRAVEL_OX_WAGON_STEPS, s, rng, { traveled: true, driver: 'player' });
    s = applyTravel(s, rng);
  }
  s = runSteps(POST_EVENT_TAIL_STEPS, s, rng, { traveled: travels, driver: 'player' });
  // #1279 — applyCompanyDissent drops any pendingEvent from advanceTrain
  // (no crisis modal on dissent days). The unmarked crisisAskedDay means
  // the level-trigger re-fires next tick — the player will see it then.
  const trainResult = advanceTrain(s, travels);
  s = trainResult.state;
  s = pushMoraleHistory(s);
  return { ...s, day: s.day + 1, date: advanceDate(s.date) };
}

// Apply the player's chosen choice, then finish the rest of the day (fire attempt, death reap, advance).
export function applyPendingChoice(
  state: GameState,
  event: GameEvent,
  choiceId: string
): GameState {
  const rng = makeRng(`${state.seed}:${state.day}`);
  let s = resolveEvent(state, event, choiceId, rng);
  // Mark cooldown to prevent the same-day re-roll
  s = { ...s, flags: { ...s.flags, _lastEventDay: s.day } };

  // #1266 stage3 — NPC-crisis double-tail guard.
  // When the pause came from advanceTrain (not from rollEvent / arrival /
  // approach), tickDayPausable already ran POST_EVENT_TAIL_STEPS AND
  // advanceTrain before returning.  If we run them again here we double-
  // apply dehydration, fire, and every NPC wagon's daily tick.
  // Detection: _tailRanDay is stamped with s.day by the crisis pause site.
  const tailAlreadyRan = s.flags._tailRanDay === s.day;
  if (tailAlreadyRan) {
    // Clear the stamp so it doesn't persist into tomorrow.
    const clearedFlags = { ...s.flags };
    delete (clearedFlags as Record<string, unknown>)._tailRanDay;
    s = { ...s, flags: clearedFlags };
  }

  if (!tailAlreadyRan) {
    // Finish the day — normal event path (rollEvent / arrival / approach):
    // tail and advanceTrain haven't run yet.
    // #280b/#288 — advance NPC wagons. Event-day still counts as travel
    // for them. NPC starvation crisis events that arise here are NOT
    // re-surfaced (would chain modals on the same tick); the dropped event
    // leaves crisisAskedDay unset and re-fires on tomorrow's tickDayPausable
    // via the #1279 level-trigger.
    // #300 — NPC axle-grease cycle skips a small slice on event-paused
    // days (we don't thread the miles delta through the early-return).
    // ~3% asymmetry per event vs travel-day; the 500-mi cycle absorbs it.
    s = runSteps(POST_EVENT_TAIL_STEPS, s, rng, { traveled: true, driver: 'player' });
    const trainResult = advanceTrain(s, true);
    s = trainResult.state;
  }

  s = pushMoraleHistory(s);
  return {
    ...s,
    day: s.day + 1,
    date: advanceDate(s.date)
  };
}
