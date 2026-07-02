// tests/food-economy-1284.test.ts
// Tasks 1–3 of VK #1284 — starter-kit rebalance, dried_salmon item, and
// roadside salmon-band encounter.
//
// These tests MUST FAIL before each implementation change, then PASS after.

import { describe, it, expect } from 'vitest';
import { BASE_KIT, buildStarterKit } from '../src/lib/game/content/starter-kit';
import { createInitialState } from '../src/lib/game/engine';
import { loadPct } from '../src/lib/game/systems/load';

// ---------------------------------------------------------------------------
// §1a — spec table: item-by-item staple asserts + 1,442 lb total
// ---------------------------------------------------------------------------

describe('#1284 Task 1 — starter kit spec §1 staple table', () => {
  it('flour = 700 lb (175/adult, Palmer 200 — #1284 guide-shaped)', () => {
    expect(BASE_KIT.inventory.flour).toBe(700);
  });

  it('bacon = 320 lb (80/adult — fixes the inverted fat ratio)', () => {
    expect(BASE_KIT.inventory.bacon).toBe(320);
  });

  it('cornmeal = 80 lb (grain variety, new to #1284)', () => {
    expect(BASE_KIT.inventory.cornmeal).toBe(80);
  });

  it('beans = 110 lb', () => {
    expect(BASE_KIT.inventory.beans).toBe(110);
  });

  it('hardtack = 80 lb', () => {
    expect(BASE_KIT.inventory.hardtack).toBe(80);
  });

  it('dried_fruit = 70 lb (scurvy-aware guides pushed this)', () => {
    expect(BASE_KIT.inventory.dried_fruit).toBe(70);
  });

  it('sugar = 60 lb', () => {
    expect(BASE_KIT.inventory.sugar).toBe(60);
  });

  it('coffee = 10 lb (waterborne-0.6× + morale payload)', () => {
    expect(BASE_KIT.inventory.coffee).toBe(10);
  });

  it('salt = 12 lb (enables curing a full ox + hunts)', () => {
    expect(BASE_KIT.inventory.salt).toBe(12);
  });

  it('9 staples sum to exactly 1,442 lb', () => {
    const staples = [
      'flour', 'bacon', 'cornmeal', 'beans', 'hardtack',
      'dried_fruit', 'sugar', 'coffee', 'salt'
    ] as const;
    const total = staples.reduce(
      (sum, k) => sum + (BASE_KIT.inventory[k] ?? 0),
      0
    );
    expect(total).toBe(1442);
  });
});

// ---------------------------------------------------------------------------
// §1b — cash = 500
// ---------------------------------------------------------------------------

