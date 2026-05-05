// #316 — raid_natives camp action + revenge ambush event. Verifies
// gates (rifle/ammo/year/tribe-nearby), 30/70 outcome distribution,
// loot tables, attitude crash to hostile, revenge-flag scheduling,
// and the ambush event's three resolution paths.

import { describe, it, expect } from 'vitest';
import {
  CAMP_ACTIONS,
  CAMP_ACTIONS_BY_ID,
  getCampAction
} from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import { getTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import { EVENTS } from '../src/lib/game/content/events';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'raid',
    leader: { name: 'L', profession: 'farmer' },
    companions: [
      { name: 'C1', profession: 'hunter' },
      { name: 'C2', profession: 'doctor' }
    ],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

/** Mile 500 lands inside Sioux country (region 250-650, baseline
 *  attitude 45 = neutral). Drop attitude to 30 (wary) so the raid
 *  gate opens. Stock the wagon with rifle + ammo. */
function raidReady(over: Partial<GameState> = {}): GameState {
  const s = game();
  return {
    ...s,
    inventory: {
      ...s.inventory,
      rifle: 1,
      gunpowder: 20,
      lead_balls: 20,
      percussion_caps: 20
    },
    location: {
      ...s.location,
      milesTraveled: 500,
      terrain: 'prairie'
    },
    flags: { ...s.flags, _tribeAttitudes: { sioux: 30 } },
    ...over
  };
}

describe('#316 — raid_natives registration', () => {
  it('appears in CAMP_ACTIONS_BY_ID', () => {
    expect(CAMP_ACTIONS_BY_ID.raid_natives).toBeDefined();
  });

  it('appears in iterable CAMP_ACTIONS list', () => {
    expect(CAMP_ACTIONS.some((a) => a.id === 'raid_natives')).toBe(true);
  });

  it('getCampAction resolves it', () => {
    const a = getCampAction('raid_natives');
    expect(a.id).toBe('raid_natives');
    expect(a.hourCost).toBe(6);
  });
});

describe('#316 — raid_natives availability gates', () => {
  it('available with rifle + ammo + wary tribe + 1849', () => {
    const a = getCampAction('raid_natives');
    expect(a.availability(raidReady()).available).toBe(true);
  });

  it('gates out pre-1845', () => {
    const a = getCampAction('raid_natives');
    const s = raidReady({ date: { year: 1844, month: 6, day: 15 } });
    const result = a.availability(s);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/1845/i);
  });

  it('gates out without rifle', () => {
    const a = getCampAction('raid_natives');
    const s = raidReady();
    const result = a.availability({ ...s, inventory: { ...s.inventory, rifle: 0 } });
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/rifle/i);
  });

  it('gates out without ammo', () => {
    const a = getCampAction('raid_natives');
    const s = raidReady();
    const result = a.availability({ ...s, inventory: { ...s.inventory, gunpowder: 0 } });
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/gunpowder/i);
  });

  it('gates out outside tribal regions', () => {
    const a = getCampAction('raid_natives');
    const s = raidReady({ location: { ...raidReady().location, milesTraveled: 50 } });
    const result = a.availability(s);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/no tribal/i);
  });

  it('gates out when only friendly tribes nearby', () => {
    const a = getCampAction('raid_natives');
    const s = raidReady({ flags: { _tribeAttitudes: { sioux: 75 } } });
    const result = a.availability(s);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/friendly/i);
  });
});

