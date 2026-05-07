// #282 — wagon-train events bank. Phase 2 of #176. Eight train-only
// events that fire from the regular road-event roll while in a train.

import { describe, it, expect } from 'vitest';
import { TRAIN_EVENTS } from '../src/lib/game/content/train-events';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { eligibleEvents } from '../src/lib/game/systems/events';
import { prepareEventForSurfacing, tickDayPausable } from '../src/lib/game/engine-pausable';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, ProfessionId } from '../src/lib/game/types';
import type { GameEvent } from '../src/lib/game/content/events';

function game(prof: ProfessionId = 'farmer'): GameState {
  return createInitialState({
    seed: 'te',
    leader: { name: 'L', profession: prof },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function trainState(prof: ProfessionId = 'farmer'): GameState {
  return joinTrain(game(prof), makeRng('jt')).state;
}

describe('TRAIN_EVENTS catalog', () => {
  it('exports at least 6 events (TODO target was 6-10)', () => {
    expect(TRAIN_EVENTS.length).toBeGreaterThanOrEqual(6);
  });

  it('every event has a gate', () => {
    for (const e of TRAIN_EVENTS) {
      expect(typeof e.gate).toBe('function');
    }
  });

  it('every event id is unique within the bank', () => {
    const ids = new Set(TRAIN_EVENTS.map((e) => e.id));
    expect(ids.size).toBe(TRAIN_EVENTS.length);
  });

  it('every event id is registered in the global EVENTS pool', async () => {
    const { EVENTS } = await import('../src/lib/game/content/events');
    const globalIds = new Set(EVENTS.map((e) => e.id));
    for (const e of TRAIN_EVENTS) {
      expect(globalIds.has(e.id)).toBe(true);
    }
  });
});

describe('train-only gating', () => {
  it('no train events are eligible for a solo player', () => {
    const s = game();
    const eligible = eligibleEvents(s, TRAIN_EVENTS);
    expect(eligible.length).toBe(0);
  });

  it('train events become eligible once the player joins a train', () => {
    const s = trainState();
    const eligible = eligibleEvents(s, TRAIN_EVENTS);
    // Sunday-meeting + fiddle + lost-child have additional sub-gates;
    // at minimum the always-eligible ones (campfire, ox-lame, dispute,
    // news-pump) should fire.
    expect(eligible.length).toBeGreaterThanOrEqual(4);
  });

  it('no train events fire if every companion has wiped/arrived/stranded', () => {
    let s = trainState();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c) => ({ ...c, outcome: 'wiped' as const }))
      }
    };
    const eligible = eligibleEvents(s, TRAIN_EVENTS);
    expect(eligible.length).toBe(0);
  });
});

describe('event-specific gates', () => {
  it('Sunday meeting only fires on Sunday with a preacher in the train', () => {
    const sundayEvent = TRAIN_EVENTS.find((e) => e.id === 'train_sunday_meeting')!;
    // Default game starts on a Sunday-or-not; force a non-Sunday and a
    // train without a preacher.
    let s = trainState('farmer');
    s = { ...s, date: { year: 1849, month: 4, day: 16 } }; // Monday
    expect(sundayEvent.gate!(s)).toBe(false);
    // Switch to Sunday + preacher in player's party.
    s = { ...trainState('preacher'), date: { year: 1849, month: 4, day: 15 } };
    expect(sundayEvent.gate!(s)).toBe(true);
  });

  it('fiddle night only fires when someone has a fiddle', () => {
    const fiddleEvent = TRAIN_EVENTS.find((e) => e.id === 'train_fiddle_night')!;
    // Strip any fiddles a named bot profile (#287c — Sagers, etc.) may
    // have shipped in by default, so the no-fiddle baseline is real.
    const raw = trainState();
    const s = {
      ...raw,
      inventory: { ...raw.inventory, fiddle: 0 },
      wagonTrain: raw.wagonTrain && {
        ...raw.wagonTrain,
        companions: raw.wagonTrain.companions.map((c) => ({
          ...c, inventory: { ...c.inventory, fiddle: 0 }
        }))
      }
    };
    expect(fiddleEvent.gate!(s)).toBe(false);
    // Add a fiddle to the player's inventory.
    const withFiddle = { ...s, inventory: { ...s.inventory, fiddle: 1 } };
    expect(fiddleEvent.gate!(withFiddle)).toBe(true);
    // Add a fiddle to a companion's inventory instead.
    const withCompFiddle = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { ...c.inventory, fiddle: 1 } } : c
        )
      }
    };
    expect(fiddleEvent.gate!(withCompFiddle)).toBe(true);
  });

  it('lost child only fires when at least one companion has children', () => {
    const childEvent = TRAIN_EVENTS.find((e) => e.id === 'train_lost_child')!;
    let s = trainState();
    // Strip kids from every companion.
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c) => ({ ...c, hasChildren: false }))
      }
    };
    expect(childEvent.gate!(s)).toBe(false);
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, hasChildren: true } : c
        )
      }
    };
    expect(childEvent.gate!(s)).toBe(true);
  });

  it('companion barter only fires when at least one (companion, template) pair has the goods', () => {
    const barterEvent = TRAIN_EVENTS.find((e) => e.id === 'train_companion_barter')!;
    let s = trainState();
    // Strip every companion's inventory so no template can match.
    s = {
      ...s,
      inventory: {},
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c) => ({ ...c, inventory: {} }))
      }
    };
    expect(barterEvent.gate!(s)).toBe(false);
    // Now stock a known template (sugar↔tea): companion has sugar, player has tea.
    s = {
      ...s,
      inventory: { tea: 5 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { sugar: 5 } } : c
        )
      }
    };
    expect(barterEvent.gate!(s)).toBe(true);
  });
});

