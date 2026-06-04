import { describe, it, expect } from 'vitest';
import { SPOILAGE_EVENTS } from '../src/lib/game/content/spoilage-events';
import { EVENTS, NPC_ELIGIBLE_EVENTS } from '../src/lib/game/content/events';
import { resolveEvent } from '../src/lib/game/systems/events';
import { synthesizeWagonState, projectWagonDeltas, type TrainEnv } from '../src/lib/game/systems/wagon-synth';
import type { NpcWagonState } from '../src/lib/game/types';
import { midTempF } from '../src/lib/game/systems/temperature';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'spoil-events',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 7, day: 1 }
  });
  return { ...s, ...over };
}
const ev = (id: string) => SPOILAGE_EVENTS.find((e) => e.id === id)!;
const choice = (id: string, cid: string) => ev(id).choices.find((c) => c.id === cid)!;
const rng = makeRng('t');
const hot = (over: Partial<GameState> = {}) => game({ date: { year: 1848, month: 7, day: 1 }, weather: 'heat', ...over });

function fakeWagon(over: Partial<NpcWagonState> & { id: string }): NpcWagonState {
  return {
    name: `the ${over.id} family`, leaderProfession: 'farmer',
    hasChildren: false, seed: over.id,
    party: [{ id: `${over.id}-p`, name: 'X', kind: 'adult', sex: 'male', age: 30, profession: 'farmer', isLeader: true, health: 100, dead: false, conditions: [] }],
    inventory: {}, oxen: [{ id: `${over.id}-o`, health: 100, fatigue: 0, shod: true }],
    morale: 70, cash: 100,
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 1500, hasBranBarrel: false, impairment: null },
    eventLog: [], rations: 'filling', water: 40, waterCap: 80, dirtyWater: 0,
    spoilDays: {}, dryDays: 0, greaseMiles: 0, starvationDays: 0,
    outcome: 'in-progress', ...over
  } as NpcWagonState;
}

describe('registration + NPC parity', () => {
  it('all spoilage events are registered, NPC-eligible, and have a default', () => {
    for (const e of SPOILAGE_EVENTS) {
      expect(EVENTS.find((x) => x.id === e.id)).toBeTruthy();
      expect(NPC_ELIGIBLE_EVENTS.find((x) => x.id === e.id)).toBeTruthy();
      expect(e.npcSkip).not.toBe(true);
      expect(e.choices.some((c) => c.isDefault)).toBe(true);
    }
  });

  it('damp meal spoils a companion wagon\'s flour through the synth/project path', () => {
    const base = game();
    const env: TrainEnv = { day: 1, date: { year: 1848, month: 7, day: 1 }, location: base.location, weather: 'rain', pace: 'moderate' };
    const wagon = fakeWagon({ id: 'a', inventory: { flour: 100 } });
    const synth = synthesizeWagonState(wagon, env);
    expect(ev('spoil_damp_meal').gate!(synth)).toBe(true);
    const ticked = resolveEvent(synth, ev('spoil_damp_meal'), 'press_on', rng);
    const projected = projectWagonDeltas(ticked, wagon);
    expect(projected.inventory.flour!).toBeLessThan(100);
  });

  it('weevils dent a companion wagon\'s morale (eat-them default)', () => {
    const base = game();
    const env: TrainEnv = { day: 1, date: { year: 1848, month: 7, day: 1 }, location: base.location, weather: 'heat', pace: 'moderate' };
    const wagon = fakeWagon({ id: 'b', morale: 80, inventory: { hardtack: 80 } });
    const synth = synthesizeWagonState(wagon, env);
    expect(ev('spoil_weevils').gate!(synth)).toBe(true);
    const ticked = resolveEvent(synth, ev('spoil_weevils'), 'eat_them', rng);
    const projected = projectWagonDeltas(ticked, wagon);
    expect(projected.morale).toBeLessThan(80);
  });
});

describe('damp meal (moisture → staples)', () => {
  it('gates on wet weather + meal on hand', () => {
    expect(ev('spoil_damp_meal').gate!(game({ weather: 'rain', inventory: { flour: 50 } }))).toBe(true);
    expect(ev('spoil_damp_meal').gate!(game({ weather: 'clear', inventory: { flour: 50 } }))).toBe(false);
    expect(ev('spoil_damp_meal').gate!(game({ weather: 'rain', inventory: { flour: 2 } }))).toBe(false);
  });
  it('press-on loses more meal than drying it', () => {
    const s = game({ weather: 'rain', inventory: { flour: 100 } });
    const dried = choice('spoil_damp_meal', 'dry_it').apply(s, rng);
    const pressed = choice('spoil_damp_meal', 'press_on').apply(s, rng);
    expect(dried.inventory.flour!).toBeGreaterThan(pressed.inventory.flour!);
    expect(pressed.inventory.flour!).toBeLessThan(100);
  });
});

describe('weevils (pests → warm stores)', () => {
  it('gates on warm temp + dry stores', () => {
    expect(ev('spoil_weevils').gate!(hot({ inventory: { hardtack: 40 } }))).toBe(true);
    expect(ev('spoil_weevils').gate!(game({ weather: 'frost', date: { year: 1848, month: 12, day: 1 }, inventory: { hardtack: 40 } }))).toBe(false);
  });
  it('eating them costs more morale; sifting costs more food', () => {
    const s = hot({ inventory: { hardtack: 100, flour: 40 }, morale: 80 });
    const sifted = choice('spoil_weevils', 'sift').apply(s, rng);
    const eaten = choice('spoil_weevils', 'eat_them').apply(s, rng);
    expect(eaten.morale).toBeLessThan(sifted.morale);
    expect(sifted.inventory.hardtack!).toBeLessThan(eaten.inventory.hardtack!);
  });
});

describe('blowflies (pests → fresh meat)', () => {
  it('salt saves more meat than going without', () => {
    const withSalt = choice('spoil_flies_meat', 'salt_it').apply(hot({ inventory: { game_meat: 40, salt: 5 } }), rng);
    const noSalt = choice('spoil_flies_meat', 'salt_it').apply(hot({ inventory: { game_meat: 40 } }), rng);
    expect(withSalt.inventory.game_meat!).toBeGreaterThan(noSalt.inventory.game_meat!);
  });
});

describe('scorched bacon (acute heat)', () => {
  it('gates only on real heat; bran barrel halves the loss', () => {
    expect(midTempF(hot())).toBeGreaterThanOrEqual(88);
    const base = game({ inventory: { bacon: 100 }, wagon: { ...game().wagon, hasBranBarrel: false } });
    const withBarrel = game({ inventory: { bacon: 100 }, wagon: { ...game().wagon, hasBranBarrel: true } });
    const lossNo = 100 - choice('spoil_scorched_bacon', 'press_on').apply(base, rng).inventory.bacon!;
    const lossYes = 100 - choice('spoil_scorched_bacon', 'press_on').apply(withBarrel, rng).inventory.bacon!;
    expect(lossNo).toBeGreaterThan(0);
    expect(lossYes).toBeLessThan(lossNo);
  });
});

describe('hard freeze (positive)', () => {
  it('extends the game-meat spoil clock', () => {
    const s = game({ weather: 'snow', inventory: { game_meat: 30 }, flags: { _gameMeatSpoilDay: 20 } });
    expect(ev('preserve_hard_freeze').gate!(s)).toBe(true);
    const after = choice('preserve_hard_freeze', 'good').apply(s, rng);
    expect(after.flags._gameMeatSpoilDay).toBe(24);
    expect(after.inventory.game_meat).toBe(30);
  });
});