describe('#316 — raid_natives outcome distribution', () => {
  it('roughly 30% success rate over many trials', () => {
    const a = getCampAction('raid_natives');
    let successes = 0;
    for (let i = 0; i < 200; i++) {
      const s = raidReady();
      const next = a.apply(s, makeRng(`r${i}`));
      // Success path doesn't set _raidRevengeDay; failure does.
      if (typeof next.flags._raidRevengeDay === 'undefined') successes++;
    }
    // Expect ~60 (30% of 200). Wide tolerance: 35-100.
    expect(successes).toBeGreaterThan(35);
    expect(successes).toBeLessThan(100);
  });

  it('success awards plains-tribe loot for sioux', () => {
    const a = getCampAction('raid_natives');
    let foundLoot = false;
    for (let i = 0; i < 100; i++) {
      const s = raidReady();
      const before = s.inventory;
      const next = a.apply(s, makeRng(`s${i}`));
      // Success path: pemmican / buffalo_robe / raw_hide grew.
      if (typeof next.flags._raidRevengeDay === 'undefined') {
        const robeGain = (next.inventory.buffalo_robe ?? 0) - (before.buffalo_robe ?? 0);
        const pemGain = (next.inventory.pemmican ?? 0) - (before.pemmican ?? 0);
        const hideGain = (next.inventory.raw_hide ?? 0) - (before.raw_hide ?? 0);
        if (robeGain > 0 || pemGain > 0 || hideGain > 0) {
          foundLoot = true;
          break;
        }
      }
    }
    expect(foundLoot).toBe(true);
  });

  it('failure path docks party HP', () => {
    const a = getCampAction('raid_natives');
    let foundHpLoss = false;
    for (let i = 0; i < 100; i++) {
      const s = raidReady();
      const before = s.party.reduce((sum, m) => sum + m.health, 0);
      const next = a.apply(s, makeRng(`f${i}`));
      // Failure path: _raidRevengeDay is set.
      if (typeof next.flags._raidRevengeDay === 'number') {
        const after = next.party.reduce((sum, m) => sum + m.health, 0);
        if (after < before) {
          foundHpLoss = true;
          break;
        }
      }
    }
    expect(foundHpLoss).toBe(true);
  });

  it('failure path crashes all nearby tribes to hostile (≤20)', () => {
    const a = getCampAction('raid_natives');
    let next = raidReady();
    for (let i = 0; i < 50; i++) {
      const trial = a.apply(next, makeRng(`h${i}`));
      if (typeof trial.flags._raidRevengeDay === 'number') {
        // Any nearby tribe must be ≤20 (hostile threshold).
        expect(getTribeAttitude(trial, 'sioux')).toBeLessThanOrEqual(20);
        return;
      }
    }
    throw new Error('Failure path never fired in 50 trials');
  });

  it('failure path schedules revenge 5-15 days out', () => {
    const a = getCampAction('raid_natives');
    let foundRevenge = false;
    for (let i = 0; i < 50; i++) {
      const s = raidReady();
      const next = a.apply(s, makeRng(`v${i}`));
      const revenge = next.flags._raidRevengeDay as number | undefined;
      if (typeof revenge === 'number') {
        expect(revenge - s.day).toBeGreaterThanOrEqual(5);
        expect(revenge - s.day).toBeLessThanOrEqual(15);
        foundRevenge = true;
        break;
      }
    }
    expect(foundRevenge).toBe(true);
  });

  it('burns 5 ammo regardless of outcome', () => {
    const a = getCampAction('raid_natives');
    const s = raidReady();
    const next = a.apply(s, makeRng('any'));
    expect(next.inventory.gunpowder).toBe((s.inventory.gunpowder ?? 0) - 5);
    expect(next.inventory.lead_balls).toBe((s.inventory.lead_balls ?? 0) - 5);
    expect(next.inventory.percussion_caps).toBe((s.inventory.percussion_caps ?? 0) - 5);
  });
});

describe('#316 — Persona.shouldRaid', () => {
  it('cautious / balanced / aggressive all refuse', async () => {
    const { cautiousPersona, balancedPersona, aggressivePersona } = await import('../src/lib/game/ai');
    const s = raidReady();
    expect(cautiousPersona.shouldRaid(s, makeRng('p'))).toBe(false);
    expect(balancedPersona.shouldRaid(s, makeRng('p'))).toBe(false);
    expect(aggressivePersona.shouldRaid(s, makeRng('p'))).toBe(false);
  });

  it('chaos rolls roughly 5% over many trials', async () => {
    const { chaosPersona } = await import('../src/lib/game/ai');
    const s = raidReady();
    let yes = 0;
    for (let i = 0; i < 1000; i++) {
      if (chaosPersona.shouldRaid(s, makeRng(`c${i}`))) yes++;
    }
    // ~50 expected; tolerate 10-120.
    expect(yes).toBeGreaterThan(10);
    expect(yes).toBeLessThan(120);
  });
});