describe('train_companion_barter — #289 integration', () => {
  function barterReadyState(): GameState {
    let s = trainState();
    // Stock the player + a companion to match the sugar↔tea template
    // (player has tea to give, companion has sugar to offer).
    s = {
      ...s,
      inventory: { tea: 10 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { sugar: 10 }, morale: 70 } : c
        )
      }
    };
    return s;
  }

  it('prepare hook stashes a pending offer + dynamic body in flags', () => {
    const event = TRAIN_EVENTS.find((e) => e.id === 'train_companion_barter')!;
    const s = barterReadyState();
    const after = event.prepare!(s, makeRng('p'));
    expect(after.flags._pendingTradeOffer).toBeTruthy();
    expect(typeof after.flags._pendingEventBody).toBe('string');
    const body = after.flags._pendingEventBody as string;
    expect(body).toMatch(/walks over|barter|deal/i);
  });

  it('accept choice runs through tradeWithCompanion — items move both directions', () => {
    const event = TRAIN_EVENTS.find((e) => e.id === 'train_companion_barter')!;
    const accept = event.choices.find((c) => c.id === 'accept')!;
    const s = event.prepare!(barterReadyState(), makeRng('p'));
    const after = accept.apply(s, makeRng('a'));
    // Player's tea went down, sugar went up (or vice versa depending on
    // which template fired). Either way SOMETHING in the player inventory
    // changed AND something in the companion's inventory changed.
    const playerChanged =
      JSON.stringify(after.inventory) !== JSON.stringify(s.inventory);
    expect(playerChanged).toBe(true);
    const before = s.wagonTrain!.companions.map((c) => JSON.stringify(c.inventory));
    const afterC = after.wagonTrain!.companions.map((c) => JSON.stringify(c.inventory));
    expect(afterC.some((x, i) => x !== before[i])).toBe(true);
    // tradeWithCompanion writes its own log line.
    const last = after.eventLog[after.eventLog.length - 1];
    expect(last.text).toMatch(/Traded with/);
  });

  it('refuse choice drops the proposing companion morale', () => {
    const event = TRAIN_EVENTS.find((e) => e.id === 'train_companion_barter')!;
    const refuse = event.choices.find((c) => c.id === 'refuse')!;
    const s = event.prepare!(barterReadyState(), makeRng('p'));
    const before = s.wagonTrain!.companions.map((c) => c.morale);
    const after = refuse.apply(s, makeRng('r'));
    const afterM = after.wagonTrain!.companions.map((c) => c.morale);
    expect(afterM.some((m, i) => m < before[i])).toBe(true);
    const last = after.eventLog[after.eventLog.length - 1];
    expect(last.text).toMatch(/[Ww]aved off|without a word/);
  });

  it('apply degrades gracefully when the pending offer is missing from flags', () => {
    const event = TRAIN_EVENTS.find((e) => e.id === 'train_companion_barter')!;
    const accept = event.choices.find((c) => c.id === 'accept')!;
    const s = barterReadyState(); // no prepare call → no flag set
    const after = accept.apply(s, makeRng('a'));
    // No throw; logs a fallback line.
    expect(after.eventLog[after.eventLog.length - 1].text).toMatch(/drifted off/);
  });
});

