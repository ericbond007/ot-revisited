import { describe, it, expect } from 'vitest';
import { hunt, type HuntHaul } from '../src/lib/game/actions/hunt';
import { CONDITIONS } from '../src/lib/game/content/conditions';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'grizzly-198',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1849, month: 7, day: 1 }
  });
  return {
    ...s,
    inventory: { ...s.inventory, rifle: 1, gunpowder: 100, lead_balls: 100, percussion_caps: 100 },
    location: { ...s.location, terrain: 'mountains' },
    ...over
  };
}

function readHaul(s: GameState): HuntHaul {
  return s.flags._huntHaul as unknown as HuntHaul;
}

describe('#198 bear_mauling condition', () => {
  it('exists in the condition catalog', () => {
    expect(CONDITIONS.bear_mauling).toBeDefined();
    expect(CONDITIONS.bear_mauling.name).toBe('Bear Mauling');
  });

  it('has bandages + laudanum as treatments', () => {
    expect(CONDITIONS.bear_mauling.treatmentItems).toEqual(['bandages', 'laudanum']);
  });

  it('drains health daily', () => {
    expect(CONDITIONS.bear_mauling.dailyHealthDelta).toBeLessThan(0);
  });
});

describe('#198 grizzly mauling on big-game mountain hunts', () => {
  it('eventually fires across many big-mountain hunts', () => {
    let mauled = 0;
    for (let i = 0; i < 500; i++) {
      const result = hunt({ ...newGame({ seed: `big-mtn-${i}` }) }, {
        target: 'big',
        ammo: 'moderate',
        hunters: 1
      });
      if (readHaul(result).mauled) mauled++;
    }
    // ~5% rate × 500 = ~25 hits expected. Wide band to allow seed variance.
    expect(mauled).toBeGreaterThan(5);
    expect(mauled).toBeLessThan(80);
  });

  it('NEVER fires on big-game prairie hunts', () => {
    for (let i = 0; i < 200; i++) {
      const s = newGame({ seed: `prairie-${i}`, location: { ...newGame().location, terrain: 'prairie' } });
      const result = hunt(s, { target: 'big', ammo: 'moderate', hunters: 1 });
      expect(readHaul(result).mauled ?? false).toBe(false);
    }
  });

  it('NEVER fires on small-game mountain hunts', () => {
    for (let i = 0; i < 200; i++) {
      const result = hunt(newGame({ seed: `small-mtn-${i}` }), { target: 'small', ammo: 'moderate', hunters: 1 });
      expect(readHaul(result).mauled ?? false).toBe(false);
    }
  });

  it('NEVER fires on medium-game mountain hunts', () => {
    for (let i = 0; i < 200; i++) {
      const result = hunt(newGame({ seed: `medium-mtn-${i}` }), { target: 'medium', ammo: 'moderate', hunters: 1 });
      expect(readHaul(result).mauled ?? false).toBe(false);
    }
  });
});

describe('#198 hunter halves the rate', () => {
  it('Hunter party gets fewer maulings than non-Hunter', () => {
    const baseHunter = createInitialState({
      seed: 'hunter',
      leader: { name: 'Tom', profession: 'hunter' },
      companions: [{ name: 'Mary', profession: 'farmer' }],
      startDate: { year: 1849, month: 7, day: 1 }
    });
    let nonHunter = 0;
    let withHunter = 0;
    for (let i = 0; i < 1000; i++) {
      const ammoLoadout = { rifle: 1, gunpowder: 100, lead_balls: 100, percussion_caps: 100 };
      const nh = hunt({
        ...newGame({ seed: `nh-${i}` })
      }, { target: 'big', ammo: 'moderate', hunters: 1 });
      const wh = hunt({
        ...baseHunter,
        seed: `wh-${i}`,
        location: { ...baseHunter.location, terrain: 'mountains' },
        inventory: { ...baseHunter.inventory, ...ammoLoadout }
      }, { target: 'big', ammo: 'moderate', hunters: 1 });
      if (readHaul(nh).mauled) nonHunter++;
      if (readHaul(wh).mauled) withHunter++;
    }
    expect(withHunter).toBeLessThan(nonHunter);
  });
});

describe('#198 maul outcome shape', () => {
  function findMauledRun(): { state: GameState; haul: HuntHaul } | null {
    for (let i = 0; i < 2000; i++) {
      const result = hunt(newGame({ seed: `find-${i}` }), { target: 'big', ammo: 'moderate', hunters: 1 });
      const h = readHaul(result);
      if (h.mauled) return { state: result, haul: h };
    }
    return null;
  }

  it('victim has the bear_mauling condition', () => {
    const found = findMauledRun();
    expect(found).not.toBeNull();
    const victim = found!.state.party.find((m) => m.name === found!.haul.injured);
    expect(victim?.conditions.some((c) => c.id === 'bear_mauling')).toBe(true);
  });

  it('victim takes 25-45 HP damage off the original 100', () => {
    const found = findMauledRun();
    expect(found).not.toBeNull();
    const victim = found!.state.party.find((m) => m.name === found!.haul.injured)!;
    // Could be lower than 100-25 if they also took 10 from the regular injury roll.
    expect(victim.health).toBeLessThanOrEqual(75);
    expect(victim.health).toBeGreaterThanOrEqual(45);
  });

  it('emits a grizzly log line', () => {
    const found = findMauledRun();
    expect(found).not.toBeNull();
    const grizzlyLog = found!.state.eventLog.find((l) => /grizzly/i.test(l.text));
    expect(grizzlyLog).toBeDefined();
  });

  it('haul reports the victim name', () => {
    const found = findMauledRun();
    expect(found!.haul.injured).toBeTruthy();
    expect(found!.haul.mauled).toBe(true);
  });
});

describe('#198 non-mauled hunts behave normally', () => {
  it('haul.mauled is falsy on a clean big-mountain hunt', () => {
    // Find a seed with no maul.
    let clean: GameState | null = null;
    for (let i = 0; i < 50 && !clean; i++) {
      const r = hunt(newGame({ seed: `clean-${i}` }), { target: 'big', ammo: 'moderate', hunters: 1 });
      if (!readHaul(r).mauled) clean = r;
    }
    expect(clean).not.toBeNull();
    expect(readHaul(clean!).mauled ?? false).toBe(false);
  });
});
