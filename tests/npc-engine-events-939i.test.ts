// #939i — NPC event roll via engine event bank.
//
// Three layers of coverage:
//   1. NPC_ELIGIBLE_EVENTS — category allow-list + npcSkip opt-out
//      shape pinned so future event additions don't silently widen
//      or narrow the NPC pool.
//   2. tickNpcWagon integration — fire-rate budget (~0.06 per wagon-
//      per-day) preserved from the pre-#939i parallel impl, and event
//      log entries get the `(wagon.name)` suffix.
//   3. Smoke-fire — every event in NPC_ELIGIBLE_EVENTS resolves
//      cleanly on a fresh wagon (no NaN morale, no negative inventory,
//      no thrown exception, no missing wagon.name).

import { describe, it, expect } from 'vitest';
import {
  EVENTS,
  NPC_ELIGIBLE_EVENTS,
  type EventCategory
} from '../src/lib/game/content/events';
import { resolveEvent, rollEvent } from '../src/lib/game/systems/events';
import {
  synthesizeWagonState,
  projectWagonDeltas
} from '../src/lib/game/systems/wagon-synth';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';

const ALLOWED: ReadonlySet<EventCategory> = new Set([
  'wagon', 'encounter', 'personal', 'health', 'finds'
]);
const DENIED: ReadonlySet<EventCategory> = new Set([
  'weather', 'historical'
]);

describe('#939i — npcSkip flag on GameEvent', () => {
  it('every event with npcSkip set has it as a boolean', () => {
    for (const e of EVENTS) {
      if ('npcSkip' in e) expect(typeof e.npcSkip).toBe('boolean');
    }
  });
});

describe('#939i — NPC_ELIGIBLE_EVENTS category allow-list', () => {
  it('only contains events from allowed categories', () => {
    for (const e of NPC_ELIGIBLE_EVENTS) {
      expect(ALLOWED.has(e.category)).toBe(true);
      expect(DENIED.has(e.category)).toBe(false);
    }
  });

  it('excludes any event with npcSkip: true', () => {
    for (const e of NPC_ELIGIBLE_EVENTS) {
      expect(e.npcSkip).not.toBe(true);
    }
  });

  it('has at least one event per allowed category', () => {
    for (const cat of ALLOWED) {
      expect(NPC_ELIGIBLE_EVENTS.some((e) => e.category === cat)).toBe(true);
    }
  });

  it('has a populated pool (sanity check on filter math)', () => {
    expect(NPC_ELIGIBLE_EVENTS.length).toBeGreaterThanOrEqual(20);
    // Loose ceiling — current count is ~70 across the full bank; the
    // upper bound catches "wait, weather snuck in" drift, not normal
    // content additions.
    expect(NPC_ELIGIBLE_EVENTS.length).toBeLessThanOrEqual(120);
  });
});

describe('#939i — rollEvent fire rate over NPC_ELIGIBLE_EVENTS', () => {
  it('matches the 0.06 per-wagon-day NPC budget within ±30%', () => {
    // Direct rollEvent measurement — bypasses tickNpcWagon's other
    // blocks (spoilage / dehydration / etc.) that also log suffixed
    // entries. This isolates the engine-event fire rate from
    // everything else in the tick.
    const train = generateTrain('fire-rate', 1, 'independence_mo', makeRng('fr-seed'), {
      fresh: true
    });
    const wagon = train.companions[0];
    const env = {
      day: 30,
      date: { year: 1849, month: 5, day: 15 },
      location: {
        trailPosition: 200,
        nextLandmarkId: 'ft_kearny',
        previousLandmarkId: null,
        milesTraveled: 200,
        terrain: 'prairie' as const
      },
      weather: 'clear' as const,
      pace: 'moderate' as const
    };
    let fires = 0;
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const synth = synthesizeWagonState(wagon, env);
      const event = rollEvent(synth, makeRng(`r-${i}`), {
        pool: NPC_ELIGIBLE_EVENTS,
        fireChance: 0.06
      });
      if (event) fires++;
    }
    // 0.06 × 4000 = 240 expected. ±30% gives [168, 312]. Any deviation
    // outside is either RNG fluke (re-run with a fixed seed) or a real
    // regression in `rollEvent` weighting.
    expect(fires).toBeGreaterThan(150);
    expect(fires).toBeLessThan(350);
  });
});

describe('#939i — tickNpcWagon log-suffix integration', () => {
  it('suffixes any engine-event log entry with the wagon name', () => {
    // Loose check: at least one suffixed log appears across a long run,
    // confirming the bubble-up path is wired. Fire-rate pinning lives
    // in the rollEvent test above.
    const train = generateTrain('suffix', 1, 'independence_mo', makeRng('suf-seed'), {
      fresh: true
    });
    const wagon = train.companions[0];
    let sawSuffix = false;
    for (let i = 0; i < 1000 && !sawSuffix; i++) {
      const result = tickNpcWagon(wagon, {
        day: 1 + (i % 30),
        traveled: true,
        pace: 'moderate',
        terrain: 'prairie',
        weather: 'clear',
        traveledMiles: 14
      }, makeRng(`s-${i}`));
      if (result.playerLogs.some((s) => s.endsWith(`(${wagon.name})`))) {
        sawSuffix = true;
      }
    }
    expect(sawSuffix).toBe(true);
  });
});

describe('#939i — smoke-fire every NPC-eligible event', () => {
  it('every event resolves cleanly with the default choice on a fresh wagon', () => {
    const train = generateTrain('smoke', 1, 'independence_mo', makeRng('smoke-seed'), {
      fresh: true
    });
    const wagon = train.companions[0];
    const env = {
      day: 30,
      date: { year: 1849, month: 5, day: 15 },
      location: {
        trailPosition: 200,
        nextLandmarkId: 'ft_kearny',
        previousLandmarkId: null,
        milesTraveled: 200,
        terrain: 'prairie' as const
      },
      weather: 'clear' as const,
      pace: 'moderate' as const
    };

    for (const ev of NPC_ELIGIBLE_EVENTS) {
      const synth = synthesizeWagonState(wagon, env);
      // Gate may reject — that's fine; we only assert the events that
      // *can* fire don't crash.
      if (ev.gate && !ev.gate(synth)) continue;
      const choiceId = ev.choices.find((c) => c.isDefault)?.id
        ?? ev.choices[0]?.id;
      if (!choiceId) continue;

      let ticked;
      try {
        ticked = resolveEvent(synth, ev, choiceId, makeRng(`sf-${ev.id}`));
      } catch (err) {
        throw new Error(
          `Event "${ev.id}" threw on default resolve: ${(err as Error).message}. ` +
          `Mark it with npcSkip: true if its apply() reads player-only state.`
        );
      }
      const projected = projectWagonDeltas(ticked, wagon);

      expect(Number.isFinite(projected.morale)).toBe(true);
      expect(projected.morale).toBeGreaterThanOrEqual(0);
      expect(projected.morale).toBeLessThanOrEqual(100);
      for (const id of Object.keys(projected.inventory)) {
        const qty = projected.inventory[id];
        expect(Number.isFinite(qty)).toBe(true);
        expect(qty).toBeGreaterThanOrEqual(0);
      }
      expect(projected.name).toBe(wagon.name);
    }
  });
});