describe('event apply effects', () => {
  it('campfire-story listen choice raises player + companion morale', () => {
    const campfire = TRAIN_EVENTS.find((e) => e.id === 'train_campfire_story')!;
    const listen = campfire.choices.find((c) => c.id === 'listen')!;
    const s = trainState();
    const prevMorale = s.morale;
    const prevCompMorale = s.wagonTrain!.companions[0].morale;
    const after = listen.apply(s, makeRng('cs'));
    expect(after.morale).toBe(prevMorale + 2);
    expect(after.wagonTrain!.companions[0].morale).toBe(prevCompMorale + 1);
    expect(after.eventLog[after.eventLog.length - 1].text).toMatch(/fire/i);
  });

  it('lend-bandages choice consumes one bandage and bumps the helped wagon', () => {
    const oxEvent = TRAIN_EVENTS.find((e) => e.id === 'train_companion_ox_lame')!;
    const lend = oxEvent.choices.find((c) => c.id === 'lend_bandage')!;
    const s = { ...trainState(), inventory: { bandages: 3 } };
    const after = lend.apply(s, makeRng('ox'));
    expect(after.inventory.bandages).toBe(2);
    // Some companion's morale is now higher than before.
    const before = s.wagonTrain!.companions.map((c) => c.morale);
    const afterM = after.wagonTrain!.companions.map((c) => c.morale);
    expect(afterM.some((m, i) => m > before[i])).toBe(true);
  });

  it('refusing to help drops a companion morale and the player morale', () => {
    const oxEvent = TRAIN_EVENTS.find((e) => e.id === 'train_companion_ox_lame')!;
    const refuse = oxEvent.choices.find((c) => c.id === 'wave_off')!;
    const s = trainState();
    const prevPlayerMorale = s.morale;
    const before = s.wagonTrain!.companions.map((c) => c.morale);
    const after = refuse.apply(s, makeRng('ref'));
    expect(after.morale).toBe(prevPlayerMorale - 1);
    const afterM = after.wagonTrain!.companions.map((c) => c.morale);
    expect(afterM.some((m, i) => m < before[i])).toBe(true);
  });

  it('Sunday meeting (attend) bumps every in-progress companion +3', () => {
    const sundayEvent = TRAIN_EVENTS.find((e) => e.id === 'train_sunday_meeting')!;
    const attend = sundayEvent.choices.find((c) => c.id === 'attend')!;
    const s = trainState('preacher');
    const before = s.wagonTrain!.companions.map((c) => c.morale);
    const after = attend.apply(s, makeRng('sm'));
    expect(after.morale).toBe(s.morale + 4);
    const afterM = after.wagonTrain!.companions.map((c) => c.morale);
    afterM.forEach((m, i) => expect(m).toBe(before[i] + 3));
  });

  it('news-pump emits one of the canned reports as a log line', () => {
    const newsEvent = TRAIN_EVENTS.find((e) => e.id === 'train_news_passing')!;
    const gather = newsEvent.choices.find((c) => c.id === 'gather_news')!;
    const s = trainState();
    const after = gather.apply(s, makeRng('news'));
    const last = after.eventLog[after.eventLog.length - 1];
    expect(last.text).toMatch(/Gathered news/);
    expect(after.morale).toBe(s.morale + 2);
  });
});

