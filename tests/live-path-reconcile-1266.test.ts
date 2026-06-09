import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import type { GameState } from '../src/lib/game/types';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'reconcile', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'A', profession: 'doctor' }],
    startDate: { year: 1849, month: 5, day: 1 }
  });
  return { ...s, ...over };
}

describe('#1266 stage1a — morale sparkline updates on the live path', () => {
  it('moraleHistory grows across tickDayPausable days', () => {
    let s = game();
    let completed = 0;
    for (let d = 0; d < 3; d++) {
      const r = tickDayPausable(s);
      s = r.state;
      if (r.pendingEvent) break;       // stop counting at the first pause
      completed++;
    }
    expect(completed).toBeGreaterThan(0);
    expect(Array.isArray(s.moraleHistory)).toBe(true);
    expect((s.moraleHistory ?? []).length).toBe(completed); // one push per completed day
  });
});

describe('#1266 stage1a — water-ration strain applies on the live path', () => {
  it('a drycamp run ends with strictly lower morale than a normal-ration run', () => {
    function run(tier: 'normal' | 'drycamp'): number {
      let s = game({ waterRation: tier, morale: 90 });
      s = { ...s, resources: { ...s.resources, water: 20, waterCap: 20 } };
      for (let d = 0; d < 4; d++) {
        const r = tickDayPausable(s);
        s = r.state;
        if (r.pendingEvent) break;
        // hold the tier + keep the keg full so the strain (which needs water>0) fires
        s = { ...s, waterRation: tier, resources: { ...s.resources, water: 20 } };
      }
      return s.morale;
    }
    const normalMorale = run('normal');
    const drycampMorale = run('drycamp');
    expect(drycampMorale).toBeLessThan(normalMorale);
  });
});

import { applyPendingChoice } from '../src/lib/game/engine-pausable';
import { EVENTS } from '../src/lib/game/content/events';

describe('#1266 stage1a — applyPendingChoice runs dehydration', () => {
  it('resolving an event on an empty keg advances the dehydration tick', () => {
    // ox_lame: no gate, single default choice (rest_it), no water effect.
    const event = EVENTS.find((e) => e.id === 'ox_lame')!;
    expect(event).toBeDefined();
    const choiceId = 'rest_it';

    let s = game();
    // Force party to full health so HP loss (not death) is the signal.
    s = {
      ...s,
      party: s.party.map((m) => ({ ...m, health: 100 })),
      resources: { ...s.resources, water: 0, dirtyWater: 0 }
    };

    const out = applyPendingChoice(s, event, choiceId);

    // On master applyDehydration never runs in applyPendingChoice, so
    // _dehydrationDays stays unset. With the fix, the empty-keg day
    // registers a dry day.
    expect(out.flags?._dehydrationDays).toBeGreaterThanOrEqual(1);
  });
});