describe('#316 — revenge ambush event', () => {
  function ambushEvent() {
    const e = EVENTS.find((ev) => ev.id === 'encounter_raid_revenge');
    if (!e) throw new Error('encounter_raid_revenge missing from EVENTS');
    return e;
  }

  it('is registered in EVENTS', () => {
    expect(ambushEvent().id).toBe('encounter_raid_revenge');
  });

  it('gate is closed without _raidRevengeDay flag', () => {
    const e = ambushEvent();
    expect(e.gate?.(raidReady())).toBe(false);
  });

  it('gate is closed before the scheduled day', () => {
    const e = ambushEvent();
    const s = { ...raidReady(), day: 5, flags: { ...raidReady().flags, _raidRevengeDay: 12 } };
    expect(e.gate?.(s)).toBe(false);
  });

  it('gate opens on or after the scheduled day inside tribal range', () => {
    const e = ambushEvent();
    const s = { ...raidReady(), day: 12, flags: { ...raidReady().flags, _raidRevengeDay: 12 } };
    expect(e.gate?.(s)).toBe(true);
  });

  it('gate closes once past tribal regions (mile > 2050)', () => {
    const e = ambushEvent();
    const base = raidReady();
    const s = {
      ...base,
      day: 12,
      flags: { ...base.flags, _raidRevengeDay: 12 },
      location: { ...base.location, milesTraveled: 2100 }
    };
    expect(e.gate?.(s)).toBe(false);
  });

  it('fight choice clears the revenge flags', () => {
    const e = ambushEvent();
    const s = {
      ...raidReady(),
      day: 12,
      flags: { ...raidReady().flags, _recentRaidDay: 5, _raidRevengeDay: 12 }
    };
    const fight = e.choices.find((c) => c.id === 'fight');
    if (!fight) throw new Error('fight choice missing');
    const next = fight.apply(s, makeRng('fight'));
    expect(next.flags._raidRevengeDay).toBeUndefined();
    expect(next.flags._recentRaidDay).toBeUndefined();
  });

  it('fight with ammo spends 10 of each ammo type', () => {
    const e = ambushEvent();
    const base = raidReady();
    const s = {
      ...base,
      day: 12,
      flags: { ...base.flags, _raidRevengeDay: 12 }
    };
    const fight = e.choices.find((c) => c.id === 'fight');
    if (!fight) throw new Error('fight choice missing');
    const next = fight.apply(s, makeRng('ammo'));
    expect(next.inventory.gunpowder).toBe((s.inventory.gunpowder ?? 0) - 10);
    expect(next.inventory.lead_balls).toBe((s.inventory.lead_balls ?? 0) - 10);
    expect(next.inventory.percussion_caps).toBe((s.inventory.percussion_caps ?? 0) - 10);
  });

  it('flee damages wagon and may kill an ox', () => {
    const e = ambushEvent();
    const base = raidReady();
    const s = {
      ...base,
      day: 12,
      flags: { ...base.flags, _raidRevengeDay: 12 }
    };
    const flee = e.choices.find((c) => c.id === 'flee');
    if (!flee) throw new Error('flee choice missing');
    const next = flee.apply(s, makeRng('flee'));
    expect(next.wagon.condition).toBeLessThan(s.wagon.condition);
    expect(next.flags._raidRevengeDay).toBeUndefined();
  });

  it('parley pays 50 lb food + 5 trade and lifts attitude when tribute is sufficient', () => {
    const e = ambushEvent();
    const base = raidReady();
    const s = {
      ...base,
      day: 12,
      flags: { ...base.flags, _raidRevengeDay: 12 },
      inventory: {
        ...base.inventory,
        flour: 100,
        tobacco: 10
      }
    };
    const parley = e.choices.find((c) => c.id === 'parley');
    if (!parley) throw new Error('parley choice missing');
    const before = getTribeAttitude(s, 'sioux');
    const next = parley.apply(s, makeRng('parley'));
    expect(next.inventory.flour).toBe(50);
    expect(next.inventory.tobacco).toBe(5);
    expect(getTribeAttitude(next, 'sioux')).toBe(before + 5);
    expect(next.flags._raidRevengeDay).toBeUndefined();
  });
});