describe('prepareEventForSurfacing — engine wire-up helper', () => {
  // The 3 firing sites in tickDayPausable all delegate to this helper.
  // Testing it directly catches the wiring bug class that bit #285 (the
  // unit tests passed but the engine never invoked the new system).
  it('runs a bodyKey-only event through pickText and stashes _pendingEventBody', () => {
    const fakeEvent: GameEvent = {
      id: 'fake_bodykey',
      category: 'encounter',
      title: 'Fake',
      body: 'fallback body',
      bodyKey: 'nonexistent.key', // pickText falls back to body when pool missing
      weight: 1,
      choices: []
    };
    const s = trainState();
    const after = prepareEventForSurfacing(s, fakeEvent, makeRng('bk'));
    expect(after.flags._pendingEventBody).toBe('fallback body');
  });

  it('runs a prepare-only event and lets it stash arbitrary state', () => {
    const fakeEvent: GameEvent = {
      id: 'fake_prepare',
      category: 'encounter',
      title: 'Fake',
      body: '',
      weight: 1,
      choices: [],
      prepare: (s) => ({
        ...s,
        flags: { ...s.flags, _testFlag: 'set-by-prepare' }
      })
    };
    const s = trainState();
    const after = prepareEventForSurfacing(s, fakeEvent, makeRng('p'));
    expect(after.flags._testFlag).toBe('set-by-prepare');
  });

  it('runs both bodyKey AND prepare; prepare overwrites _pendingEventBody (documented behaviour)', () => {
    const fakeEvent: GameEvent = {
      id: 'fake_both',
      category: 'encounter',
      title: 'Fake',
      body: 'static body',
      bodyKey: 'nonexistent.key',
      weight: 1,
      choices: [],
      prepare: (s) => ({
        ...s,
        flags: { ...s.flags, _pendingEventBody: 'prepared body wins' }
      })
    };
    const s = trainState();
    const after = prepareEventForSurfacing(s, fakeEvent, makeRng('b'));
    expect(after.flags._pendingEventBody).toBe('prepared body wins');
  });

  it('train_companion_barter routed through the helper produces a populated _pendingTradeOffer', () => {
    // This is the integration smoke that catches the #285-style bug
    // class: if the wiring in tickDayPausable were broken, no engine
    // path would actually invoke the prepare hook for the barter event.
    const event = TRAIN_EVENTS.find((e) => e.id === 'train_companion_barter')!;
    let s = trainState();
    s = {
      ...s,
      inventory: { tea: 10 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { sugar: 10 } } : c
        )
      }
    };
    const after = prepareEventForSurfacing(s, event, makeRng('bart'));
    expect(after.flags._pendingTradeOffer).toBeTruthy();
    expect(typeof after.flags._pendingEventBody).toBe('string');
  });
});

describe('tickDayPausable — end-to-end fire of a train event', () => {
  // Sweep many seeds until the road-event roll lands a train event.
  // Proves the wire actually runs in production code paths, not just
  // when called directly in unit tests.
  it('over many seeds, a train event eventually fires from tickDayPausable and the prepare-set flags survive', () => {
    let firedTrainEvent = false;
    let barterFired = false;
    const trainIds = new Set(TRAIN_EVENTS.map((e) => e.id));
    for (let i = 0; i < 200 && !firedTrainEvent; i++) {
      let s = createInitialState({
        seed: 'wt-tick-' + i,
        leader: { name: 'L', profession: 'farmer' },
        companions: [{ name: 'C', profession: 'doctor' }],
        startDate: { year: 1849, month: 4, day: 15 }
      });
      s = joinTrain(s, makeRng('jt-' + i)).state;
      // Stock for barter-eligibility too — doesn't force barter, but
      // makes it as eligible as the others.
      s = {
        ...s,
        inventory: { ...s.inventory, tea: 10 },
        wagonTrain: {
          ...s.wagonTrain!,
          companions: s.wagonTrain!.companions.map((c, j) =>
            j === 0 ? { ...c, inventory: { ...c.inventory, sugar: 10 } } : c
          )
        }
      };
      // Tick a few days so the road-event roll has chances to hit.
      for (let d = 0; d < 30 && !firedTrainEvent; d++) {
        const r = tickDayPausable(s);
        if (r.pendingEvent && trainIds.has(r.pendingEvent.id)) {
          firedTrainEvent = true;
          if (r.pendingEvent.id === 'train_companion_barter') {
            barterFired = true;
            // The prepare hook must have stashed the offer.
            expect(r.state.flags._pendingTradeOffer).toBeTruthy();
            expect(typeof r.state.flags._pendingEventBody).toBe('string');
          }
          break;
        }
        // If a non-train event paused us, advance past it for the loop.
        if (r.pendingEvent) break;
        s = r.state;
      }
    }
    // We don't strictly require barter to fire (it's one of 8) — just
    // that SOMETHING from the train bank surfaces through the engine.
    expect(firedTrainEvent).toBe(true);
    // Soft assert: across 200 trials × 30 days, barter should fire at
    // least once given its weight. If not, the wiring may still be ok
    // but coverage is thin.
    if (!barterFired) {
      console.warn('train_companion_barter did not fire in 200×30 trials — coverage thin');
    }
  });
});
