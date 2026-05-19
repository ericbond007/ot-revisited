// #280b — per-wagon engine tick tests. Companion wagons should eat,
// get tired, fall sick, and possibly die over time.

import { describe, it, expect } from 'vitest';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { advanceTrain, joinTrain } from '../src/lib/game/systems/wagon-train';
import { generateTrain } from '../src/lib/game/content/trains';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { rest } from '../src/lib/game/actions/rest';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'npc',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function freshTrain(seed = 'fresh') {
  return generateTrain(seed, 1, 'independence_mo', makeRng(seed), { fresh: true });
}

const FOOD_KEYS = [
  'game_meat', 'berries', 'egg', 'milk',
  'jerky', 'pemmican', 'salt_pork', 'bacon',
  'flour', 'cornmeal', 'beans', 'hardtack',
  'dried_fruit', 'cheese', 'butter'
];

function totalFood(inv: Record<string, number>): number {
  return FOOD_KEYS.reduce((sum, k) => sum + (inv[k] ?? 0), 0);
}

describe('tickNpcWagon — per-wagon attrition', () => {
  it('drains food on a travel day proportional to alive eaters and rations', () => {
    const train = freshTrain();
    const wagon = train.companions[0];
    const before = totalFood(wagon.inventory);
    const { wagon: next } = tickNpcWagon(
      wagon,
      { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
      makeRng('t1')
    );
    const after = totalFood(next.inventory);
    expect(after).toBeLessThan(before);
  });

  it('accumulates ox fatigue on travel days, recovers on rest days', () => {
    const train = freshTrain();
    let wagon = train.companions[0];
    for (let i = 0; i < 5; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
        makeRng('tt' + i)
      ).wagon;
    }
    const traveled = wagon.oxen[0].fatigue;
    expect(traveled).toBeGreaterThan(0);

    for (let i = 0; i < 3; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: 6 + i, traveled: false, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
        makeRng('rr' + i)
      ).wagon;
    }
    expect(wagon.oxen[0].fatigue).toBeLessThan(traveled);
  });

  it('starves the party when food runs out', () => {
    const train = freshTrain();
    let wagon: NpcWagonState = { ...train.companions[0], inventory: {} };
    const startHp = wagon.party[0].health;
    for (let i = 0; i < 5; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
        makeRng('s' + i)
      ).wagon;
    }
    expect(wagon.party[0].health).toBeLessThan(startHp);
  });

  it('reaps dead party members and logs an entry on the wagon eventLog', () => {
    const train = freshTrain();
    // #1046 A+D — preserve the "no food → starve to death → reaped +
    // logged" causality the test asserts. Post-A+D a starving wagon
    // would voluntarily lay by (#937) and the lay-by heal (which has no
    // morale floor by design) would mend the party — that's correct A+D
    // behavior, but it erases this test's death signal. Pin the wagon to
    // a captained-train 'travel' decision so the #937 voluntary-rest gate
    // is bypassed and it keeps moving; keep morale < TRAVEL_HEAL_MIN_MORALE
    // (25) so the travel-day recovery is a no-op. The party then starves
    // in motion exactly as pre-A+D, so reaping still fires.
    let wagon: NpcWagonState = {
      ...train.companions[0],
      inventory: {},
      morale: 10,
      party: train.companions[0].party.map((p, i) => i === 0
        ? { ...p, health: 1 }
        : p)
    };
    for (let i = 0; i < 4; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear', companyRestMode: 'travel' },
        makeRng('d' + i)
      ).wagon;
    }
    const dead = wagon.party.filter((p) => p.dead);
    expect(dead.length).toBeGreaterThan(0);
    expect(wagon.eventLog.some((e) => /died|trail took|too young/i.test(e.text))).toBe(true);
  });

  it('marks outcome=wiped when every party member is dead', () => {
    const train = freshTrain();
    // #1046 A+D — same as above: pin the wagon to a 'travel' company
    // decision (bypasses the #937 voluntary-rest gate, whose lay-by heal
    // has no morale floor) and keep morale < 25 so the travel-day heal
    // is a no-op. The empty-inventory party then starves out and the
    // wagon's outcome flips to 'wiped' (the invariant under test),
    // unobscured by A's in-motion / lay-by recovery.
    let wagon: NpcWagonState = {
      ...train.companions[0],
      inventory: {},
      morale: 10,
      party: train.companions[0].party.map((p) => ({ ...p, health: 1 }))
    };
    for (let i = 0; i < 10; i++) {
      wagon = tickNpcWagon(
        wagon,
        { day: i + 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear', companyRestMode: 'travel' },
        makeRng('w' + i)
      ).wagon;
    }
    expect(wagon.outcome).toBe('wiped');
    const sealed = tickNpcWagon(
      wagon,
      { day: 99, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear', companyRestMode: 'travel' },
      makeRng('post')
    );
    expect(sealed.wagon).toBe(wagon);
    expect(sealed.playerLogs).toEqual([]);
  });

  it('treats conditions when a treatment item is on hand', () => {
    const train = freshTrain();
    let wagon: NpcWagonState = {
      ...train.companions[0],
      inventory: { ...train.companions[0].inventory, quinine: 5 },
      party: [
        {
          ...train.companions[0].party[0],
          conditions: [{ id: 'cholera', daysSinceOnset: 0 }]
        },
        ...train.companions[0].party.slice(1)
      ]
    };
    const beforeQuinine = wagon.inventory.quinine ?? 0;
    wagon = tickNpcWagon(
      wagon,
      { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
      makeRng('treat')
    ).wagon;
    expect((wagon.inventory.quinine ?? 0)).toBe(beforeQuinine - 1);
  });
});

describe('advanceTrain — engine integration', () => {
  it('is a no-op when player is not in a train', () => {
    const s = game();
    const after = advanceTrain(s, true);
    expect(after.state).toBe(s);
    expect(after.pendingEvent).toBeUndefined();
  });

  it('ticks every companion when in a train', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    const before = totalFood(s.wagonTrain!.companions[0].inventory);
    s = advanceTrain(s, true).state;
    const after = totalFood(s.wagonTrain!.companions[0].inventory);
    expect(after).toBeLessThan(before);
  });

  it('tickDayPausable advances NPCs alongside the player', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    const before = totalFood(s.wagonTrain!.companions[0].inventory);
    const result = tickDayPausable(s);
    if (!result.pendingEvent) {
      const after = totalFood(result.state.wagonTrain!.companions[0].inventory);
      expect(after).toBeLessThan(before);
    }
  });

  it('rest action advances NPCs (food drains even on rest days)', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    const before = totalFood(s.wagonTrain!.companions[0].inventory);
    s = rest(s, 3);
    const after = totalFood(s.wagonTrain!.companions[0].inventory);
    expect(after).toBeLessThan(before);
  });

  it('NPC wagons accumulate divergent state over many days', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    // 12-day rest is short enough to survive water exhaustion (#303e
    // pool dries the train around day 8-10) but long enough for food
    // drain to differentiate per-wagon party sizes. Also filter to
    // surviving wagons — departures (#290) can prune the roster.
    const startById = new Map(
      s.wagonTrain!.companions.map((c) => [c.id, totalFood(c.inventory)])
    );
    s = rest(s, 12);
    const survivors = s.wagonTrain!.companions;
    expect(survivors.length).toBeGreaterThan(0);
    for (const c of survivors) {
      const start = startById.get(c.id);
      expect(start).toBeDefined();
      expect(totalFood(c.inventory)).toBeLessThan(start!);
    }
    const distinct = new Set(survivors.map((c) => totalFood(c.inventory)));
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe('#280c — NPC events bubble to player eventLog', () => {
  it('over a 60-day rest, the train fires events that surface on the player eventLog', () => {
    let s = joinTrain(game(), makeRng('events-1')).state;
    const startLogLen = s.eventLog.length;
    s = rest(s, 60);
    const newEntries = s.eventLog.slice(startLogLen);
    // Filter for entries that look like NPC news (mention a "wagon" or
    // a family-style label "the X family"). Not every rest day fires
    // events but ~60 days × N wagons × 6% should produce several.
    const npcNews = newEntries.filter((e) =>
      /wagon|family|brothers|party/i.test(e.text)
    );
    expect(npcNews.length).toBeGreaterThan(0);
  });

  it('event-driven wagon damage and condition changes persist on the wagon state', () => {
    // #1046 A+D — assert event occurrence, not post-recovery end-state
    // (lay-by now heals). Pre-A+D this snapshotted wagon.condition /
    // party.conditions at day 120 because conditions never self-resolved
    // and a lay-by never healed; both are false post-A+D (D resolves
    // conditions on natural course, A rest-heals the party every lay-by
    // day, and a long demoralizing run can split the train so
    // wagonTrain is null by day 120). The #280c events still FIRE every
    // run — only their HP/condition aftermath is now mended — so we
    // assert the causal signal that survives recovery: a wagon-
    // attributed #280c mechanical / disease event line bubbled to the
    // player eventLog over the run. Driven day-by-day so the cumulative
    // signal is captured even if the company later splits.
    let s = joinTrain(game(), makeRng('events-2')).state;
    const startLogLen = s.eventLog.length;
    const seen: string[] = [];
    for (let d = 0; d < 120; d++) {
      s = rest(s, 1);
      seen.push(...s.eventLog.slice(startLogLen + seen.length).map((e) => e.text));
      if (!s.wagonTrain) break; // company dissolved — #280c signal already accrued above
    }
    // A #280c mechanical / health event, name-suffixed by the NPC tick.
    // Distinct from the sibling test's generic train-chatter filter:
    // this looks for the concrete event aftermath verbs (a wheel
    // shatters, an ox goes lame, the tongue cracks, cholera/snakebite,
    // a storm tears canvas, condition delta prose).
    const npcEvent = seen.some((t) =>
      /wheel|axle|tongue|canvas|went lame|reshod|cholera|snakebit|bitten|wagon condition|fell ill|came down with|storm/i.test(t)
      && /\((the )?[A-Z][\w'-]+ (family|party|brothers)\)/.test(t)
    );
    expect(npcEvent).toBe(true);
  });

  it('#288 — fires a starvation pendingEvent when an NPC wagon just bottomed out today', () => {
    let s = joinTrain(game(), makeRng('j-cris')).state;
    // One companion has 1 lb of food going in; ALL other companions
    // are also empty so they can't contribute and silently resolve
    // the crisis (#288 contribution path).
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { flour: 1 } } : { ...c, inventory: {} as Record<string, number> }
        )
      }
    };
    const result = advanceTrain(s, true);
    expect(result.pendingEvent).toBeDefined();
    expect(result.pendingEvent!.title).toMatch(/out of food/i);
    expect(result.pendingEvent!.choices.some((c) => c.id.startsWith('starvation_share_'))).toBe(true);
    expect(result.pendingEvent!.choices.some((c) => c.id === 'starvation_refuse')).toBe(true);
    // Three share tiers (small / medium / large).
    const shareTiers = result.pendingEvent!.choices.filter((c) => c.id.startsWith('starvation_share_'));
    expect(shareTiers.length).toBe(3);
  });

  it('#288 — other companions chip in to silently resolve crisis when they have surplus', () => {
    let s = joinTrain(game(), makeRng('j-pool')).state;
    // Target wagon has 1 lb; all others have 250 lb flour and high
    // morale → they should pool enough to skip the player ask.
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0
            ? { ...c, inventory: { flour: 1 } as Record<string, number> }
            : { ...c, inventory: { flour: 250, bacon: 50 } as Record<string, number>, morale: 80 }
        )
      }
    };
    const beforeLogLen = s.eventLog.length;
    const result = advanceTrain(s, true);
    // Either resolved silently (no pendingEvent) OR player asked
    // for less. Most-likely silent.
    if (!result.pendingEvent) {
      // Logs should mention contributors.
      const newLogs = result.state.eventLog.slice(beforeLogLen);
      expect(newLogs.some((e) => /chipped in/i.test(e.text))).toBe(true);
    }
  });

  it('#288 — share choice transfers food from player to target wagon', () => {
    let s = joinTrain(game(), makeRng('j-share')).state;
    s = {
      ...s,
      cash: 100,
      inventory: { ...s.inventory, flour: 200, bacon: 50 },
      wagonTrain: {
        ...s.wagonTrain!,
        // Target empty + other wagons empty so contributions don't
        // silently resolve before the player ask.
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { flour: 1 } } : { ...c, inventory: {} as Record<string, number> }
        )
      }
    };
    const result = advanceTrain(s, true);
    expect(result.pendingEvent).toBeDefined();
    const shareChoice = result.pendingEvent!.choices.find((c) => c.id === 'starvation_share_medium');
    expect(shareChoice).toBeDefined();
    const playerFlourBefore = result.state.inventory.flour ?? 0;
    const targetFlourBefore = result.state.wagonTrain!.companions[0].inventory.flour ?? 0;
    const next = shareChoice!.apply(result.state, makeRng('apply'));
    const playerFlourAfter = next.inventory.flour ?? 0;
    const targetFlourAfter = next.wagonTrain!.companions[0].inventory.flour ?? 0;
    expect(playerFlourAfter).toBeLessThan(playerFlourBefore);
    expect(targetFlourAfter).toBeGreaterThan(targetFlourBefore);
  });

  it('#288 — refuse choice docks player morale and target morale, no inventory change', () => {
    let s = joinTrain(game(), makeRng('j-refuse')).state;
    s = {
      ...s,
      morale: 80,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { flour: 1 }, morale: 70 } : { ...c, inventory: {} as Record<string, number> }
        )
      }
    };
    const result = advanceTrain(s, true);
    const refuseChoice = result.pendingEvent!.choices.find((c) => c.id === 'starvation_refuse');
    const playerInvBefore = result.state.inventory;
    const next = refuseChoice!.apply(result.state, makeRng('apply'));
    expect(next.morale).toBeLessThan(result.state.morale);
    expect(next.wagonTrain!.companions[0].morale).toBeLessThan(result.state.wagonTrain!.companions[0].morale);
    expect(next.inventory).toEqual(playerInvBefore);
  });

  it('#288 — NPC auto-cannibalizes when food=0 and a fresh adult corpse exists', () => {
    const train = freshTrain('cann');
    // Find a wagon with at least 2 alive adults so we can kill one.
    const idx = train.companions.findIndex(
      (c) => c.party.filter((m) => !m.dead && m.kind === 'adult').length >= 2
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    const baseWagon = train.companions[idx];
    const adults = baseWagon.party.filter((m) => !m.dead && m.kind === 'adult');
    let wagon: NpcWagonState = {
      ...baseWagon,
      inventory: {},
      party: baseWagon.party.map((m) =>
        m.id === adults[0].id
          ? { ...m, dead: true, health: 0, deathDay: 0, deathCause: 'starvation' }
          : m
      )
    };
    const result = tickNpcWagon(
      wagon,
      { day: 1, traveled: false, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
      makeRng('cann1')
    );
    // Corpse should now be marked consumed, game_meat appears in inventory.
    const consumedCorpse = result.wagon.party.find((m) => m.id === adults[0].id);
    expect(consumedCorpse?.consumed).toBe(true);
    expect(result.wagon.inventory.game_meat ?? 0).toBeGreaterThan(0);
    // Player log surfaces the grim event. #939j unified the log format
    // to "Took X's body for meat — N lb of fresh game. ..." across all
    // surfaces; NPC tick suffixes with the wagon name.
    expect(result.playerLogs.some((t) => /body for meat/i.test(t))).toBe(true);
  });

  it('finished wagons (outcome != in-progress) do not fire further events', () => {
    let s = joinTrain(game(), makeRng('events-3')).state;
    // Wipe one companion manually — set outcome=wiped and party dead.
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0
            ? { ...c, outcome: 'wiped' as const, party: c.party.map((p) => ({ ...p, dead: true, health: 0 })) }
            : c
        )
      }
    };
    const beforeWagon0 = s.wagonTrain!.companions[0];
    s = rest(s, 30);
    const afterWagon0 = s.wagonTrain!.companions[0];
    // Wiped wagon's state is frozen — no inventory change, no
    // condition adds, no event log entries.
    expect(afterWagon0.inventory).toEqual(beforeWagon0.inventory);
    expect(afterWagon0.party.every((p) => p.dead)).toBe(true);
    expect(afterWagon0.outcome).toBe('wiped');
  });
});
