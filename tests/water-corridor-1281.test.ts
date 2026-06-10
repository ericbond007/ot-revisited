/**
 * Task 1 + Task 2: waterCorridor mechanic + catalog flags (#1281)
 * Task 5: bot/AI water-trigger adjustments (#1281)
 *
 * T1 tests verify the mechanic before any catalog flags are set.
 * T2 tests are content locks on the per-landmark flags applied in Task 2.
 * T5 tests verify persona shouldFindWater uses TOTAL water (clean + dirty).
 * Research source: docs/superpowers/specs/2026-06-09-water-corridor-research.md
 * (the per-leg table's "game-flag recommendation" column is canonical).
 */
import { describe, it, expect } from 'vitest';
import {
  corridorForLeg,
  applyCorridorRefill,
  CORRIDOR_REFILL_GAL,
  applyAmbientWaterRefill,
} from '../src/lib/game/systems/consumption';
import { LANDMARKS, getLandmark } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';
import {
  cautiousPersona,
  balancedPersona,
  aggressivePersona,
} from '../src/lib/game/ai/personas';
import { makeRng } from '../src/lib/game/rng';

// ---------------------------------------------------------------------------
// Minimal hand-built state helper (no createInitialState needed — we just
// need location + resources; other fields are placeholders).
// ---------------------------------------------------------------------------
function baseState(overrides: {
  nextLandmarkId?: string;
  water?: number;
  waterCap?: number;
  dirtyWater?: number;
  terrain?: GameState['location']['terrain'];
} = {}): GameState {
  return {
    seed: 'wc-test',
    day: 1,
    date: { year: 1848, month: 4, day: 1 },
    location: {
      trailPosition: 0,
      nextLandmarkId: overrides.nextLandmarkId ?? 'independence_mo',
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: overrides.terrain ?? 'prairie',
    },
    party: [
      {
        id: 'a',
        name: 'Ezra',
        profession: 'carpenter',
        sex: 'male',
        kind: 'adult',
        isLeader: true,
        age: 30,
        health: 100,
        conditions: [],
        dead: false,
      },
    ],
    wagon: {
      model: 'prairie_schooner',
      condition: 100,
      canvas: 100,
      carryCapacity: 2500,
      impairment: null,
    },
    oxen: [],
    inventory: {},
    cash: 0,
    resources: {
      water: overrides.water ?? 10,
      waterCap: overrides.waterCap ?? 30,
      ...(overrides.dirtyWater !== undefined ? { dirtyWater: overrides.dirtyWater } : {}),
    },
    morale: 60,
    pace: 'moderate',
    rations: 'normal',
    waterRation: 'normal',
    eventLog: [],
    flags: {},
    completed: false,
    outcome: 'in-progress',
  };
}

// Stub RNG that always hits (chance always true). int/pick are never called
// in applyAmbientWaterRefill but are required by the Rng interface.
const alwaysHit = {
  chance: () => true,
  next: () => 0.5,
  int: (min: number) => min,
  pick: <T>(a: readonly T[]) => a[0],
};
// Stub RNG that always misses.
const alwaysMiss = {
  chance: () => false,
  next: () => 0.5,
  int: (min: number) => min,
  pick: <T>(a: readonly T[]) => a[0],
};