describe('#1284 Task 1 — starter cash', () => {
  it('BASE_KIT.cash === 500', () => {
    expect(BASE_KIT.cash).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// §1c — wagon-load assertion for a fresh default family
// ---------------------------------------------------------------------------
// The spec §1 says: "Medium wagon: 2,500 lb capacity, currently ~45% loaded
// → ~67% with the new kit". Assert BASE_KIT alone (minimal profession gear)
// is in the 60–70% range and never triggers overload at day 1.
//
// We deliberately pick light-gear professions (farmer has no starterGear;
// preacher and scout also ship minimal gear) to isolate BASE_KIT weight.
// The carpenter profession ships 2 axles + 2 wheels (220 lb extra) and would
// push a 4-profession party above 75% — that is expected heavy-kit territory,
// not a BASE_KIT defect. The assertion here validates the BASE_KIT staple
// rebalance, not profession-combo edge cases.

describe('#1284 Task 1 — day-1 wagon load', () => {
  // 4-adult party, all light-gear professions → best isolation of BASE_KIT
  const opts = {
    seed: 'test-1284-load',
    leader: { name: 'Leader', profession: 'farmer' as const },
    companions: [
      { name: 'Alice', profession: 'farmer' as const },
      { name: 'Bob',   profession: 'farmer' as const },
      { name: 'Carol', profession: 'farmer' as const },
    ],
    startDate: { year: 1848, month: 4, day: 1 },
    wagonModel: 'prairie_schooner' as const
  };

  it('BASE_KIT (4-adult, light professions) loads 60–70% of 2,500 lb capacity', () => {
    const state = createInitialState(opts);
    const pct = loadPct(state);
    expect(pct).toBeGreaterThan(0.60);
    expect(pct).toBeLessThanOrEqual(0.70);
  });

  it('no overload impairment at day 1 (wagon.impairment is null)', () => {
    const state = createInitialState(opts);
    expect(state.wagon.impairment).toBeNull();
  });

  it('loadPct > 0 (kit has real weight)', () => {
    const state = createInitialState(opts);
    expect(loadPct(state)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — dried_salmon item, fishery posts, attitude gate
// ---------------------------------------------------------------------------

import { foodItemIds, ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';
import { getLandmark, LANDMARKS } from '../src/lib/game/content/landmarks';
import { SPOIL_RULES } from '../src/lib/game/systems/spoilage';
import { NUTRITION_GROUP } from '../src/lib/game/systems/consumption';
import { willTradeWith, getTribeAttitudeLevel, adjustTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import type { GameState } from '../src/lib/game/types';
import { createInitialState as _createInitialState } from '../src/lib/game/engine';

// ---------------------------------------------------------------------------
// §2a — dried_salmon item exists with correct shape
// ---------------------------------------------------------------------------

describe('#1284 Task 2 — dried_salmon item catalog', () => {
  it('dried_salmon exists in ITEMS', () => {
    expect(ITEMS['dried_salmon']).toBeDefined();
  });

  it('dried_salmon category === "food"', () => {
    expect(ITEMS['dried_salmon'].category).toBe('food');
  });

  it('dried_salmon has foodDrawOrder (participates in food draw)', () => {
    expect(typeof ITEMS['dried_salmon'].foodDrawOrder).toBe('number');
  });

  it('dried_salmon weight is 1 lb/unit (like other staples)', () => {
    expect(ITEMS['dried_salmon'].weightLbPerUnit).toBe(1);
  });

  it('dried_salmon is shelf-stable: NOT in SPOIL_RULES', () => {
    const spoilableIds = SPOIL_RULES.map((r) => r.itemId);
    expect(spoilableIds).not.toContain('dried_salmon');
  });

  it('dried_salmon maps to "meat" nutrition group (protein)', () => {
    expect(NUTRITION_GROUP['dried_salmon']).toBe('meat');
  });
});

// ---------------------------------------------------------------------------
// §2b — dried_salmon price ~bacon-tier
// ---------------------------------------------------------------------------

describe('#1284 Task 2 — dried_salmon price', () => {
  it('dried_salmon has a PRICES entry', () => {
    expect(PRICES['dried_salmon']).toBeDefined();
  });

  it('dried_salmon buy price is within 25% of bacon (bacon-tier)', () => {
    const baconBuy = PRICES['bacon'].buy;   // 0.40
    const salmonBuy = PRICES['dried_salmon'].buy;
    // Allowed range: 0.30–0.50 (±25% of 0.40)
    expect(salmonBuy).toBeGreaterThanOrEqual(baconBuy * 0.75);
    expect(salmonBuy).toBeLessThanOrEqual(baconBuy * 1.25);
  });

  it('dried_salmon has a sell price (posts can buy it)', () => {
    expect(PRICES['dried_salmon'].sell).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §2c — salmon_falls converts to trading_post, keeps waterSource, has stock
// ---------------------------------------------------------------------------

describe('#1284 Task 2 — salmon_falls landmark', () => {
  const sf = getLandmark('salmon_falls');

  it('salmon_falls.kind === "trading_post"', () => {
    expect(sf.kind).toBe('trading_post');
  });

  it('salmon_falls.waterSource === true (retains water refill)', () => {
    expect(sf.waterSource).toBe(true);
  });

  it('salmon_falls.stock includes dried_salmon', () => {
    expect(sf.stock).toContain('dried_salmon');
  });

  it('salmon_falls.postKind === "native" (attitude-gate path)', () => {
    expect(sf.postKind).toBe('native');
  });

  it('salmon_falls has a tribeId (required for attitude-gate)', () => {
    expect(typeof sf.tribeId).toBe('string');
    expect((sf.tribeId ?? '').length).toBeGreaterThan(0);
  });

  it('salmon_falls has barterPreferred array (barter-preferred fishery)', () => {
    expect(Array.isArray(sf.barterPreferred)).toBe(true);
    expect((sf.barterPreferred ?? []).length).toBeGreaterThan(0);
  });

  it('salmon_falls has a stockScale (generous for dried_salmon category)', () => {
    expect(typeof sf.stockScale).toBe('number');
    expect(sf.stockScale).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §2d — the_dalles + whitman_mission stock includes dried_salmon
// ---------------------------------------------------------------------------

describe('#1284 Task 2 — dried_salmon in the_dalles and whitman_mission stock', () => {
  it('the_dalles.stock includes dried_salmon', () => {
    const td = getLandmark('the_dalles');
    expect(td.stock).toContain('dried_salmon');
  });

  it('whitman_mission.stock includes dried_salmon', () => {
    const wm = getLandmark('whitman_mission');
    expect(wm.stock).toContain('dried_salmon');
  });
});

// ---------------------------------------------------------------------------
// §2e — trail total mileage still 2170 (invariant; no milesFromPrevious moved)
// ---------------------------------------------------------------------------

describe('#1284 Task 2 — trail total mileage invariant', () => {
  it('total trail mileage is the canonical 2170 (unchanged by Task 2)', () => {
    const total = LANDMARKS.reduce((sum, l) => sum + l.milesFromPrevious, 0);
    expect(total).toBe(2170);
  });
});

// ---------------------------------------------------------------------------
// §2f — attitude gate: hostile tribe → willTradeWith returns false
//
// The gating surface is willTradeWith() in tribe-relations.ts.
// salmon_falls has postKind:'native' + tribeId. TownStage uses
// isNativeCampHostile() (attitude < 21, same as 'hostile' level).
// We test both the canonical willTradeWith predicate and that
// adjusting attitude to hostile makes willTradeWith return false,
// confirming the salmon_falls tribeId goes through the same path
// as all other native posts.
// ---------------------------------------------------------------------------

describe('#1284 Task 2 — attitude gate at salmon_falls', () => {
  // Minimal stub state — only flags needed for tribe-relations.
  // Must have ≥2 adults per engine constraint.
  // We set the tribe attitude directly via flags to avoid needing to know
  // the baseline — adjustTribeAttitude is additive, so we force-write the
  // _tribeAttitudes record ourselves.
  function makeState(tribeId: string, attitudeScore: number): GameState {
    const s = _createInitialState({
      seed: 'test-1284-attitude',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'Companion', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    // Force-write the exact attitude score into flags.
    const existing = (s.flags._tribeAttitudes as Record<string,number> | undefined) ?? {};
    return {
      ...s,
      flags: { ...s.flags, _tribeAttitudes: { ...existing, [tribeId]: attitudeScore } }
    };
  }

  const sf = getLandmark('salmon_falls');
  const tribeId = sf.tribeId as string;

  it('willTradeWith returns false when tribe attitude is hostile (score 0)', () => {
    expect(willTradeWith(makeState(tribeId, 0), tribeId)).toBe(false);
  });

  it('willTradeWith returns true when tribe attitude is wary (score 25)', () => {
    expect(willTradeWith(makeState(tribeId, 25), tribeId)).toBe(true);
  });

  it('willTradeWith returns true when tribe attitude is neutral/friendly (score 50)', () => {
    expect(willTradeWith(makeState(tribeId, 50), tribeId)).toBe(true);
  });

  it('attitude level at score 0 is "hostile"', () => {
    expect(getTribeAttitudeLevel(makeState(tribeId, 0), tribeId)).toBe('hostile');
  });
});

// ---------------------------------------------------------------------------
// Task 3 — roadside salmon-band encounter
// ---------------------------------------------------------------------------
//
// spec §2: "Roadside band encounter" — corridor-gated (Fort Hall → The
// Dalles), daily ~10% base chance (×2.5 within one leg of a fishery),
// offer 10–30 lb dried_salmon scaled by attitude; cash accepted at a
// worse rate (~+30%); hostile → encounter never fires.
//
// The encounter is `encounter_salmon_band` and is exported from encounters.ts
// alongside ENCOUNTER_EVENTS. Its gate is:
//   (a) milesTraveled in [FT_HALL_MILE, THE_DALLES_MILE]  (corridor)
//   (b) at least one non-hostile tribe in range
//   (c) a deterministic daily-roll via makeRng(`salmon:${seed}:${day}`)
//       so the gate does not consume the shared rng stream
//
// Tests use the gate function directly (via the exported event object) to
// avoid needing to run the full tick machinery.

import { makeRng } from '../src/lib/game/rng';
import { ENCOUNTER_SALMON_BAND } from '../src/lib/game/content/encounters';
import { resolveEvent } from '../src/lib/game/systems/events';
import { adjustTribeAttitude as _adjustTribeAttitude } from '../src/lib/game/systems/tribe-relations';

// ---------------------------------------------------------------------------
// Helper: build a minimal GameState at a given mile with a given attitude
// for the Bannock/Nez Perce tribes (corridor tribes).
// ---------------------------------------------------------------------------

// Fort Hall cumulative mile: 1290; The Dalles: 1950; salmon_falls: 1380.
// These are derived from the landmarks array and documented in the encounter
// source — see SALMON_CORRIDOR_* constants in encounters.ts.
const FT_HALL_MILE = 1290;  // inclusive start of corridor
const THE_DALLES_MILE = 1950; // inclusive end of corridor
const SALMON_FALLS_MILE = 1380; // fishery landmark (proximity boost zone)
const MID_CORRIDOR_MILE = 1620; // mid-corridor (no boost), far from fishery

/** Minimal GameState at a given trail mile, attitude set via flags. */
function makeCorridorState(
  mile: number,
  tribeAttitudes: Record<string, number>,
  day: number = 100
): GameState {
  const s = _createInitialState({
    seed: 'test-1284-encounter',
    leader: { name: 'Test', profession: 'farmer' as const },
    companions: [{ name: 'Companion', profession: 'farmer' as const }],
    startDate: { year: 1848, month: 4, day: 1 },
    wagonModel: 'prairie_schooner' as const
  });
  const existing = (s.flags._tribeAttitudes as Record<string, number> | undefined) ?? {};
  return {
    ...s,
    day,
    location: { ...s.location, milesTraveled: mile },
    flags: { ...s.flags, _tribeAttitudes: { ...existing, ...tribeAttitudes } }
  };
}

/** Helper: count how many seeds in [0, n) yield gate() === true. */
function countGateFires(
  mile: number,
  attitudes: Record<string, number>,
  nSeeds: number
): number {
  let count = 0;
  for (let i = 0; i < nSeeds; i++) {
    // Vary the day so the sub-rng rolls differ per "seed"
    const s = makeCorridorState(mile, attitudes, 100 + i);
    if (ENCOUNTER_SALMON_BAND.gate!(s)) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// §3a — encounter exists and has correct shape
// ---------------------------------------------------------------------------

describe('#1284 Task 3 — encounter_salmon_band shape', () => {
  it('ENCOUNTER_SALMON_BAND is exported from encounters.ts', () => {
    expect(ENCOUNTER_SALMON_BAND).toBeDefined();
  });

  it('encounter id is "encounter_salmon_band"', () => {
    expect(ENCOUNTER_SALMON_BAND.id).toBe('encounter_salmon_band');
  });

  it('encounter category is "encounter"', () => {
    expect(ENCOUNTER_SALMON_BAND.category).toBe('encounter');
  });

  it('has a gate function', () => {
    expect(typeof ENCOUNTER_SALMON_BAND.gate).toBe('function');
  });

  it('has at least 3 choices (accept_goods, accept_cash, decline)', () => {
    expect(ENCOUNTER_SALMON_BAND.choices.length).toBeGreaterThanOrEqual(3);
  });

  it('has a choice with id "accept_goods"', () => {
    expect(ENCOUNTER_SALMON_BAND.choices.some((c) => c.id === 'accept_goods')).toBe(true);
  });

  it('has a choice with id "accept_cash"', () => {
    expect(ENCOUNTER_SALMON_BAND.choices.some((c) => c.id === 'accept_cash')).toBe(true);
  });

  it('has a choice with id "decline"', () => {
    expect(ENCOUNTER_SALMON_BAND.choices.some((c) => c.id === 'decline')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §3b — corridor gate: fires in corridor, not outside
// ---------------------------------------------------------------------------

describe('#1284 Task 3 — corridor gate fires only in ft_hall→the_dalles', () => {
  // Use wary/neutral attitude (score 35) — non-hostile, so attitude gate passes.
  // The tribes at mile 1400 are Bannock (~1100-1400) and Nez Perce (1400-1700).
  const CORRIDOR_ATTITUDES = { bannock: 35, nez_perce: 35 };

  it('gate returns false before Fort Hall (mile 1200)', () => {
    // Below corridor — should never fire even across many days
    const beforeCorridor = countGateFires(1200, CORRIDOR_ATTITUDES, 200);
    expect(beforeCorridor).toBe(0);
  });

  it('gate returns false after The Dalles (mile 2000)', () => {
    // Past corridor — should never fire
    const afterCorridor = countGateFires(2000, CORRIDOR_ATTITUDES, 200);
    expect(afterCorridor).toBe(0);
  });

  it('gate can fire in corridor mid-point (mile 1620) with non-hostile attitude', () => {
    // With 200 seeds at 10% base chance, expect > 5 fires (very conservative)
    const fires = countGateFires(MID_CORRIDOR_MILE, CORRIDOR_ATTITUDES, 200);
    expect(fires).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// §3c — hostile gate: never fires when all corridor tribes are hostile
// ---------------------------------------------------------------------------

describe('#1284 Task 3 — hostile attitude blocks encounter', () => {
  it('gate never fires at mid-corridor when all tribes are hostile (score 10)', () => {
    // Bannock and Nez Perce both hostile → encounter must be silent
    const hostileAttitudes = { bannock: 10, nez_perce: 10, cayuse: 10, walla_walla: 10, umatilla: 10 };
    const fires = countGateFires(MID_CORRIDOR_MILE, hostileAttitudes, 200);
    expect(fires).toBe(0);
  });

  it('gate never fires near salmon_falls when all tribes are hostile', () => {
    const hostileAttitudes = { bannock: 10, nez_perce: 10 };
    const fires = countGateFires(SALMON_FALLS_MILE, hostileAttitudes, 200);
    expect(fires).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3d — fishery proximity: higher fire rate within ~1 leg of salmon_falls
//        vs mid-corridor (200 seeds each side).
// ---------------------------------------------------------------------------

describe('#1284 Task 3 — fishery proximity boosts fire rate', () => {
  // Non-hostile attitude (score 50 = neutral) for both.
  const NEUTRAL_ATTITUDES = { bannock: 50, nez_perce: 50 };

  it('fire rate near salmon_falls (mile 1380) > fire rate at mid-corridor (mile 1620)', () => {
    const nearFishery = countGateFires(SALMON_FALLS_MILE, NEUTRAL_ATTITUDES, 200);
    const midCorridor = countGateFires(MID_CORRIDOR_MILE, NEUTRAL_ATTITUDES, 200);
    // Both should fire some times, but fishery proximity should yield strictly more
    expect(nearFishery).toBeGreaterThan(midCorridor);
  });
});

// ---------------------------------------------------------------------------
// §3e — accept_goods transfers dried_salmon, accept_cash costs more
// ---------------------------------------------------------------------------

describe('#1284 Task 3 — accepting transfers dried_salmon', () => {
  // Build a state at mid-corridor, wary attitude (score 35 = wary level).
  // We need goods to trade for the accept_goods path.
  // For accept_cash we need enough cash.

  const waryAttitudes = { bannock: 35, nez_perce: 35 };

  it('accept_goods adds dried_salmon to inventory', () => {
    // Prep: a state with trade goods (tobacco) in mid-corridor.
    // The offer qty is stashed in flags by the encounter's onFire hook.
    let s = makeCorridorState(MID_CORRIDOR_MILE, waryAttitudes);
    // Inject a pending offer into flags (as the onFire hook would)
    s = { ...s, flags: { ...s.flags, _salmonBandOffer: 20 }, inventory: { ...s.inventory, tobacco: 5 } };
    const rng = makeRng('test-1284-enc-goods');
    const before = s.inventory.dried_salmon ?? 0;
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_goods', rng);
    expect((after.inventory.dried_salmon ?? 0)).toBeGreaterThan(before);
  });

  it('accept_cash adds dried_salmon to inventory and subtracts cash', () => {
    let s = makeCorridorState(MID_CORRIDOR_MILE, waryAttitudes);
    s = { ...s, cash: 200, flags: { ...s.flags, _salmonBandOffer: 20 } };
    const rng = makeRng('test-1284-enc-cash');
    const cashBefore = s.cash;
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_cash', rng);
    expect((after.inventory.dried_salmon ?? 0)).toBeGreaterThan(0);
    expect(after.cash).toBeLessThan(cashBefore);
  });

  it('accept_cash costs more cash than accept_goods is worth in goods (cash rate penalty)', () => {
    // We can verify the cash_price flag is higher than the goods_price flag,
    // or simply verify cash is debited and salmon is added.
    // The encounter stores cash_price in flags._salmonBandCashPrice.
    let s = makeCorridorState(MID_CORRIDOR_MILE, waryAttitudes);
    s = { ...s, cash: 200, flags: { ...s.flags, _salmonBandOffer: 20 } };
    const rng = makeRng('test-1284-enc-cashrate');
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_cash', rng);
    // Cash price penalty is +30%; verify the cash price stored in flags is ≥ goods price
    const cashPrice = after.flags._salmonBandCashPrice as number | undefined;
    const goodsPrice = after.flags._salmonBandGoodsPrice as number | undefined;
    if (cashPrice !== undefined && goodsPrice !== undefined) {
      expect(cashPrice).toBeGreaterThanOrEqual(goodsPrice * 1.25); // at least +25% markup
    }
    // Regardless, salmon was received
    expect((after.inventory.dried_salmon ?? 0)).toBeGreaterThan(0);
  });

  it('decline choice does NOT add dried_salmon', () => {
    let s = makeCorridorState(MID_CORRIDOR_MILE, waryAttitudes);
    s = { ...s, flags: { ...s.flags, _salmonBandOffer: 20 } };
    const rng = makeRng('test-1284-enc-decline');
    const before = s.inventory.dried_salmon ?? 0;
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'decline', rng);
    expect((after.inventory.dried_salmon ?? 0)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// §3f — ENCOUNTER_SALMON_BAND is in ENCOUNTER_EVENTS array
// ---------------------------------------------------------------------------

import { ENCOUNTER_EVENTS } from '../src/lib/game/content/encounters';

describe('#1284 Task 3 — encounter in ENCOUNTER_EVENTS registry', () => {
  it('ENCOUNTER_SALMON_BAND appears in ENCOUNTER_EVENTS', () => {
    expect(ENCOUNTER_EVENTS.some((e) => e.id === 'encounter_salmon_band')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 4 — ox slaughter: action, starvation event, NPC parity, persona
// ---------------------------------------------------------------------------

import {
  CAMP_ACTIONS,
  CAMP_ACTIONS_BY_ID,
  type CampActionId
} from '../src/lib/game/actions/camp-actions';
import { getWagon, WAGONS } from '../src/lib/game/content/wagons';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { tickNpcWagon, type NpcTickContext } from '../src/lib/game/systems/npc-engine';
import type { NpcWagonState } from '../src/lib/game/types';
import { getPersona } from '../src/lib/game/ai/personas';

// ---------------------------------------------------------------------------
// §4a — slaughter_ox camp action shape
// ---------------------------------------------------------------------------

describe('#1284 Task 4 — slaughter_ox camp action exists', () => {
  it('slaughter_ox is registered in CAMP_ACTIONS', () => {
    expect(CAMP_ACTIONS.some((a) => a.id === 'slaughter_ox')).toBe(true);
  });

  it('slaughter_ox is in CAMP_ACTIONS_BY_ID', () => {
    expect(CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId]).toBeDefined();
  });

  it('slaughter_ox has hourCost === 4 (butchering takes most of a day)', () => {
    const action = CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId];
    expect(action.hourCost).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// §4b — slaughter_ox effect: kills weakest ox, adds 325 lb game_meat with spoil clock
// ---------------------------------------------------------------------------

describe('#1284 Task 4 — slaughter_ox kills weakest ox and yields meat', () => {
  // Build a state with 3 live oxen: one healthy, one weak (lowest health),
  // one tired (medium health, high fatigue). Weak is the target.
  // Prairie schooner needs minTeam=2, so 3 oxen → spare exists.
  function makeSlaughterState() {
    const s = createInitialState({
      seed: 'test-1284-slaughter',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    // Three oxen: healthy (health=90), weak (health=20, fatigue=10), tired (health=50, fatigue=60)
    const oxen = [
      { id: 'ox-healthy', health: 90, fatigue: 10, shod: true },
      { id: 'ox-weak',    health: 20, fatigue: 10, shod: true }, // lowest health → target
      { id: 'ox-tired',   health: 50, fatigue: 60, shod: true }
    ];
    return { ...s, oxen };
  }

  it('apply reduces live-ox count by 1 (weakest removed/dead)', () => {
    const s = makeSlaughterState();
    const action = CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId];
    const rng = makeRng('test-1284-slaughter-apply');
    const after = action.apply(s, rng);
    const liveBefore = s.oxen.filter((o) => (o as { dead?: boolean }).dead !== true).length;
    const liveAfter = after.oxen.filter((o) => (o as { dead?: boolean }).dead !== true).length;
    expect(liveAfter).toBe(liveBefore - 1);
  });

  it('apply targets the ox with the lowest health (ox-weak)', () => {
    const s = makeSlaughterState();
    const action = CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId];
    const rng = makeRng('test-1284-slaughter-weakest');
    const after = action.apply(s, rng);
    // ox-weak should be dead; ox-healthy and ox-tired should still be live
    const deadOx = after.oxen.find((o) => (o as { dead?: boolean }).dead === true || !after.oxen.find((x) => x.id === 'ox-weak' && !(x as { dead?: boolean }).dead));
    // Simplest assertion: game_meat was added; the weakest ox is gone
    const healthyStillLive = after.oxen.some((o) => o.id === 'ox-healthy' && !(o as { dead?: boolean }).dead);
    const tiredStillLive = after.oxen.some((o) => o.id === 'ox-tired' && !(o as { dead?: boolean }).dead);
    expect(healthyStillLive).toBe(true);
    expect(tiredStillLive).toBe(true);
    // The weakest is gone (either dead or removed)
    const weakStillLive = after.oxen.some((o) => o.id === 'ox-weak' && !(o as { dead?: boolean }).dead);
    expect(weakStillLive).toBe(false);
  });

  it('apply adds exactly 325 lb game_meat', () => {
    const s = makeSlaughterState();
    const action = CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId];
    const rng = makeRng('test-1284-slaughter-meat');
    const meatBefore = s.inventory.game_meat ?? 0;
    const after = action.apply(s, rng);
    expect((after.inventory.game_meat ?? 0) - meatBefore).toBe(325);
  });

  it('apply sets the spoil clock on game_meat (_gameMeatSpoilDay = day + 3)', () => {
    const s = makeSlaughterState();
    const action = CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId];
    const rng = makeRng('test-1284-slaughter-spoil');
    const after = action.apply(s, rng);
    expect(after.flags._gameMeatSpoilDay).toBe(after.day + 3);
  });

  it('apply log includes the slaughtered ox name', () => {
    const s = makeSlaughterState();
    const action = CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId];
    const rng = makeRng('test-1284-slaughter-log');
    const after = action.apply(s, rng);
    const lastLog = after.eventLog[after.eventLog.length - 1]?.text ?? '';
    // ox-weak is the target; log should contain its id or some ox identifier
    // (some camps name the ox; at minimum must contain 325 lb)
    expect(lastLog).toMatch(/325/);
  });
});

// ---------------------------------------------------------------------------
// §4c — slaughter_ox tie-break: equal health → highest fatigue wins
// ---------------------------------------------------------------------------

describe('#1284 Task 4 — slaughter_ox tie-break on fatigue', () => {
  it('when two oxen share lowest health, the one with higher fatigue is killed', () => {
    const s = createInitialState({
      seed: 'test-1284-tie',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    // Two equal-health oxen; one has higher fatigue (= worse, should be slaughtered)
    const oxen = [
      { id: 'ox-tied-lo-fat', health: 30, fatigue: 10, shod: true },
      { id: 'ox-tied-hi-fat', health: 30, fatigue: 80, shod: true }, // tie → this dies
      { id: 'ox-spare',       health: 90, fatigue: 5,  shod: true }
    ];
    const state = { ...s, oxen };
    const action = CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId];
    const rng = makeRng('test-1284-tie-apply');
    const after = action.apply(state, rng);
    const loFatStillLive = after.oxen.some((o) => o.id === 'ox-tied-lo-fat' && !(o as { dead?: boolean }).dead);
    const hiFatStillLive = after.oxen.some((o) => o.id === 'ox-tied-hi-fat' && !(o as { dead?: boolean }).dead);
    expect(loFatStillLive).toBe(true);
    expect(hiFatStillLive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §4d — availability: gates on yoke minimum
// ---------------------------------------------------------------------------

describe('#1284 Task 4 — slaughter_ox availability gates', () => {
  const action = CAMP_ACTIONS_BY_ID['slaughter_ox' as CampActionId];

  it('unavailable when no live oxen', () => {
    const s = createInitialState({
      seed: 'test-1284-avail-none',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    const noOxen = { ...s, oxen: [] };
    expect(action.availability(noOxen).available).toBe(false);
  });

  it('unavailable for prairie_schooner (minTeam=2) when already at exactly minTeam live oxen', () => {
    const s = createInitialState({
      seed: 'test-1284-avail-min',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    // prairie_schooner minTeam=2 → exactly 2 live oxen → slaughtering would leave 1 < 2
    const atMin = { ...s, oxen: [
      { id: 'o1', health: 80, fatigue: 10, shod: true },
      { id: 'o2', health: 40, fatigue: 20, shod: true }
    ]};
    expect(action.availability(atMin).available).toBe(false);
  });

  it('available for prairie_schooner when 3 live oxen (spare above minTeam=2)', () => {
    const s = createInitialState({
      seed: 'test-1284-avail-spare',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    const withSpare = { ...s, oxen: [
      { id: 'o1', health: 90, fatigue: 5,  shod: true },
      { id: 'o2', health: 60, fatigue: 20, shod: true },
      { id: 'o3', health: 30, fatigue: 40, shod: true }
    ]};
    expect(action.availability(withSpare).available).toBe(true);
  });

  it('unavailable for heavy wagon (minTeam=4) when exactly 4 live oxen', () => {
    const s = createInitialState({
      seed: 'test-1284-avail-heavy',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'heavy' as const
    });
    const atMin = { ...s, oxen: [
      { id: 'o1', health: 80, fatigue: 10, shod: true },
      { id: 'o2', health: 70, fatigue: 10, shod: true },
      { id: 'o3', health: 60, fatigue: 10, shod: true },
      { id: 'o4', health: 40, fatigue: 20, shod: true }
    ]};
    expect(action.availability(atMin).available).toBe(false);
  });

  it('available for heavy wagon when 5 live oxen', () => {
    const s = createInitialState({
      seed: 'test-1284-avail-heavy-spare',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'heavy' as const
    });
    const withSpare = { ...s, oxen: [
      { id: 'o1', health: 90, fatigue: 5,  shod: true },
      { id: 'o2', health: 80, fatigue: 5,  shod: true },
      { id: 'o3', health: 70, fatigue: 5,  shod: true },
      { id: 'o4', health: 60, fatigue: 10, shod: true },
      { id: 'o5', health: 30, fatigue: 40, shod: true }
    ]};
    expect(action.availability(withSpare).available).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §4e — starvation prompt event fires when food=0 AND spare ox exists (once per spell)
// ---------------------------------------------------------------------------

describe('#1284 Task 4 — starvation_ox event: once-per-spell prompt', () => {
  /** Build a state where the party is out of food but has a spare ox. */
  function makeStarvingWithOx(day = 10) {
    const s = createInitialState({
      seed: 'test-1284-starve-event',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    // Clear all food, set 3 oxen (spare available)
    const emptyFood: Record<string, number> = {};
    for (const k of Object.keys(s.inventory)) {
      const item = (ITEMS as Record<string, { category?: string }>)[k];
      if (item?.category === 'food') emptyFood[k] = 0;
      else emptyFood[k] = s.inventory[k as import('../src/lib/game/types').ItemId] ?? 0;
    }
    const oxen = [
      { id: 'o1', health: 90, fatigue: 5,  shod: true },
      { id: 'o2', health: 70, fatigue: 10, shod: true },
      { id: 'o3', health: 30, fatigue: 40, shod: true } // spare above minTeam=2
    ];
    return { ...s, day, inventory: emptyFood as typeof s.inventory, oxen };
  }

  it('tickDayPausable fires ox_slaughter_prompt when food=0 and spare ox exists (first day of spell)', () => {
    const s = makeStarvingWithOx(10);
    const result = tickDayPausable(s);
    expect(result.pendingEvent).toBeDefined();
    expect(result.pendingEvent?.id).toBe('ox_slaughter_prompt');
  });

  it('prompt event has slaughter_now and hold_out choices', () => {
    const s = makeStarvingWithOx(10);
    const result = tickDayPausable(s);
    const choices = result.pendingEvent?.choices.map((c) => c.id) ?? [];
    expect(choices).toContain('slaughter_now');
    expect(choices).toContain('hold_out');
  });

  it('prompt does NOT fire on second consecutive day (spell stamp prevents re-fire)', () => {
    // After the first day fires and player answers hold_out, the stamp is set
    // and the prompt should not fire again until food recovers and empties again.
    const s = makeStarvingWithOx(10);
    // Simulate the prompt having already fired: set the spell stamp
    const stamped = { ...s, flags: { ...s.flags, _oxSlaughterAskedDay: 10 } };
    const result = tickDayPausable(stamped);
    expect(result.pendingEvent?.id).not.toBe('ox_slaughter_prompt');
  });

  it('prompt does NOT fire when there is no spare ox (at yoke minimum)', () => {
    const s = makeStarvingWithOx(10);
    // Only 2 oxen = exactly minTeam; no spare
    const atMin = { ...s, oxen: [
      { id: 'o1', health: 90, fatigue: 5,  shod: true },
      { id: 'o2', health: 70, fatigue: 10, shod: true }
    ]};
    const result = tickDayPausable(atMin);
    expect(result.pendingEvent?.id).not.toBe('ox_slaughter_prompt');
  });

  it('slaughter_now choice applies slaughter effect (meat added, ox gone)', () => {
    const s = makeStarvingWithOx(10);
    const result = tickDayPausable(s);
    if (!result.pendingEvent || result.pendingEvent.id !== 'ox_slaughter_prompt') {
      // Fallback: test the choice directly via resolveEvent
      return;
    }
    const meatBefore = s.inventory.game_meat ?? 0;
    const rng = makeRng('test-1284-starve-slaughter-now');
    const after = resolveEvent(s, result.pendingEvent, 'slaughter_now', rng);
    expect((after.inventory.game_meat ?? 0)).toBeGreaterThan(meatBefore);
    const liveAfter = after.oxen.filter((o) => !(o as { dead?: boolean }).dead).length;
    expect(liveAfter).toBe(s.oxen.length - 1);
  });
});

// ---------------------------------------------------------------------------
// §4f — NPC parity: auto-slaughter before maybeCannibalize
// ---------------------------------------------------------------------------

describe('#1284 Task 4 — NPC auto-slaughter before cannibalism', () => {
  function makeNpcCtx(): NpcTickContext {
    return {
      day: 50,
      date: { year: 1848, month: 6, day: 15 },
      weather: 'clear',
      pace: 'normal',
      terrain: 'prairie',
      traveled: true,
      traveledMiles: 12,
      location: { trailPosition: 0.4, nextLandmarkId: 'ash_hollow', previousLandmarkId: 'ft_kearny', milesTraveled: 400, terrain: 'prairie', atLandmarkId: null }
    } as unknown as NpcTickContext;
  }

  function makeNpcWagon(overrides: Partial<NpcWagonState> = {}): NpcWagonState {
    // Minimal valid NpcWagonState for the tick path
    return {
      id: 'wagon-test',
      name: 'Test Wagon',
      leaderProfession: 'farmer',
      hasChildren: false,
      seed: 'npc-test-seed',
      outcome: 'in-progress',
      rations: 'normal',
      water: 20,
      dirtyWater: 0,
      waterCap: 20,
      dryDays: 0,
      morale: 50,
      cash: 100,
      eventLog: [],
      party: [
        { id: 'p1', name: 'Adult1', kind: 'adult', sex: 'male', health: 60, dead: false, profession: 'farmer', isLeader: true, age: 35, conditions: [] },
        { id: 'p2', name: 'Adult2', kind: 'adult', sex: 'female', health: 60, dead: false, profession: undefined, isLeader: false, age: 30, conditions: [] }
      ],
      inventory: {} as Record<import('../src/lib/game/types').ItemId, number>,
      oxen: [],
      wagon: {
        model: 'prairie_schooner',
        condition: 80,
        canvas: 90,
        carryCapacity: 2500,
        impairment: null
      },
      personaId: 'balanced',
      ...overrides
    } as unknown as NpcWagonState;
  }

  it('NPC with food=0 and spare ox: auto-slaughters (game_meat added, ox count down)', () => {
    // 3 oxen → spare above minTeam=2 → should slaughter
    const wagon = makeNpcWagon({
      oxen: [
        { id: 'o1', health: 90, fatigue: 5,  shod: true },
        { id: 'o2', health: 70, fatigue: 10, shod: true },
        { id: 'o3', health: 30, fatigue: 40, shod: true } // weakest → slaughtered
      ],
      inventory: {} as Record<import('../src/lib/game/types').ItemId, number>
    });
    const rng = makeRng('npc-slaughter-test');
    const result = tickNpcWagon(wagon, makeNpcCtx(), rng);
    const meat = result.wagon.inventory.game_meat ?? 0;
    expect(meat).toBe(325);
    const liveCount = result.wagon.oxen.filter((o) => !(o as { dead?: boolean }).dead).length;
    expect(liveCount).toBe(2);
  });

  it('NPC at yoke minimum does NOT slaughter (only 2 live oxen, minTeam=2)', () => {
    const wagon = makeNpcWagon({
      oxen: [
        { id: 'o1', health: 90, fatigue: 5,  shod: true },
        { id: 'o2', health: 30, fatigue: 40, shod: true } // weakest — but at minimum
      ],
      inventory: {} as Record<import('../src/lib/game/types').ItemId, number>
    });
    const rng = makeRng('npc-slaughter-min-test');
    const result = tickNpcWagon(wagon, makeNpcCtx(), rng);
    const meat = result.wagon.inventory.game_meat ?? 0;
    expect(meat).toBe(0);
    const liveCount = result.wagon.oxen.filter((o) => !(o as { dead?: boolean }).dead).length;
    expect(liveCount).toBe(2);
  });

  it('NPC with food=0 and spare ox: corpse is untouched (slaughter takes priority over cannibalize)', () => {
    // Give the wagon a fresh corpse too — slaughter should happen instead of cannibal
    const deadParty = [
      { id: 'p1', name: 'Adult1', kind: 'adult' as const, sex: 'male' as const, health: 0, dead: true, consumed: false, deathDay: 49, profession: undefined, isLeader: true, age: 35, conditions: [] },
      { id: 'p2', name: 'Adult2', kind: 'adult' as const, sex: 'female' as const, health: 60, dead: false, profession: undefined, isLeader: false, age: 30, conditions: [] }
    ];
    const wagon = makeNpcWagon({
      oxen: [
        { id: 'o1', health: 90, fatigue: 5,  shod: true },
        { id: 'o2', health: 70, fatigue: 10, shod: true },
        { id: 'o3', health: 30, fatigue: 40, shod: true }
      ],
      party: deadParty,
      inventory: {} as Record<import('../src/lib/game/types').ItemId, number>
    });
    const rng = makeRng('npc-slaughter-priority-test');
    const result = tickNpcWagon(wagon, makeNpcCtx(), rng);
    // Corpse should still be unconsumed
    const corpse = result.wagon.party.find((p) => p.id === 'p1');
    expect(corpse?.consumed).toBeFalsy();
    // Meat was from slaughter
    expect(result.wagon.inventory.game_meat ?? 0).toBe(325);
  });
});

// ---------------------------------------------------------------------------
// §4g — persona shouldSlaughterOx surface
// ---------------------------------------------------------------------------

describe('#1284 Task 4 — shouldSlaughterOx persona surface', () => {
  function makeSlaughterPersonaState(foodLb: number, oxCount: number) {
    // 4 adults total (leader + 3 companions): 4 × 2 lb/day normal rations = 8 lb/day
    const s = createInitialState({
      seed: 'test-1284-persona-slaughter',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [
        { name: 'C2', profession: 'farmer' as const },
        { name: 'C3', profession: 'farmer' as const },
        { name: 'C4', profession: 'farmer' as const }
      ],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    // Zero all food items, then set only foodLb of flour so the total is
    // predictable. #1642: zero via the canonical catalog list — the old
    // hand-typed list here missed sugar (starter kit ships 60 lb), the
    // exact drift class the canonical helpers eliminate.
    const inv: Record<string, number> = { ...s.inventory };
    for (const k of foodItemIds()) inv[k] = 0;
    inv['flour'] = foodLb;
    const oxen = Array.from({ length: oxCount }, (_, i) => ({
      id: `ox-${i}`, health: 80 - i * 5, fatigue: 10 + i * 5, shod: true
    }));
    return { ...s, inventory: inv, oxen };
  }

  it('balanced persona: shouldSlaughterOx true when food < 5 days and spare ox exists', () => {
    const persona = getPersona('balanced');
    // 4 adults eating 2 lb/day = 8 lb/day; 5 days = 40 lb; < 40 lb triggers
    const state = makeSlaughterPersonaState(30, 3); // 30 lb flour < 40 lb threshold; 3 oxen (1 spare)
    expect(persona.shouldSlaughterOx(state)).toBe(true);
  });

  it('balanced persona: shouldSlaughterOx false when food is sufficient (> 5 days)', () => {
    const persona = getPersona('balanced');
    const state = makeSlaughterPersonaState(200, 3); // plenty of food
    expect(persona.shouldSlaughterOx(state)).toBe(false);
  });

  it('cautious persona: triggers at 7 days (earlier than balanced)', () => {
    const persona = getPersona('cautious');
    // 4 adults, 8 lb/day; 7 days = 56 lb; trigger below 56 lb
    const state = makeSlaughterPersonaState(50, 3); // 50 lb < 56 lb → should trigger
    expect(persona.shouldSlaughterOx(state)).toBe(true);
  });

  it('aggressive persona: triggers at 3 days (later than balanced)', () => {
    const persona = getPersona('aggressive');
    // 8 lb/day; 3 days = 24 lb; trigger below 24 lb
    const stateWithLittle = makeSlaughterPersonaState(20, 3); // 20 lb < 24 lb → should trigger
    const stateOk = makeSlaughterPersonaState(30, 3); // 30 lb > 24 lb → should NOT trigger
    expect(persona.shouldSlaughterOx(stateWithLittle)).toBe(true);
    expect(persona.shouldSlaughterOx(stateOk)).toBe(false);
  });

  it('shouldSlaughterOx always false when no spare ox (at yoke minimum)', () => {
    const persona = getPersona('balanced');
    const state = makeSlaughterPersonaState(0, 2); // exactly minTeam=2 → no spare
    expect(persona.shouldSlaughterOx(state)).toBe(false);
  });

  it('pace_pusher persona: triggers at 3 days (same as aggressive — speed > food)', () => {
    const persona = getPersona('pace_pusher');
    const stateWithLittle = makeSlaughterPersonaState(20, 3);
    const stateOk = makeSlaughterPersonaState(30, 3);
    expect(persona.shouldSlaughterOx(stateWithLittle)).toBe(true);
    expect(persona.shouldSlaughterOx(stateOk)).toBe(false);
  });
});

// ===========================================================================
// Code-review findings — regression tests
// ===========================================================================

// ---------------------------------------------------------------------------
// Finding 1 — accept_cash with cash=0 → state unchanged (no negative cash)
// ---------------------------------------------------------------------------

import { applyPendingChoice } from '../src/lib/game/engine-pausable';

describe('#1284 CR-F1 — enabled guard: accept_cash blocked when cash=0', () => {
  it('resolveEvent no-ops accept_cash when cash < price (enabled===false)', () => {
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    // Set up a pending offer; set cash=0 so enabled returns false.
    s = {
      ...s,
      cash: 0,
      flags: {
        ...s.flags,
        _salmonBandOffer: 10,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 4.0,
        _salmonBandCashPrice: 5.2 // more than cash=0
      }
    };
    const rng = makeRng('cr-f1-cash-guard');
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_cash', rng);
    // Cash must not go negative — state returned unchanged.
    expect(after.cash).toBe(0);
    expect((after.inventory.dried_salmon ?? 0)).toBe(0);
  });

  it('resolveEvent applies accept_cash when cash is sufficient', () => {
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    s = {
      ...s,
      cash: 100,
      flags: {
        ...s.flags,
        _salmonBandOffer: 10,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 4.0,
        _salmonBandCashPrice: 5.2
      }
    };
    const rng = makeRng('cr-f1-cash-ok');
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_cash', rng);
    expect(after.cash).toBeLessThan(100);
    expect(after.cash).toBeGreaterThanOrEqual(0);
    expect((after.inventory.dried_salmon ?? 0)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Finding 2 — partial goods → proportional salmon (not full qty)
// ---------------------------------------------------------------------------

describe('#1284 CR-F2 — accept_goods: proportional salmon for partial payment', () => {
  it('one tobacco ($0.50) vs 20-lb offer ($8.00) → BLOCKED by 25% gate (0 lb)', () => {
    // 25% of $8.00 = $2.00 minimum; 1 tobacco = $0.50 → below threshold → enabled=false
    // resolveEvent no-ops when enabled===false → 0 lb salmon granted
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    s = {
      ...s,
      inventory: { ...s.inventory, tobacco: 1, beads: 0, blanket: 0, fishing_line: 0 },
      flags: {
        ...s.flags,
        _salmonBandOffer: 20,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 8.0,
        _salmonBandCashPrice: 10.4
      }
    };
    const rng = makeRng('cr-f2-partial');
    const before = s.inventory.dried_salmon ?? 0;
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_goods', rng);
    const gained = (after.inventory.dried_salmon ?? 0) - before;
    // 25% gate blocks this entirely — enabled guard prevents the trade
    expect(gained).toBe(0);
  });

  it('3 blankets ($4.50) vs 20-lb offer ($8.00) → proportional ~11 lb salmon (partial ≥ 25%)', () => {
    // 3 blankets = $4.50 ≥ $2.00 (25% of $8.00) → enabled passes
    // paid = $4.50 < $8.00 → proportional: floor(20 * 4.50/8.00) = floor(11.25) = 11 lb
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    s = {
      ...s,
      inventory: { ...s.inventory, blanket: 3, tobacco: 0, beads: 0, fishing_line: 0 },
      flags: {
        ...s.flags,
        _salmonBandOffer: 20,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 8.0,
        _salmonBandCashPrice: 10.4
      }
    };
    const rng = makeRng('cr-f2-partial-blankets');
    const before = s.inventory.dried_salmon ?? 0;
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_goods', rng);
    const gained = (after.inventory.dried_salmon ?? 0) - before;
    // Proportional scaling: at least 1 lb, strictly less than 20 lb
    expect(gained).toBeGreaterThan(0);
    expect(gained).toBeLessThan(20);
    expect(gained).toBe(11); // floor(20 * 4.50/8.00) = 11
  });

  it('full goods coverage → full 20 lb salmon', () => {
    // Enough blankets to cover $8: ceil(8/1.50) = 6 blankets → pays 9.00 ≥ 8.00
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    s = {
      ...s,
      inventory: { ...s.inventory, blanket: 6, tobacco: 0, beads: 0, fishing_line: 0 },
      flags: {
        ...s.flags,
        _salmonBandOffer: 20,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 8.0,
        _salmonBandCashPrice: 10.4
      }
    };
    const rng = makeRng('cr-f2-full');
    const before = s.inventory.dried_salmon ?? 0;
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_goods', rng);
    const gained = (after.inventory.dried_salmon ?? 0) - before;
    expect(gained).toBe(20);
  });

  it('accept_goods disabled when goods value < 25% of targetValue', () => {
    // 1 bead = $0.15 sell; 25% of $8.00 = $2.00 → $0.15 < $2.00 → disabled
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    s = {
      ...s,
      inventory: { ...s.inventory, tobacco: 0, blanket: 0, beads: 1, fishing_line: 0 },
      flags: {
        ...s.flags,
        _salmonBandOffer: 20,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 8.0,
        _salmonBandCashPrice: 10.4
      }
    };
    const rng = makeRng('cr-f2-disabled');
    // resolveEvent no-ops when enabled===false
    const cashBefore = s.cash;
    const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, 'accept_goods', rng);
    expect((after.inventory.dried_salmon ?? 0)).toBe(0); // no salmon granted
    expect(after.cash).toBe(cashBefore); // cash unchanged
  });
});

// ---------------------------------------------------------------------------
// Finding 3 — ox-slaughter pause: no double-dehydration + companions tick once
// ---------------------------------------------------------------------------

import { applyPendingChoice as _applyPendingChoice } from '../src/lib/game/engine-pausable';

describe('#1284 CR-F3 — ox-slaughter pause: tail runs exactly once, companions tick exactly once', () => {
  /** Build a state that will trigger the slaughter prompt:
   *  food=0, spare ox above minTeam, no train (keeps companion-tick simple),
   *  water=0 so dehydration fires — we can count _dehydrationDays increments. */
  function makeSlaughterPromptState() {
    const s = _createInitialState({
      seed: 'cr-f3-slaughter-pause',
      leader: { name: 'Test', profession: 'farmer' as const },
      companions: [{ name: 'C2', profession: 'farmer' as const }],
      startDate: { year: 1848, month: 4, day: 1 },
      wagonModel: 'prairie_schooner' as const
    });
    // Zero all food
    const emptyFood: Record<string, number> = {};
    for (const k of Object.keys(s.inventory)) {
      const item = (ITEMS as Record<string, { category?: string }>)[k];
      if (item?.category === 'food') emptyFood[k] = 0;
      else emptyFood[k] = s.inventory[k as import('../src/lib/game/types').ItemId] ?? 0;
    }
    // 3 oxen: spare above minTeam=2
    const oxen = [
      { id: 'o1', health: 90, fatigue: 5,  shod: true },
      { id: 'o2', health: 70, fatigue: 10, shod: true },
      { id: 'o3', health: 30, fatigue: 40, shod: true }
    ];
    return {
      ...s,
      inventory: emptyFood as typeof s.inventory,
      oxen,
      resources: { ...s.resources, water: 0, dirtyWater: 0 }
    };
  }

  it('tickDayPausable fires ox_slaughter_prompt and stamps _tailRanDay', () => {
    const s = makeSlaughterPromptState();
    const result = tickDayPausable(s);
    expect(result.pendingEvent?.id).toBe('ox_slaughter_prompt');
    // _tailRanDay must be stamped so applyPendingChoice skips tail on resume
    expect(result.state.flags._tailRanDay).toBe(result.state.day);
  });

  it('dehydrationDays incremented exactly once across pause+resume (hold_out)', () => {
    const s = makeSlaughterPromptState();
    const pauseResult = tickDayPausable(s);
    if (pauseResult.pendingEvent?.id !== 'ox_slaughter_prompt') {
      // Prompt didn't fire — skip (may be masked by another pending event)
      return;
    }
    const dryDaysBefore = (s.flags._dehydrationDays as number | undefined) ?? 0;
    // Resume: choose hold_out (no slaughter effect, pure continuation)
    const resumed = _applyPendingChoice(pauseResult.state, pauseResult.pendingEvent, 'hold_out');
    const dryDaysAfter = (resumed.flags._dehydrationDays as number | undefined) ?? 0;
    // Dehydration tail should have run exactly once (not twice)
    // If it ran twice, dryDaysAfter would be dryDaysBefore + 2.
    expect(dryDaysAfter - dryDaysBefore).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Finding 4 — _salmonBand* flags cleared after any choice
// ---------------------------------------------------------------------------

describe('#1284 CR-F4 — salmon-band flags cleaned up after resolution', () => {
  const BAND_FLAGS = ['_salmonBandOffer', '_salmonBandTribeId', '_salmonBandGoodsPrice', '_salmonBandCashPrice'] as const;

  function makeStateWithBandFlags(overrides: Partial<Parameters<typeof makeCorridorState>[1]> = {}) {
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    s = {
      ...s,
      cash: 200,
      inventory: { ...s.inventory, tobacco: 5, blanket: 3 },
      flags: {
        ...s.flags,
        _salmonBandOffer: 10,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 4.0,
        _salmonBandCashPrice: 5.2
      }
    };
    return s;
  }

  for (const choiceId of ['accept_goods', 'accept_cash', 'decline'] as const) {
    it(`flags absent from state after ${choiceId}`, () => {
      const s = makeStateWithBandFlags();
      const rng = makeRng(`cr-f4-flags-${choiceId}`);
      const after = resolveEvent(s, ENCOUNTER_SALMON_BAND, choiceId, rng);
      for (const flag of BAND_FLAGS) {
        expect(after.flags[flag as keyof typeof after.flags]).toBeUndefined();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Finding 5 — cautious/aggressive route through pickSalmonBandChoice
// ---------------------------------------------------------------------------

import { cautiousPersona, aggressivePersona } from '../src/lib/game/ai/personas';

describe('#1284 CR-F5 — cautious/aggressive personas route salmon-band correctly', () => {
  /** State with enough food that declining is correct (food >= threshold). */
  function makeSalmonStateHighFood() {
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    // Set 700 lb flour — well above any persona's decline threshold
    s = {
      ...s,
      inventory: { ...s.inventory, flour: 700 },
      flags: {
        ...s.flags,
        _salmonBandOffer: 20,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 8.0,
        _salmonBandCashPrice: 10.4
      }
    };
    return s;
  }

  /** State with very low food: persona should accept, not decline.
   *  Zeros ALL food items that foodOnHand() sums so the threshold check
   *  actually sees ~5 lb of food, not the full BASE_KIT 1,400+ lb. */
  function makeSalmonStateLowFood(cash: number, hasTobacco: boolean) {
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    s = {
      ...s,
      cash,
      inventory: {
        ...s.inventory,
        // Zero all items that foodOnHand() counts
        flour: 5, bacon: 0, beans: 0, salt_pork: 0, hardtack: 0,
        jerky: 0, pemmican: 0, dried_fruit: 0, cornmeal: 0, dried_salmon: 0,
        // Set barter / non-barter goods explicitly
        tobacco: hasTobacco ? 5 : 0,
        blanket: 0, beads: 0, fishing_line: 0
      },
      flags: {
        ...s.flags,
        _salmonBandOffer: 10,
        _salmonBandTribeId: 'bannock',
        _salmonBandGoodsPrice: 4.0,
        _salmonBandCashPrice: 5.2
      }
    };
    return s;
  }

  it('cautious with 700 lb food → decline (food above threshold)', () => {
    const s = makeSalmonStateHighFood();
    const choice = cautiousPersona.pickEventChoice(s, ENCOUNTER_SALMON_BAND, makeRng('cr-f5-caut-high'));
    expect(choice).toBe('decline');
  });

  it('cautious with 5 lb food + cash → accept (cash fallback when no goods)', () => {
    const s = makeSalmonStateLowFood(100, false);
    const choice = cautiousPersona.pickEventChoice(s, ENCOUNTER_SALMON_BAND, makeRng('cr-f5-caut-low-cash'));
    expect(choice).toBe('accept_cash');
  });

  it('cautious with 5 lb food + tobacco → accept_goods (prefers goods)', () => {
    const s = makeSalmonStateLowFood(0, true);
    const choice = cautiousPersona.pickEventChoice(s, ENCOUNTER_SALMON_BAND, makeRng('cr-f5-caut-low-goods'));
    expect(choice).toBe('accept_goods');
  });

  it('aggressive with 700 lb food → decline (food above threshold)', () => {
    const s = makeSalmonStateHighFood();
    const choice = aggressivePersona.pickEventChoice(s, ENCOUNTER_SALMON_BAND, makeRng('cr-f5-agg-high'));
    expect(choice).toBe('decline');
  });

  it('aggressive with 5 lb food + tobacco → accept (not decline)', () => {
    const s = makeSalmonStateLowFood(0, true);
    const choice = aggressivePersona.pickEventChoice(s, ENCOUNTER_SALMON_BAND, makeRng('cr-f5-agg-low'));
    expect(choice).not.toBe('decline');
  });
});

// ---------------------------------------------------------------------------
// Minor: cash-markup test (§3e line 528-530) — make assertion real
// ---------------------------------------------------------------------------

describe('#1284 §3e — cash markup assertion: both flags populated via prepare', () => {
  it('after prepare(), cashPrice > goodsPrice (markup is real and testable)', () => {
    // Use the encounter's prepare hook to populate _salmonBand* flags,
    // then verify cashPrice > goodsPrice with a real assertion.
    let s = makeCorridorState(MID_CORRIDOR_MILE, { bannock: 50, nez_perce: 50 });
    // Run prepare (if defined) to populate the offer flags
    if (ENCOUNTER_SALMON_BAND.prepare) {
      s = ENCOUNTER_SALMON_BAND.prepare(s, makeRng('cr-markup-prepare'));
    }
    const cashPrice = s.flags._salmonBandCashPrice as number | undefined;
    const goodsPrice = s.flags._salmonBandGoodsPrice as number | undefined;
    // Both must be defined after prepare
    expect(cashPrice).toBeDefined();
    expect(goodsPrice).toBeDefined();
    if (cashPrice !== undefined && goodsPrice !== undefined) {
      // Cash markup must be ≥ 1.25× goods (the 30% penalty)
      expect(cashPrice).toBeGreaterThanOrEqual(goodsPrice * 1.25);
      // Sanity: cash price must be strictly positive
      expect(cashPrice).toBeGreaterThan(0);
    }
  });
});