// ---------------------------------------------------------------------------
// 1. corridorForLeg — unflagged landmarks
// ---------------------------------------------------------------------------
describe('corridorForLeg — returns correct value (undefined for unflagged, flag-kind for flagged)', () => {
  it('returns undefined for a real catalog landmark with no flag (independence_mo)', () => {
    const s = baseState({ nextLandmarkId: 'independence_mo' });
    expect(corridorForLeg(s)).toBeUndefined();
  });

  it('returns the correct corridor value for a real catalog landmark (ft_kearny now murky per T2)', () => {
    // Re-baseline T2: ft_kearny is now flagged 'murky' (Platte corridor). The T1 check
    // "returns undefined" only held while the catalog had NO flags (before T2). Now
    // corridorForLeg correctly returns the catalog value.
    const s = baseState({ nextLandmarkId: 'ft_kearny' });
    expect(corridorForLeg(s)).toBe('murky');
  });

  it('returns undefined for a genuinely unflagged landmark (willow_springs = dry alkali haul)', () => {
    // willow_springs is intentionally unflagged — the classic dry/alkali drive.
    const s = baseState({ nextLandmarkId: 'willow_springs' });
    expect(corridorForLeg(s)).toBeUndefined();
  });

  it('returns undefined for an unknown / invalid landmark id (safety net)', () => {
    const s = baseState({ nextLandmarkId: 'nonexistent_landmark_xyz' });
    expect(corridorForLeg(s)).toBeUndefined();
  });

  it('returns undefined when nextLandmarkId is an empty string', () => {
    const s = baseState({ nextLandmarkId: '' });
    expect(corridorForLeg(s)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. applyCorridorRefill — clean corridor math
// ---------------------------------------------------------------------------
describe('applyCorridorRefill — clean corridor', () => {
  it('adds CORRIDOR_REFILL_GAL to water when well below cap', () => {
    const s = baseState({ water: 10, waterCap: 30 });
    const r = applyCorridorRefill(s, 'clean');
    expect(r.resources.water).toBe(10 + CORRIDOR_REFILL_GAL);
  });

  it('clamps: clean at water 28/cap 30 → water exactly 30', () => {
    const s = baseState({ water: 28, waterCap: 30 });
    const r = applyCorridorRefill(s, 'clean');
    expect(r.resources.water).toBe(30);
  });

  it('does not change dirtyWater on a clean corridor refill', () => {
    const s = baseState({ water: 10, waterCap: 30, dirtyWater: 5 });
    const r = applyCorridorRefill(s, 'clean');
    expect(r.resources.dirtyWater).toBe(5);
  });

  it('returns same state object when water is already at cap', () => {
    const s = baseState({ water: 30, waterCap: 30 });
    const r = applyCorridorRefill(s, 'clean');
    expect(r).toBe(s); // strict reference equality — no allocation
  });
});

// ---------------------------------------------------------------------------
// 3. applyCorridorRefill — murky corridor math
// ---------------------------------------------------------------------------
describe('applyCorridorRefill — murky corridor', () => {
  it('adds CORRIDOR_REFILL_GAL to dirtyWater when room available', () => {
    const s = baseState({ water: 10, waterCap: 30, dirtyWater: 5 });
    const r = applyCorridorRefill(s, 'murky');
    expect(r.resources.dirtyWater).toBe(5 + CORRIDOR_REFILL_GAL);
  });

  it('does not change clean water on a murky refill', () => {
    const s = baseState({ water: 10, waterCap: 30, dirtyWater: 5 });
    const r = applyCorridorRefill(s, 'murky');
    expect(r.resources.water).toBe(10);
  });

  it('clamps: murky at water 20 + dirty 8, cap 30 → dirty 10 (+2 only)', () => {
    // room = 30 - 20 - 8 = 2; min(2, 5) = 2
    const s = baseState({ water: 20, waterCap: 30, dirtyWater: 8 });
    const r = applyCorridorRefill(s, 'murky');
    expect(r.resources.dirtyWater).toBe(10);
  });

  it('returns same state when water + dirtyWater == waterCap (no room)', () => {
    // water 20 + dirty 10 = cap 30 → no room
    const s = baseState({ water: 20, waterCap: 30, dirtyWater: 10 });
    const r = applyCorridorRefill(s, 'murky');
    expect(r).toBe(s);
  });

  it('handles no dirtyWater field (undefined) — treats as 0', () => {
    const s = baseState({ water: 10, waterCap: 30 }); // no dirtyWater field
    const r = applyCorridorRefill(s, 'murky');
    expect(r.resources.dirtyWater).toBe(CORRIDOR_REFILL_GAL);
  });
});

// ---------------------------------------------------------------------------
// 4. applyAmbientWaterRefill — terrain fallback (regression guard)
// ---------------------------------------------------------------------------
describe('applyAmbientWaterRefill — terrain fallback when no corridor flag', () => {
  it('desert terrain, no corridor → no refill', () => {
    // Re-baseline T2: ft_bridger is now flagged 'clean'; use massacre_rocks instead —
    // desert terrain, Snake RIM, intentionally unflagged per research table.
    const s = baseState({ water: 5, waterCap: 30, terrain: 'desert', nextLandmarkId: 'massacre_rocks' });
    const r = applyAmbientWaterRefill(s, alwaysHit);
    expect(r.resources.water).toBe(5);
  });

  it('river terrain, no corridor → +5 (deterministic, existing behavior)', () => {
    const s = baseState({ water: 5, waterCap: 30, terrain: 'river', nextLandmarkId: 'independence_mo' });
    const r = applyAmbientWaterRefill(s, alwaysHit);
    expect(r.resources.water).toBe(10);
  });

  it('prairie terrain, no corridor, rng miss → no refill', () => {
    const s = baseState({ water: 5, waterCap: 30, terrain: 'prairie', nextLandmarkId: 'independence_mo' });
    const r = applyAmbientWaterRefill(s, alwaysMiss);
    expect(r.resources.water).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 5. Task 2 — content locks on waterCorridor flags
//    Source: docs/superpowers/specs/2026-06-09-water-corridor-research.md
//    per-leg table (game-flag recommendation column, canonical).
// ---------------------------------------------------------------------------

describe('T2 — named spot-checks (representative sample)', () => {
  // --- Murky: Platte corridor ---
  it('ft_kearny is murky (Platte corridor; Little Blue→Platte)', () => {
    expect(getLandmark('ft_kearny').waterCorridor).toBe('murky');
  });
  it('chimney_rock is murky (North Platte valley)', () => {
    expect(getLandmark('chimney_rock').waterCorridor).toBe('murky');
  });
  it('ft_laramie is murky (Platte valley leg)', () => {
    expect(getLandmark('ft_laramie').waterCorridor).toBe('murky');
  });
  it('north_platte_2 is murky (river ford, still on the river at Caspar)', () => {
    expect(getLandmark('north_platte_2').waterCorridor).toBe('murky');
  });

  // --- Unflagged: Ash Hollow ridgeback ---
  it('windlass_hill is murky (T6 gate fix); ash_hollow keeps the ridgeback dryness', () => {
    expect(getLandmark('windlass_hill').waterCorridor).toBe('murky');
    expect(getLandmark('ash_hollow').waterCorridor).toBeUndefined();
  });
  it('ash_hollow is unflagged (same dry tableland; Ash Hollow spring is relief, not corridor)', () => {
    expect(getLandmark('ash_hollow').waterCorridor).toBeUndefined();
  });

  // --- Clean: Sweetwater ---
  it('devils_gate is clean (Sweetwater corridor begins)', () => {
    expect(getLandmark('devils_gate').waterCorridor).toBe('clean');
  });
  it('sweetwater_1 is clean (first Sweetwater crossing, post-alkali-haul relief)', () => {
    expect(getLandmark('sweetwater_1').waterCorridor).toBe('clean');
  });

  // --- Unflagged: dry drive ---
  it('independence_rock is unflagged (alkali approach; Sweetwater reached just past)', () => {
    expect(getLandmark('independence_rock').waterCorridor).toBeUndefined();
  });

  // --- Snake rim: unflagged ---
  it('massacre_rocks is unflagged (Snake RIM, road above canyon)', () => {
    expect(getLandmark('massacre_rocks').waterCorridor).toBeUndefined();
  });
  it('snake_three_island is unflagged (Snake RIM; ford is the discrete access point)', () => {
    expect(getLandmark('snake_three_island').waterCorridor).toBeUndefined();
  });

  // --- Clean: Boise valley (post-Three-Island) ---
  it('ft_boise is clean (Boise River valley, north route, lush and well-watered)', () => {
    expect(getLandmark('ft_boise').waterCorridor).toBe('clean');
  });

  // --- Murky: Burnt River ---
  it('burnt_river_canyon is murky (Burnt River creek, brackish gorge)', () => {
    expect(getLandmark('burnt_river_canyon').waterCorridor).toBe('murky');
  });

  // --- Clean: Powder/Grande Ronde/Umatilla ---
  it('grande_ronde is clean (Grande Ronde River, mountain valley)', () => {
    expect(getLandmark('grande_ronde').waterCorridor).toBe('clean');
  });
  it('whitman_mission is clean (Blue Mtn crossing to Walla Walla River corridor)', () => {
    expect(getLandmark('whitman_mission').waterCorridor).toBe('clean');
  });

  // --- Unflagged: Barlow forest (forest ambient already covers it) ---
  it('barlow_road is unflagged (Barlow forest; forest ambient already ~3 gal @ 60%)', () => {
    expect(getLandmark('barlow_road').waterCorridor).toBeUndefined();
  });
  it('oregon_city is unflagged (Barlow/Willamette; same forest-ambient reasoning)', () => {
    expect(getLandmark('oregon_city').waterCorridor).toBeUndefined();
  });
});

describe('T2 — count lock: T2-era flag set (totals now live in the T3+T4+T6 lock below) (T2-only baseline)', () => {
  // Count derived from the research doc per-leg table (2026-06-09-water-corridor-research.md):
  //   24 clean + 13 murky = 37 flagged landmarks.
  // Clean (24): kansas_river, vieux_crossing, alcove_spring, big_blue_river,
  //   hollenberg_ranch, rock_creek_station, devils_gate, martins_cove,
  //   sweetwater_1, cheyenne_camp, ice_slough, south_pass, green_river,
  //   big_hill, ft_bridger, shoshone_camp, bear_river, soda_springs, ft_hall,
  //   ft_boise, blue_mountains, grande_ronde, whitman_mission, ft_walla_walla.
  // Murky (13): ft_kearny, rachel_pattison_grave, north_platte_1,
  //   courthouse_rock, chimney_rock, scotts_bluff, robidoux_post, ft_laramie,
  //   register_cliff, guernsey_ruts, ft_caspar, north_platte_2, burnt_river_canyon.
  //
  // RE-BASELINE (T4): farewell_bend gains waterCorridor:'clean' in T4 (last
  // Snake River camp before Burnt River; research table: clean Snake approach).
  // T2-only count was 37; the living count after T3+T4 is 38 (see T3+T4 count
  // lock describe below). These spot-checks are unchanged; only the totals shift.
  it('the 14 murky landmarks (T2\u2019s 13 + windlass_hill T6 gate fix)', () => {
    // T6 gate fix: windlass_hill flagged murky \u2014 ~70 of its 92-mi leg is
    // Platte south-bank road; only the final Ash Hollow ridgeback is dry
    // (that dryness lives on the ash_hollow arrival, still unflagged).
    // Unflagged it cratered the leg in the gate: 266 deaths/2500 runs.
    const murky = LANDMARKS.filter((l) => l.waterCorridor === 'murky');
    expect(murky.length).toBe(14);
  });

  it('the 24 T2-baseline clean landmarks are all still present', () => {
    const T2_CLEAN = [
      'kansas_river', 'vieux_crossing', 'alcove_spring', 'big_blue_river',
      'hollenberg_ranch', 'rock_creek_station', 'devils_gate', 'martins_cove',
      'sweetwater_1', 'cheyenne_camp', 'ice_slough', 'south_pass', 'green_river',
      'big_hill', 'ft_bridger', 'shoshone_camp', 'bear_river', 'soda_springs',
      'ft_hall', 'ft_boise', 'blue_mountains', 'grande_ronde', 'whitman_mission',
      'ft_walla_walla',
    ] as const;
    for (const id of T2_CLEAN) {
      expect(getLandmark(id).waterCorridor).toBe('clean');
    }
  });
});

describe('T2 — dry-drive guard: willow_springs + independence_rock unflagged', () => {
  // The classic ~30-mi dry/alkali drive from the North Platte crossing at
  // Bessemer Bend to the Sweetwater. research doc: "the classic ~30-mi dry/
  // alkali drive. Willow Springs IS the named relief." and independence_rock:
  // "leave dry until Sweetwater."
  // These two must never receive a corridor flag — they represent historically
  // correct dry country that should keep the engine's terrain-based treatment.
  const DRY_DRIVE_IDS = ['willow_springs', 'independence_rock'] as const;

  for (const id of DRY_DRIVE_IDS) {
    it(`${id} is unflagged (dry/alkali drive)`, () => {
      expect(getLandmark(id).waterCorridor).toBeUndefined();
    });
  }
});

// ---------------------------------------------------------------------------
// T3 — new point-access landmarks (Snake ×2, Columbia plateau ×4)
// ---------------------------------------------------------------------------

describe('T3 — total trail miles invariant (must equal 2170 even after insertions)', () => {
  // Current sum before T3 insertions: 2170 (canonical Franzwa/NPS total).
  // T3 splits existing legs (splits do not change the total); this test
  // catches any arithmetic error in the leg redistribution.
  it('total trail miles is still the canonical 2170', () => {
    const total = LANDMARKS.reduce((s, l) => s + l.milesFromPrevious, 0);
    expect(total).toBe(2170);
  });
});

describe('T3 — new Snake access-point landmarks', () => {
  // research doc: American Falls — waterSource ~10 mi past Fort Hall;
  //               Rock Creek — waterSource ~mid massacre_rocks→salmon_falls leg.

  it('american_falls exists in LANDMARKS', () => {
    expect(() => getLandmark('american_falls')).not.toThrow();
  });

  it('american_falls has kind landmark, waterSource true, terrain desert', () => {
    const lm = getLandmark('american_falls');
    expect(lm.kind).toBe('landmark');
    expect(lm.waterSource).toBe(true);
    expect(lm.terrain).toBe('desert');
  });

  it('american_falls.milesFromPrevious + massacre_rocks.milesFromPrevious === 45 (original massacre_rocks mFP)', () => {
    // Original massacre_rocks mFP was 45 (ft_hall → massacre_rocks).
    // american_falls splits that leg; the two new legs must sum to 45.
    const af = getLandmark('american_falls');
    const mr = getLandmark('massacre_rocks');
    expect(af.milesFromPrevious + mr.milesFromPrevious).toBe(45);
  });

  it('american_falls appears between ft_hall and massacre_rocks in trail order', () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids.indexOf('american_falls')).toBeGreaterThan(ids.indexOf('ft_hall'));
    expect(ids.indexOf('american_falls')).toBeLessThan(ids.indexOf('massacre_rocks'));
  });

  it('rock_creek_snake exists in LANDMARKS', () => {
    expect(() => getLandmark('rock_creek_snake')).not.toThrow();
  });

  it('rock_creek_snake has kind landmark, waterSource true, terrain desert', () => {
    const lm = getLandmark('rock_creek_snake');
    expect(lm.kind).toBe('landmark');
    expect(lm.waterSource).toBe(true);
    expect(lm.terrain).toBe('desert');
  });

  it('rock_creek_snake.milesFromPrevious + salmon_falls.milesFromPrevious === 45 (original salmon_falls mFP)', () => {
    // Original salmon_falls mFP was 45 (massacre_rocks → salmon_falls).
    // rock_creek_snake splits that leg; the two new legs must sum to 45.
    const rcs = getLandmark('rock_creek_snake');
    const sf = getLandmark('salmon_falls');
    expect(rcs.milesFromPrevious + sf.milesFromPrevious).toBe(45);
  });

  it('rock_creek_snake appears between massacre_rocks and salmon_falls in trail order', () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids.indexOf('rock_creek_snake')).toBeGreaterThan(ids.indexOf('massacre_rocks'));
    expect(ids.indexOf('rock_creek_snake')).toBeLessThan(ids.indexOf('salmon_falls'));
  });
});

describe('T3 — new Columbia plateau access-point landmarks', () => {
  // research doc: the 95-mi ft_walla_walla→the_dalles leg crosses dry plateau
  // with water only at four river crossings: Umatilla, Willow Creek, John Day,
  // Deschutes. These are inserted as waterSource landmarks splitting the leg.

  const COLUMBIA_IDS = ['umatilla_river', 'willow_creek_or', 'john_day_river', 'deschutes_river'] as const;

  for (const id of COLUMBIA_IDS) {
    it(`${id} exists in LANDMARKS`, () => {
      expect(() => getLandmark(id)).not.toThrow();
    });

    it(`${id} has kind landmark, waterSource true`, () => {
      const lm = getLandmark(id);
      expect(lm.kind).toBe('landmark');
      expect(lm.waterSource).toBe(true);
    });
  }

  it('all four Columbia plateau landmarks appear between ft_walla_walla and the_dalles', () => {
    const ids = LANDMARKS.map((l) => l.id);
    const wallaIdx = ids.indexOf('ft_walla_walla');
    const dallesIdx = ids.indexOf('the_dalles');
    for (const id of COLUMBIA_IDS) {
      const idx = ids.indexOf(id);
      expect(idx).toBeGreaterThan(wallaIdx);
      expect(idx).toBeLessThan(dallesIdx);
    }
  });

  it('all four Columbia plateau landmarks are in west-to-east historical order', () => {
    // Umatilla → Willow Creek → John Day → Deschutes (east to west travel order)
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids.indexOf('umatilla_river')).toBeLessThan(ids.indexOf('willow_creek_or'));
    expect(ids.indexOf('willow_creek_or')).toBeLessThan(ids.indexOf('john_day_river'));
    expect(ids.indexOf('john_day_river')).toBeLessThan(ids.indexOf('deschutes_river'));
  });

  it('Columbia plateau legs sum to 95 (the original ft_walla_walla→the_dalles mFP)', () => {
    // The four new landmarks plus the_dalles split the original 95-mi leg;
    // their milesFromPrevious values plus the_dalles's new mFP must still total 95.
    const ids = ['umatilla_river', 'willow_creek_or', 'john_day_river', 'deschutes_river', 'the_dalles'] as const;
    const sum = ids.reduce((s, id) => s + getLandmark(id).milesFromPrevious, 0);
    expect(sum).toBe(95);
  });
});

// ---------------------------------------------------------------------------
// T4 — Farewell Bend geography fix
// ---------------------------------------------------------------------------

describe('T4 — Farewell Bend reorder: ft_boise → farewell_bend → burnt_river_canyon → flagstaff_hill', () => {
  it('farewell_bend appears before burnt_river_canyon in trail order', () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids.indexOf('farewell_bend')).toBeLessThan(ids.indexOf('burnt_river_canyon'));
  });

  it('burnt_river_canyon appears before flagstaff_hill in trail order', () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids.indexOf('burnt_river_canyon')).toBeLessThan(ids.indexOf('flagstaff_hill'));
  });

  it('farewell_bend appears after ft_boise in trail order', () => {
    const ids = LANDMARKS.map((l) => l.id);
    expect(ids.indexOf('farewell_bend')).toBeGreaterThan(ids.indexOf('ft_boise'));
  });

  it('farewell_bend has waterSource true', () => {
    expect(getLandmark('farewell_bend').waterSource).toBe(true);
  });

  it('farewell_bend terrain is not desert (Snake River camp; fix from catalog error)', () => {
    // Research doc: "it sits on the Snake (water present)."
    // Terrain 'river' is safe for kind:'landmark' — does not trigger ford mechanics.
    // (Ford mechanics only trigger when kind === 'river'; terrain 'river' on a
    // kind:'landmark' entry is purely a terrain descriptor used for pacing + ambient refill.)
    expect(getLandmark('farewell_bend').terrain).not.toBe('desert');
  });

  it('total trail miles is still 2170 after T4 reorder', () => {
    const total = LANDMARKS.reduce((s, l) => s + l.milesFromPrevious, 0);
    expect(total).toBe(2170);
  });
});

describe('T4 — Farewell Bend corridor flag (research table: clean Snake camp)', () => {
  // ft_boise → farewell_bend: the north-route Boise River valley ends at the
  // Snake return; this leg is 'clean' (Boise River corridor → Snake return).
  // Research table for the ORIGINAL ft_boise → burnt_river_canyon leg is 'murky'
  // for the Burnt River creek. Now split:
  //   ft_boise → farewell_bend: Snake River camp = 'clean' (last good Snake water).
  //   farewell_bend → burnt_river_canyon: Burnt River gorge = 'murky' (unchanged per T2).
  //   burnt_river_canyon → flagstaff_hill: keep-point (dry climb, unflagged per table).
  it('farewell_bend waterCorridor is clean (Snake River camp; last good water before Burnt River)', () => {
    expect(getLandmark('farewell_bend').waterCorridor).toBe('clean');
  });

  it('burnt_river_canyon remains murky (Burnt River creek; T2 flag preserved)', () => {
    expect(getLandmark('burnt_river_canyon').waterCorridor).toBe('murky');
  });

  it('flagstaff_hill remains unflagged (dry ridge climb; keep-point per research table)', () => {
    expect(getLandmark('flagstaff_hill').waterCorridor).toBeUndefined();
  });
});

describe('T3+T4 — updated waterCorridor count lock (T2 base 37 + T4 farewell_bend + T6 windlass_hill = 39)', () => {
  // T3 new landmarks (american_falls, rock_creek_snake) have waterSource:true
  // but are Snake RIM access points — no waterCorridor flag (leg is RIM/dry
  // per research table). Columbia plateau landmarks (umatilla_river etc.) also
  // waterSource but no corridor flag (discrete point access, not corridor).
  // T4 adds farewell_bend as 'clean'. Net change: +2 (farewell_bend clean, windlass_hill murky T6 fix).
  // Updated count: 37 (T2 base) + 2 = 39.
  it('exactly 39 landmarks carry a waterCorridor flag after T3+T4+T6fix', () => {
    const flagged = LANDMARKS.filter((l) => l.waterCorridor !== undefined);
    expect(flagged.length).toBe(39);
  });

  it('exactly 25 landmarks are clean (T2 base 24 + farewell_bend)', () => {
    const clean = LANDMARKS.filter((l) => l.waterCorridor === 'clean');
    expect(clean.length).toBe(25);
  });

  it('exactly 14 landmarks are murky (T2 base 13 + windlass_hill T6 fix)', () => {
    const murky = LANDMARKS.filter((l) => l.waterCorridor === 'murky');
    expect(murky.length).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// T5 — bot/AI shouldFindWater uses TOTAL water (clean + dirty) (#1281)
//
// Pre-change, waterRatio() was clean-only. On murky corridors the keg fills
// with dirty water (dehydration runs on total per #1136) so a clean-only
// ratio triggered spurious find_water days on a full-but-dirty keg.
// After change: ratio = (water + dirtyWater) / cap.
// ---------------------------------------------------------------------------

/** Minimal state for shouldFindWater testing.
 *  day:1 so schedulePressure returns 'ok' (projectedArrivalDay is null
 *  until day>=20 && miles>=100 — suppressCamp does NOT interfere).
 *  terrain:'prairie' keeps desertWaterFloor at its non-desert value. */
function waterTestState(
  water: number,
  waterCap: number,
  dirtyWater: number | undefined = undefined,
): GameState {
  return {
    seed: 'wc-t5',
    day: 1,
    date: { year: 1848, month: 5, day: 15 },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'ft_kearny', // murky corridor landmark — good real-world case
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: 'prairie',
    },
    party: [
      {
        id: 'a',
        name: 'Ezra',
        profession: 'carpenter',
        sex: 'male',
        kind: 'adult',
        isLeader: true,
        age: 30,
        health: 100,
        conditions: [],
        dead: false,
      },
    ],
    wagon: {
      model: 'prairie_schooner',
      condition: 100,
      canvas: 100,
      carryCapacity: 2500,
      impairment: null,
    },
    oxen: [],
    inventory: {},
    cash: 0,
    resources: {
      water,
      waterCap,
      ...(dirtyWater !== undefined ? { dirtyWater } : {}),
    },
    morale: 60,
    pace: 'moderate',
    rations: 'normal',
    waterRation: 'normal',
    eventLog: [],
    flags: {},
    completed: false,
    outcome: 'in-progress',
  };
}

const stubRng = makeRng('t5-stub');

describe('T5 — shouldFindWater: full-but-dirty keg does NOT trigger (total-water fix)', () => {
  // Scenario: keg is FULL but entirely dirty water (murky Platte corridor).
  // Pre-fix: clean-only ratio = 0/30 = 0.0 → would trigger find_water (bug).
  // Post-fix: total ratio = 30/30 = 1.0 → does NOT trigger (correct).
  const fullDirtyState = waterTestState(0, 30, 30);

  it('cautious: shouldFindWater returns false when keg is full of dirty water', () => {
    expect(cautiousPersona.shouldFindWater(fullDirtyState, stubRng)).toBe(false);
  });

  it('balanced: shouldFindWater returns false when keg is full of dirty water', () => {
    expect(balancedPersona.shouldFindWater(fullDirtyState, stubRng)).toBe(false);
  });

  it('aggressive: shouldFindWater returns false when keg is full of dirty water', () => {
    expect(aggressivePersona.shouldFindWater(fullDirtyState, stubRng)).toBe(false);
  });
});

describe('T5 — shouldFindWater: genuinely empty keg triggers correctly', () => {
  // Scenario: both clean and dirty water are 0 — keg is empty.
  // Both pre-fix and post-fix behavior: ratio = 0 → should trigger.
  const emptyState = waterTestState(0, 30, 0);

  it('cautious: shouldFindWater returns true when total water is 0', () => {
    expect(cautiousPersona.shouldFindWater(emptyState, stubRng)).toBe(true);
  });

  it('balanced: shouldFindWater returns true when total water is 0', () => {
    expect(balancedPersona.shouldFindWater(emptyState, stubRng)).toBe(true);
  });

  it('aggressive: shouldFindWater returns true when total water is 0', () => {
    expect(aggressivePersona.shouldFindWater(emptyState, stubRng)).toBe(true);
  });
});

describe('T5 — shouldFindWater: partial dirty + partial clean = correct total ratio', () => {
  // Scenario: water=4 (clean) + dirty=10 → total=14 out of 30 = 47% total fill.
  // All persona thresholds (0.10–0.20 on prairie) are well below 0.47 so
  // this should return false — the keg is adequately filled when counting total.
  // Pre-fix: clean-only ratio = 4/30 = 0.13; cautious (threshold 0.15) would
  // trigger (BUG). Post-fix: total ratio = 14/30 = 0.47; all return false.
  const partialState = waterTestState(4, 30, 10);

  it('cautious: shouldFindWater returns false (total ratio 0.47 >> cautious threshold 0.15)', () => {
    expect(cautiousPersona.shouldFindWater(partialState, stubRng)).toBe(false);
  });

  it('balanced: shouldFindWater returns false (total ratio 0.47 >> balanced threshold 0.10)', () => {
    expect(balancedPersona.shouldFindWater(partialState, stubRng)).toBe(false);
  });

  it('aggressive: shouldFindWater returns false (total ratio 0.47 >> aggressive threshold 0.20)', () => {
    expect(aggressivePersona.shouldFindWater(partialState, stubRng)).toBe(false);
  });
});

describe('T5 — shouldFindWater: no dirtyWater field (undefined) counts as 0', () => {
  // waterRatio() must handle undefined dirtyWater gracefully via ?? 0.
  // State: water=2, no dirtyWater → total ratio = 2/30 = 0.067 (below all thresholds).
  const noDirtyState = waterTestState(2, 30); // no dirtyWater arg

  it('cautious: shouldFindWater returns true when clean water very low and no dirty', () => {
    // 2/30 = 0.067 < 0.15 cautious threshold → true
    expect(cautiousPersona.shouldFindWater(noDirtyState, stubRng)).toBe(true);
  });

  it('balanced: shouldFindWater returns true when clean water very low and no dirty', () => {
    // 2/30 = 0.067 < 0.10 balanced threshold → true
    expect(balancedPersona.shouldFindWater(noDirtyState, stubRng)).toBe(true);
  });

  it('aggressive: shouldFindWater returns true when clean water very low and no dirty', () => {
    // 2/30 = 0.067 < 0.20 aggressive threshold → true
    expect(aggressivePersona.shouldFindWater(noDirtyState, stubRng)).toBe(true);
  });
});
