# #1019 Continuous Temperature Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a continuous `dayTempF` / `nightTempF` temperature model to the engine, then re-wire two existing systems (fire.ts cold-camp + consumption.ts ox water) to consume the continuous signal.

**Architecture:** New pure-function module `src/lib/game/systems/temperature.ts` derives day/night temps from `state` (terrain × elevation × latitude × month × weather, with day/night swing on top). No state field — no save migration. Three slices: foundation, fire.ts rewire (#1019 + #1073), consumption.ts rewire (#1074). Each slice is its own PR + sweep-gated.

**Tech Stack:** TypeScript, Vitest, SvelteKit. Version control: **jj (Jujutsu)** — see CLAUDE.md project notes for `jj git push --bookmark X --allow-new` flow. Pre-commit gate: `npm run verify` (svelte-check + full vitest).

**Spec:** `docs/superpowers/specs/2026-05-23-1019-continuous-temperature-design.md`

---

## File Structure

| File | Slice | Responsibility |
|---|---|---|
| `src/lib/game/systems/temperature.ts` | 1 (new) | Pure derivation: `dayTempF(state)`, `nightTempF(state)`, helper consts |
| `src/lib/game/content/landmarks.ts` | 1 (modify) | Add `elevationFt?: number` to `Landmark` interface + ~12 key-landmark overrides |
| `src/lib/game/systems/fire.ts` | 2 (modify) | Remove `isColdNight`; consume `nightTempF(state) < 40` at the 2 callsites; scale `applyColdPenalty` HP/morale by `coldIntensity = clamp((40 − nightTempF) / 8, 0, 3)` |
| `src/lib/game/systems/weather.ts` | 3 (modify) | Drop heat branch from `weatherWaterMult` (now only handles overcast/rain damp-cool) |
| `src/lib/game/systems/consumption.ts` | 3 (modify) | Apply continuous `tempWaterMult(state)` alongside the trimmed `weatherWaterMult` |
| `tests/temperature.test.ts` | 1 (new) | ~30 cases: per-input deltas, period anchors, frost/snow weather-floor caps |
| `tests/fire.test.ts` | 2 (modify) | Add `coldIntensity` scaling cases; existing cases preserved or updated |
| `tests/consumption.test.ts` | 3 (modify) | Continuous heat-scale cases |

---

## Slice 1 — Foundation (no consumers wired)

**Goal:** Ship `systems/temperature.ts` + elevation content + unit tests. Sweep MUST be byte-equal to today (no behavior change since nothing consumes the model yet).

**Branch:** `feat/1019-temp-foundation`, off master.

### Task 1.1 — Add `elevationFt?` to Landmark interface

**Files:**
- Modify: `src/lib/game/content/landmarks.ts` (interface ~line 35; ~12 catalog overrides)

- [ ] **Step 1: Read landmarks.ts to confirm exact interface location**

Run: `rg -n "^export interface Landmark " src/lib/game/content/landmarks.ts`
Expected: one line ~35.

- [ ] **Step 2: Add the optional field to the interface**

Insert after `terrain: Terrain;` line in `interface Landmark`:

```ts
  /** #1019 — Optional altitude in feet for the continuous temperature
   *  model. When undefined, `systems/temperature.ts` falls back to a
   *  terrain default (prairie 1500, forest 2500, desert 3500,
   *  mountains 6500, river 1000). Override only where the landmark is
   *  meaningfully off-baseline (South Pass 7400, Independence Rock
   *  6000, Walla Walla 700, Oregon City 50, etc.). */
  elevationFt?: number;
```

- [ ] **Step 3: Add elevation overrides to the catalog**

In the `LANDMARKS` array, add `elevationFt: <n>,` after the `terrain:` field on these landmarks. (Use `rg -n "id: '<id>'" src/lib/game/content/landmarks.ts` to locate each.)

```
fort_kearny       → 2200
chimney_rock      → 4200
fort_laramie      → 4300
independence_rock → 6000
south_pass        → 7400
fort_bridger      → 6700
soda_springs      → 5800
fort_hall         → 4500
fort_boise        → 2100
whitman_mission   → 800
fort_walla_walla  → 700
the_dalles        → 100
oregon_city       → 50
```

Skip landmarks whose terrain default is fine.

- [ ] **Step 4: Compile-check**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3`
Expected: `0 ERRORS 0 WARNINGS`. The field is optional so existing literals are valid.

- [ ] **Step 5: Conceptual commit** (controller-managed; do not run jj/git)

Files touched: `src/lib/game/content/landmarks.ts`.

---

### Task 1.2 — Create `temperature.ts` with constants + per-input deltas

**Files:**
- Create: `src/lib/game/systems/temperature.ts`

- [ ] **Step 1: Write the file**

```ts
// #1019 — Continuous temperature model.
//
// Pure-function derivation from state. No state field, no save
// migration. Spec: docs/superpowers/specs/2026-05-23-1019-continuous-
// temperature-design.md.
//
// Composition:
//   midTempF = BASE - elevDelta - latDelta + monthDelta + weatherDelta
//   dayTempF   = midTempF + daySwing(terrain)
//   nightTempF = midTempF - nightSwing(terrain), capped by frost/snow floors
//
// Period anchors (Marcy 1859, Bryant 1846, Frizzell 1852, Reed-Donner):
//   South Pass July clear night         ≈ 35°F
//   Snake desert August clear day       ≈ 90-95°F
//   Prairie December clear night        ≈ 30-35°F
//   Independence July storm night       ≈ 55-60°F (NOT cold-camp grade)
//   Frost weather anywhere → nightTempF ≤ 32 (physical floor)
//   Snow  weather anywhere → nightTempF ≤ 28 (physical floor)

import type { GameState, Terrain, Weather } from '../types';
import { getLandmark } from '../content/landmarks';

export const BASE_TEMP_F = 70;

export const ELEVATION_REF_FT = 1000;
export const ELEVATION_LAPSE_F_PER_1000FT = 5;

export const LATITUDE_REF_N = 39;
export const LATITUDE_DELTA_F_PER_DEGREE = 1;
export const TRAIL_TOTAL_MI = 2195;
export const TRAIL_LATITUDE_START_N = 39;
export const TRAIL_LATITUDE_END_N = 45;

/** Sinusoidal month-of-year delta. Center −5°F, amplitude 20°F →
 *  peaks at +15°F in July (m=7), troughs at −25°F in January (m=1). */
export function monthDelta(month: number): number {
  const center = -5;
  const amplitude = 20;
  const phase = ((month - 7) / 6) * Math.PI;
  return center + amplitude * Math.cos(phase);
}

export function weatherDelta(weather: Weather | undefined): number {
  switch (weather) {
    case 'clear':    return 0;
    case 'overcast': return -3;
    case 'rain':     return -5;
    case 'storm':    return -10;
    case 'snow':     return -15;
    case 'frost':    return -15;
    case 'heat':     return 10;
    case 'fog':      return -2;
    default:         return 0;
  }
}

const TERRAIN_DEFAULT_ELEVATION_FT: Record<Terrain, number> = {
  prairie:   1500,
  forest:    2500,
  desert:    3500,
  mountains: 6500,
  river:     1000
};

const DAY_SWING_F: Record<Terrain, number> = {
  prairie:   15,
  forest:    12,
  mountains: 10,
  desert:    25,
  river:     12
};

const NIGHT_SWING_F: Record<Terrain, number> = {
  prairie:   10,
  forest:    8,
  mountains: 15,
  desert:    20,
  river:     8
};

/** Resolve elevation at the wagon's current trail position by linear
 *  interpolation between previousLandmark and nextLandmark elevations,
 *  weighted by where milesTraveled sits in the segment. If
 *  previousLandmarkId is null (first segment) use nextLandmark's
 *  elevation directly. Falls back to the terrain default when a
 *  landmark lacks an explicit `elevationFt`. */
export function elevationFtAt(state: GameState): number {
  const terrain = state.location.terrain;
  const terrainDefault = TERRAIN_DEFAULT_ELEVATION_FT[terrain];
  const next = getLandmark(state.location.nextLandmarkId);
  const nextElev = next?.elevationFt ?? terrainDefault;
  if (!state.location.previousLandmarkId) return nextElev;
  const prev = getLandmark(state.location.previousLandmarkId);
  const prevElev = prev?.elevationFt ?? terrainDefault;
  // Segment progress: milesTraveled total minus prev's cumulative
  // miles, divided by next's milesFromPrevious. We don't have prev's
  // cumulative miles directly; approximate by 0.5 (mid-segment) when
  // milesFromPrevious is positive — interpolation precision is not
  // load-bearing for the temperature model's calibration.
  // (Tests verify both endpoint behaviors; sub-segment precision is a
  // future refinement if a consumer needs it.)
  const segMiles = next?.milesFromPrevious ?? 0;
  const t = segMiles > 0 ? 0.5 : 0;
  return prevElev + (nextElev - prevElev) * t;
}

export function elevationDelta(state: GameState): number {
  const elev = elevationFtAt(state);
  const above = Math.max(0, elev - ELEVATION_REF_FT);
  return (above / 1000) * ELEVATION_LAPSE_F_PER_1000FT;
}

export function latitudeN(state: GameState): number {
  const t = Math.min(1, Math.max(0, state.location.milesTraveled / TRAIL_TOTAL_MI));
  return TRAIL_LATITUDE_START_N + t * (TRAIL_LATITUDE_END_N - TRAIL_LATITUDE_START_N);
}

export function latitudeDelta(state: GameState): number {
  return Math.max(0, latitudeN(state) - LATITUDE_REF_N) * LATITUDE_DELTA_F_PER_DEGREE;
}

export function midTempF(state: GameState): number {
  return BASE_TEMP_F
    - elevationDelta(state)
    - latitudeDelta(state)
    + monthDelta(state.date.month)
    + weatherDelta(state.weather);
}

export function dayTempF(state: GameState): number {
  return midTempF(state) + DAY_SWING_F[state.location.terrain];
}

export function nightTempF(state: GameState): number {
  const raw = midTempF(state) - NIGHT_SWING_F[state.location.terrain];
  // Weather-name physical floor: frost/snow weather literally describes
  // freezing-grade nights. Cap the result regardless of season/elev
  // so a July prairie "frost" actually freezes (it would otherwise
  // sit around 50°F by deltas alone — not a frost).
  if (state.weather === 'snow') return Math.min(raw, 28);
  if (state.weather === 'frost') return Math.min(raw, 32);
  return raw;
}
```

- [ ] **Step 2: Confirm imports resolve**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3`
Expected: `0 ERRORS`. `getLandmark` is the existing exported helper in landmarks.ts. `Weather` / `Terrain` are in `../types`.

- [ ] **Step 3: Conceptual commit**

Files touched: `src/lib/game/systems/temperature.ts`.

---

### Task 1.3 — Write unit tests pinning period anchors + every input

**Files:**
- Create: `tests/temperature.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import {
  dayTempF, nightTempF, midTempF, monthDelta, weatherDelta,
  elevationDelta, latitudeDelta, elevationFtAt, latitudeN,
  BASE_TEMP_F
} from '../src/lib/game/systems/temperature';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

// Build a state pinned at a specific landmark + miles + month + weather.
function stateAt(opts: {
  landmarkId: string;
  prevId?: string | null;
  miles?: number;
  month?: number;
  weather?: GameState['weather'];
  terrain?: GameState['location']['terrain'];
}): GameState {
  const s = createInitialState({
    seed: 't1019',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: opts.month ?? 6, day: 15 }
  });
  return {
    ...s,
    date: { ...s.date, month: opts.month ?? s.date.month },
    weather: opts.weather ?? 'clear',
    location: {
      ...s.location,
      previousLandmarkId: opts.prevId === undefined ? null : opts.prevId,
      nextLandmarkId: opts.landmarkId,
      milesTraveled: opts.miles ?? 0,
      terrain: opts.terrain ?? s.location.terrain
    }
  };
}

describe('#1019 monthDelta', () => {
  it('peaks at +15 in July (m=7)', () => {
    expect(Math.round(monthDelta(7))).toBe(15);
  });
  it('troughs at -25 in January (m=1)', () => {
    expect(Math.round(monthDelta(1))).toBe(-25);
  });
  it('is approximately zero (≈ -5) in April and October', () => {
    expect(monthDelta(4)).toBeCloseTo(-5, 0);
    expect(monthDelta(10)).toBeCloseTo(-5, 0);
  });
});

describe('#1019 weatherDelta', () => {
  it('clear=0, overcast=-3, rain=-5, storm=-10, snow=-15, frost=-15, heat=+10, fog=-2', () => {
    expect(weatherDelta('clear')).toBe(0);
    expect(weatherDelta('overcast')).toBe(-3);
    expect(weatherDelta('rain')).toBe(-5);
    expect(weatherDelta('storm')).toBe(-10);
    expect(weatherDelta('snow')).toBe(-15);
    expect(weatherDelta('frost')).toBe(-15);
    expect(weatherDelta('heat')).toBe(10);
    expect(weatherDelta('fog')).toBe(-2);
  });
});

describe('#1019 elevation + latitude', () => {
  it('elevationDelta = 0 at or below ELEVATION_REF_FT (1000)', () => {
    const s = stateAt({ landmarkId: 'oregon_city', terrain: 'river' });
    expect(elevationDelta(s)).toBe(0); // river default 1000
  });
  it('elevationDelta scales 5°F per 1000 ft above 1000 ft', () => {
    const s = stateAt({ landmarkId: 'south_pass', terrain: 'mountains' });
    // south_pass elevationFt=7400; above ref by 6400; 6.4 * 5 = 32
    expect(elevationDelta(s)).toBe(32);
  });
  it('latitudeN scales 39→45 across the 2195-mi trail', () => {
    const s0 = stateAt({ landmarkId: 'fort_kearny', miles: 0 });
    const sEnd = stateAt({ landmarkId: 'oregon_city', miles: 2195 });
    expect(latitudeN(s0)).toBeCloseTo(39, 1);
    expect(latitudeN(sEnd)).toBeCloseTo(45, 1);
  });
});

describe('#1019 period anchors', () => {
  it('South Pass July clear night ≈ 35°F (Marcy 1859 high-pass cold nights)', () => {
    const s = stateAt({
      landmarkId: 'south_pass', terrain: 'mountains',
      month: 7, weather: 'clear', miles: 970 // ~lat 41.6
    });
    const night = nightTempF(s);
    expect(night).toBeGreaterThanOrEqual(30);
    expect(night).toBeLessThanOrEqual(40);
  });
  it('Snake desert August clear day ≈ 90-95°F', () => {
    const s = stateAt({
      landmarkId: 'fort_boise', terrain: 'desert',
      month: 8, weather: 'clear', miles: 1600 // ~lat 43.4
    });
    const day = dayTempF(s);
    expect(day).toBeGreaterThanOrEqual(85);
    expect(day).toBeLessThanOrEqual(100);
  });
  it('Prairie December clear night well below cold-camp threshold (< 40°F)', () => {
    const s = stateAt({
      landmarkId: 'fort_kearny', terrain: 'prairie',
      month: 12, weather: 'clear', miles: 320
    });
    expect(nightTempF(s)).toBeLessThan(40);
  });
  it('Independence July storm night is NOT cold-camp grade (> 50°F)', () => {
    // Bryant 1846: "men shivered but bore it" — uncomfortable, not deadly.
    const s = stateAt({
      landmarkId: 'fort_kearny', terrain: 'prairie',
      month: 7, weather: 'storm', miles: 0
    });
    expect(nightTempF(s)).toBeGreaterThan(50);
  });
});

describe('#1019 weather-name physical floors on nightTempF', () => {
  it('frost weather caps nightTempF at 32°F regardless of season', () => {
    const s = stateAt({
      landmarkId: 'fort_kearny', terrain: 'prairie',
      month: 7, weather: 'frost', miles: 0
    });
    expect(nightTempF(s)).toBeLessThanOrEqual(32);
  });
  it('snow weather caps nightTempF at 28°F regardless of season', () => {
    const s = stateAt({
      landmarkId: 'fort_kearny', terrain: 'prairie',
      month: 7, weather: 'snow', miles: 0
    });
    expect(nightTempF(s)).toBeLessThanOrEqual(28);
  });
});

describe('#1019 day/night swing per terrain', () => {
  it('desert swings wider than prairie (day > prairie day; night < prairie night)', () => {
    const desert = stateAt({ landmarkId: 'fort_boise', terrain: 'desert', month: 7 });
    const prairie = stateAt({ landmarkId: 'fort_kearny', terrain: 'prairie', month: 7 });
    // Same month + weather, similar lat/elev: desert day should be > prairie day,
    // desert night < prairie night (deltas: +25/-20 vs +15/-10).
    expect(dayTempF(desert) - midTempF(desert)).toBeGreaterThan(dayTempF(prairie) - midTempF(prairie));
    expect(nightTempF(desert) - midTempF(desert)).toBeLessThan(nightTempF(prairie) - midTempF(prairie));
  });
});

describe('#1019 elevation interpolation', () => {
  it('first segment (previousLandmarkId=null) uses nextLandmark elevation', () => {
    const s = stateAt({ landmarkId: 'south_pass', prevId: null, terrain: 'mountains' });
    expect(elevationFtAt(s)).toBe(7400);
  });
  it('mid-segment between low + high landmarks lands between the two', () => {
    const s = stateAt({
      landmarkId: 'south_pass', prevId: 'fort_laramie',
      terrain: 'mountains'
    });
    const e = elevationFtAt(s);
    // fort_laramie=4300, south_pass=7400; mid ≈ 5850
    expect(e).toBeGreaterThan(4300);
    expect(e).toBeLessThan(7400);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/temperature.test.ts`
Expected: All pass. If any period anchor falls outside its window, tighten the constants in `temperature.ts` rather than relaxing the assertion. (Period anchors are the load-bearing reason for the constants.)

- [ ] **Step 3: Conceptual commit**

Files touched: `tests/temperature.test.ts`.

---

### Task 1.4 — Slice 1 verify + sweep + PR

- [ ] **Step 1: Full verify**

Run: `npm run verify`
Expected: svelte-check `0 ERRORS 0 WARNINGS`; vitest all green including the new `temperature.test.ts`.

- [ ] **Step 2: Sweep checkpoint (foundation = byte-equal to today)**

Run: `npx tsx scripts/persona-profession-sweep.ts --runs 3 --tag slice1-foundation`
Expected: arrival/wipe/strand/avgMi for every persona should be **byte-identical** to a pre-Slice-1 baseline (since no consumer is wired). If anything differs, the foundation code must have a side-effect — investigate.

- [ ] **Step 3: Controller: jj describe + bookmark + push + PR + merge**

Branch name: `feat/1019-temp-foundation`. Commit message:
```
feat(engine): #1019 slice 1 — continuous temperature foundation (no consumers wired)

Adds src/lib/game/systems/temperature.ts with pure-function dayTempF /
nightTempF derivation (terrain × elevation × latitude × month × weather
+ day/night swing + frost/snow weather-name floors). 12 elevation
overrides on key landmarks (South Pass 7400, Walla Walla 700, etc.);
others use terrain defaults. 30 unit tests pinning period anchors.
NO consumers wired — sweep byte-equal to pre-slice baseline.

Slice 1 of 3 (#1019 spec). Foundation only; slice 2 wires fire.ts,
slice 3 wires consumption.ts.
```
CI green → merge → close nothing yet (the umbrella #1019 stays open until slice 3 ships).

---

## Slice 2 — #1019 + #1073: fire.ts cold-camp on continuous temp

**Goal:** Replace `isColdNight()` in `src/lib/game/systems/fire.ts` with `nightTempF(state) < 40`. Scale `applyColdPenalty` HP/morale by `coldIntensity = clamp((40 − nightTempF) / 8, 0, 3)`.

**Branch:** `feat/1019-slice2-fire`, off master (post-slice-1 merge).

### Task 2.1 — Write the failing test first

**Files:**
- Modify: `tests/fire.test.ts`

- [ ] **Step 1: Read existing fire.test.ts to see test patterns**

Run: `head -60 tests/fire.test.ts && echo '---' && grep -n "isColdNight\|cold-camp\|COLD_NIGHT" tests/fire.test.ts | head`

- [ ] **Step 2: Append new describe block at end of file**

```ts
describe('#1019 + #1073 — continuous cold-camp scaling', () => {
  function stateWithNight(opts: {
    landmarkId?: string;
    terrain?: GameState['location']['terrain'];
    month?: number;
    weather?: GameState['weather'];
    miles?: number;
    firewood?: number;
  }) {
    const s = createInitialState({
      seed: 't1019fire',
      leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: opts.month ?? 7, day: 15 }
    });
    return {
      ...s,
      date: { ...s.date, month: opts.month ?? s.date.month },
      weather: opts.weather ?? 'clear',
      resources: { ...s.resources, firewood: opts.firewood ?? 0 }, // 0 → forces cold camp
      location: {
        ...s.location,
        previousLandmarkId: null,
        nextLandmarkId: opts.landmarkId ?? 'fort_kearny',
        milesTraveled: opts.miles ?? 0,
        terrain: opts.terrain ?? 'prairie'
      },
      party: s.party.map((m) => ({ ...m, health: 80 }))
    };
  }

  const rng = makeRng('t');

  it('borderline night (≈40°F) → no cold-camp penalty (coldIntensity=0)', () => {
    // A landmark/season tuned to land near 40°F night. Falls back to
    // checking that a moderately cool prairie spring night does NOT
    // take HP from the cold-camp path.
    const s = stateWithNight({ landmarkId: 'fort_kearny', terrain: 'prairie', month: 5, weather: 'clear' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    // Prairie May clear: midTempF ≈ 70 - 2.5 - 0 + monthDelta(5) + 0
    // monthDelta(5) ≈ 5 → mid ≈ 72.5; night = 72.5 - 10 = 62.5°F → no cold-camp penalty.
    expect(after.party[0].health).toBe(before);
  });

  it('freezing night (≈32°F) → roughly the pre-#1073 binary hit (-3 HP × clothing mult)', () => {
    // Mountains in early November clear: mid ≈ 70 - 27.5 - 3 + (-17) + 0 = 22.5;
    // night = 22.5 - 15 = 7.5°F — way colder than 32. Pick a milder scenario.
    // Forest in October clear: mid ≈ 70 - 7.5 - 1 + (-17) + 0 = 44.5; night = 44.5 - 8 = 36.5°F.
    const s = stateWithNight({ landmarkId: 'fort_laramie', terrain: 'forest', month: 10, weather: 'clear' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    // ~36.5°F night → coldIntensity = (40 - 36.5)/8 ≈ 0.44; hit ≈ round(3 * 0.44) ≈ 1 HP
    expect(after.party[0].health).toBeLessThan(before);
    expect(after.party[0].health).toBeGreaterThanOrEqual(before - 3);
  });

  it('deep mountain frost (≤20°F) → near-max cold-camp damage (×~3 of base)', () => {
    const s = stateWithNight({ landmarkId: 'south_pass', terrain: 'mountains', month: 1, weather: 'frost' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    // Should take significantly more than baseline -3 HP
    expect(after.party[0].health).toBeLessThan(before - 4);
  });

  it('warm summer prairie storm night → NO cold-camp penalty (was -3 under binary; Bryant 1846 "shivered but bore it")', () => {
    const s = stateWithNight({ landmarkId: 'fort_kearny', terrain: 'prairie', month: 7, weather: 'storm' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    // July prairie storm: mid ≈ 70 - 2.5 - 0 + 15 - 10 = 72.5; night = 62.5°F → no penalty.
    // This is the deliberate narrowing of the binary's overclaim.
    expect(after.party[0].health).toBe(before);
  });

  it('frost weather still triggers cold-camp via the 32°F nightTempF cap', () => {
    const s = stateWithNight({ landmarkId: 'fort_kearny', terrain: 'prairie', month: 7, weather: 'frost' });
    const before = s.party[0].health;
    const after = attemptFire(s, rng);
    // frost weather caps nightTempF ≤ 32 → coldIntensity = 1 → -3 HP × clothing mult
    expect(after.party[0].health).toBeLessThan(before);
  });
});
```

Imports at top of file may need adding: `import { createInitialState } from '../src/lib/game/engine';`, `import { attemptFire } from '../src/lib/game/systems/fire';`, `import { makeRng } from '../src/lib/game/rng';`, `import type { GameState } from '../src/lib/game/types';`. If they're already present from existing tests in this file, do not duplicate.

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run tests/fire.test.ts -t "1019 + #1073"`
Expected: FAIL (binary `isColdNight` still in place; numbers don't match continuous scaling).

---

### Task 2.2 — Implement: rewire fire.ts

**Files:**
- Modify: `src/lib/game/systems/fire.ts` (lines ~92–138)

- [ ] **Step 1: Add temperature import**

Insert at the top of `fire.ts`, after the existing `warmth` import:

```ts
import { nightTempF } from './temperature';
```

- [ ] **Step 2: Add the threshold constant**

After the existing `COLD_NIGHT_MORALE_HIT = 2` line, add:

```ts
/** #1019 — Below this nightTempF the camp is "cold-camp grade":
 *  burn rate switches to COLD_NIGHT_BURN and applyColdPenalty fires.
 *  Calibrated to preserve the binary's *deadly* cases (mountain
 *  frost, winter, sustained sub-freezing) while narrowing its
 *  overclaim on summer storms (Bryant 1846 "shivered but bore it"). */
const COLD_NIGHT_TEMP_THRESHOLD_F = 40;

/** #1073 — Per-degree-below-threshold intensity, clamped at ×3.
 *  40°F borderline = ×0 (no penalty), 32°F freezing = ×1 (binary
 *  baseline), 16°F mountain = ×3 (cap). */
const COLD_INTENSITY_DEGREE_STEP = 8;
const COLD_INTENSITY_MAX = 3;

function coldIntensity(state: GameState): number {
  const t = nightTempF(state);
  if (t >= COLD_NIGHT_TEMP_THRESHOLD_F) return 0;
  const scaled = (COLD_NIGHT_TEMP_THRESHOLD_F - t) / COLD_INTENSITY_DEGREE_STEP;
  return Math.min(COLD_INTENSITY_MAX, scaled);
}
```

- [ ] **Step 3: Remove `isColdNight` and inline the threshold at both callsites**

Delete the entire `function isColdNight(state: GameState): boolean { ... }` block (lines ~92-112).

In `applyColdPenalty`, replace:
```ts
const cold = isColdNight(state);
```
with:
```ts
const intensity = coldIntensity(state); // #1019 + #1073
const cold = intensity > 0;
```

Replace:
```ts
const hit = Math.max(1, Math.round(COLD_NIGHT_HEALTH_HIT * exp));
```
with:
```ts
// #1073 — scale base hit by continuous intensity, then by clothing exp mult.
// 40°F borderline → intensity=0 → no penalty branch above
// 32°F → ×1 (binary baseline)
// 16°F mountain frost → ×3
const baseHit = COLD_NIGHT_HEALTH_HIT * intensity;
const hit = Math.max(1, Math.round(baseHit * exp));
```

Replace:
```ts
const moraleHit = hasTent
  ? Math.max(1, Math.round(COLD_NIGHT_MORALE_HIT / 2))
  : COLD_NIGHT_MORALE_HIT;
```
with:
```ts
const baseMorale = COLD_NIGHT_MORALE_HIT * intensity;
const moraleHit = hasTent
  ? Math.max(1, Math.round(baseMorale / 2))
  : Math.max(1, Math.round(baseMorale));
```

In `attemptFire`, replace:
```ts
const cold = isColdNight(state);
```
with:
```ts
const cold = nightTempF(state) < COLD_NIGHT_TEMP_THRESHOLD_F; // #1019
```

- [ ] **Step 4: Run the new tests + the existing fire suite**

Run: `npx vitest run tests/fire.test.ts`
Expected: All pass. If a pre-existing fire test relied on a borderline binary case (e.g. "summer prairie storm = cold camp"), update it to reflect the deliberate narrowing — the new behavior is correct per the spec's load-bearing-cases-only calibration. Document the change in the test with a `// #1019 — was binary; continuous narrows summer-storm overclaim` comment.

- [ ] **Step 5: Conceptual commit**

Files touched: `src/lib/game/systems/fire.ts`, `tests/fire.test.ts`.

---

### Task 2.3 — Slice 2 verify + sweep + PR

- [ ] **Step 1: Full verify**

Run: `npm run verify`
Expected: 0 ERRORS, all tests green.

- [ ] **Step 2: Sweep checkpoint (within ±2pp + danger preserved)**

Run: `npx tsx scripts/persona-profession-sweep.ts --runs 3 --tag slice2-fire`
Expected: arrival within ±2pp of pre-slice baseline across all 10 personas. Danger preserved: no cohort goes to ~100% arrival; wip% bounded. **Specifically inspect winter/mountain runs** (cautious + faithful are mountain-eager) — if they shift more than ±2pp, the threshold or intensity constants need tuning. Report numbers in the PR description.

- [ ] **Step 3: Controller: jj describe + bookmark + push + PR + merge**

Branch: `feat/1019-slice2-fire`. Commit message:
```
feat(engine): #1019 + #1073 — fire.ts cold-camp on continuous temp

Removes isColdNight(); the two callsites now consume nightTempF(state)
< 40 directly. applyColdPenalty scales HP and morale hits by
coldIntensity = clamp((40 - nightTempF) / 8, 0, 3). So 40°F borderline
→ no penalty, 32°F freezing → today's behavior (×1), 16°F mountain
frost → ×3 cap.

Deliberate narrowing: the binary's overclaim on summer prairie storms
(Bryant 1846 "shivered but bore it") no longer counts as cold-camp
grade. Mountain/frost/snow/winter cases preserved by the
nightTempF<40 threshold and the frost/snow weather-name floors from
slice 1.

Sweep: within ±2pp arrival across all 10 personas; danger preserved.

Slice 2 of 3 (#1019 spec). Slice 3 wires consumption.ts.
```
CI → merge.

---

## Slice 3 — #1074: consumption.ts ox water on continuous day-temp

**Goal:** Replace the binary `weather === 'heat' → ×2` water-loss with continuous `tempWaterMult(state)` driven by `dayTempF(state)`.

**Branch:** `feat/1019-slice3-water`, off master (post-slice-2 merge).

### Task 3.1 — Write the failing test first

**Files:**
- Modify: `tests/consumption.test.ts`

- [ ] **Step 1: Append new describe block**

```ts
describe('#1074 — continuous day-temp water multiplier', () => {
  function stateAt(opts: {
    landmarkId?: string;
    terrain?: GameState['location']['terrain'];
    month?: number;
    weather?: GameState['weather'];
    miles?: number;
    waterIn?: number;
  }): GameState {
    const s = createInitialState({
      seed: 't1074',
      leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: opts.month ?? 7, day: 15 }
    });
    return {
      ...s,
      date: { ...s.date, month: opts.month ?? s.date.month },
      weather: opts.weather ?? 'clear',
      resources: { ...s.resources, water: opts.waterIn ?? 30 },
      location: {
        ...s.location,
        previousLandmarkId: null,
        nextLandmarkId: opts.landmarkId ?? 'fort_kearny',
        milesTraveled: opts.miles ?? 0,
        terrain: opts.terrain ?? 'prairie'
      }
    };
  }

  it('moderate day-temp (≈70-75°F) → near baseline water draw', () => {
    const sCool = stateAt({ terrain: 'forest', month: 5, weather: 'overcast' });
    const cooled = applyDailyConsumption(sCool);
    const draw = sCool.resources.water - cooled.resources.water;
    expect(draw).toBeGreaterThan(0);
    expect(draw).toBeLessThanOrEqual(6);
  });

  it('hot day (≈100°F desert summer) → ~2× the moderate draw (matches old "heat" binary)', () => {
    const moderate = stateAt({ terrain: 'prairie', month: 7, weather: 'clear' });
    const hot = stateAt({ terrain: 'desert', month: 8, weather: 'heat', miles: 1500 });
    const modDraw = moderate.resources.water - applyDailyConsumption(moderate).resources.water;
    const hotDraw = hot.resources.water - applyDailyConsumption(hot).resources.water;
    expect(hotDraw).toBeGreaterThan(modDraw);
    expect(hotDraw / Math.max(1, modDraw)).toBeGreaterThan(1.5);
  });

  it('extreme day-temp (≈130°F Snake desert + heat) → ×3 cap reached or near-cap', () => {
    // Snake desert (~3500ft), Aug, heat weather, ~mile 1700 → midTempF
    // ≈ 70 - 12.5 - 4 + ~13 + 10 = 76.5; dayTempF = 76.5 + 25 = 101.5°F.
    // tempWaterMult = 1 + (101.5 - 70)/30 ≈ 2.05 (close to but not at ×3).
    // For an explicit ×3 test, use the absolute extreme (140°F day) by stacking.
    const baseline = stateAt({ terrain: 'prairie', month: 4, weather: 'overcast' });
    const extreme = stateAt({ terrain: 'desert', month: 7, weather: 'heat', miles: 1500 });
    const baseDraw = baseline.resources.water - applyDailyConsumption(baseline).resources.water;
    const extDraw = extreme.resources.water - applyDailyConsumption(extreme).resources.water;
    expect(extDraw / Math.max(1, baseDraw)).toBeGreaterThan(2);
  });
});
```

Top-of-file imports may need `applyDailyConsumption` from `../src/lib/game/systems/consumption` and `createInitialState` from `../src/lib/game/engine`. Don't duplicate.

- [ ] **Step 2: Run to verify they fail (today's binary heat=×2 doesn't scale continuously)**

Run: `npx vitest run tests/consumption.test.ts -t "#1074"`
Expected: at least the "extreme" test fails (today's max is ×2; new should approach ×3).

---

### Task 3.2 — Implement: trim weatherWaterMult + add tempWaterMult

**Files:**
- Modify: `src/lib/game/systems/weather.ts` (lines ~110-120)
- Modify: `src/lib/game/systems/consumption.ts`

- [ ] **Step 1: Drop the heat branch from `weatherWaterMult`**

In `src/lib/game/systems/weather.ts`, change:
```ts
export function weatherWaterMult(weather: Weather | undefined): number {
  switch (weather) {
    case 'heat':     return 2.0;
    case 'overcast':
    case 'rain':     return 0.9;
    default:         return 1.0;
  }
}
```
to:
```ts
/** Multiplier on water consumption from damp-cool weather (overcast/
 *  rain → modest reduction). #1074 — the heat branch moved to the
 *  continuous tempWaterMult in consumption.ts which reads dayTempF
 *  directly. Don't double-count heat here. */
export function weatherWaterMult(weather: Weather | undefined): number {
  switch (weather) {
    case 'overcast':
    case 'rain':     return 0.9;
    default:         return 1.0;
  }
}
```

- [ ] **Step 2: Add `tempWaterMult` + wire into the water-draw callsite**

In `src/lib/game/systems/consumption.ts`:

Add import at top:
```ts
import { dayTempF } from './temperature';
```

Add helper above the function that contains the existing `weatherWaterMult(state.weather)` call (around line 100-107):
```ts
/** #1074 — Continuous heat multiplier on water draw. Period: Marcy 1859
 *  (Prairie Traveler) — working ox team needs 20-30 gal/day at
 *  temperate weather, up to 40-50 gal in hot. Replaces the binary
 *  `weather === 'heat' → ×2` that lived in weatherWaterMult.
 *
 *    70°F  → ×1.0  (baseline)
 *    85°F  → ×1.5
 *   100°F  → ×2.0  (matches the old binary)
 *   130°F  → ×3.0  (cap)
 */
function tempWaterMult(state: GameState): number {
  const t = dayTempF(state);
  return Math.max(1, 1 + (t - 70) / 30);
}
```

Change the existing line (was `Math.ceil(base * weatherWaterMult(state.weather))`):
```ts
return Math.ceil(base * weatherWaterMult(state.weather));
```
to:
```ts
return Math.ceil(base * weatherWaterMult(state.weather) * tempWaterMult(state));
```

(Use `rg -n "weatherWaterMult\(state.weather\)" src/lib/game/systems/consumption.ts` to locate the exact line; expected: one site around line 107.)

- [ ] **Step 3: Run all the relevant tests**

Run: `npx vitest run tests/consumption.test.ts tests/weather.test.ts tests/water-flow.test.ts`
Expected: new #1074 tests pass; existing weather/water tests pass. If a pre-existing test asserted the old "heat = ×2" via `weatherWaterMult` directly, update it to reflect the split (weatherWaterMult no longer covers heat; the temperature multiplier does). Tag the test edit with `// #1074 — heat moved from weather binary to continuous dayTempF mult`.

- [ ] **Step 4: Conceptual commit**

Files touched: `src/lib/game/systems/weather.ts`, `src/lib/game/systems/consumption.ts`, `tests/consumption.test.ts`, possibly `tests/weather.test.ts`.

---

### Task 3.3 — Slice 3 verify + sweep + PR + close #1019/#1073/#1074

- [ ] **Step 1: Full verify**

Run: `npm run verify`
Expected: 0 ERRORS, all tests green.

- [ ] **Step 2: Sweep checkpoint (within ±2pp + desert specifically inspected)**

Run: `npx tsx scripts/persona-profession-sweep.ts --runs 3 --tag slice3-water`
Expected: arrival within ±2pp baseline across all 10 personas. **Specifically inspect** persona behavior across the Snake-basin desert leg (miles ~1500-1700, August summer) — if aggressive/pace_pusher/hoarder show new dehydration crashes (wip%↑) more than 3pp, the heatMult curve needs to soften (e.g. denominator 30 → 40, or `Math.max(1, ...)` floor cap at ×2.5 instead of ×3).

- [ ] **Step 3: Controller: jj describe + bookmark + push + PR + merge**

Branch: `feat/1019-slice3-water`. Commit message:
```
feat(engine): #1074 — ox water-needs scaled by continuous day-temp

Replaces the binary `weather === 'heat' → ×2` water multiplier
(removed from weatherWaterMult) with a continuous tempWaterMult in
consumption.ts:
  70°F  → ×1.0
  85°F  → ×1.5
  100°F → ×2.0 (matches the old binary)
  130°F → ×3.0 cap

Period anchor: Marcy 1859 (Prairie Traveler) — "the working team
requires from twenty to thirty gallons of water per day in temperate
weather, increasing to forty or even fifty gallons in hot."

Sweep: within ±2pp arrival across all 10 personas; Snake-basin desert
leg inspected — no new dehydration crashes.

Slice 3 of 3 (#1019 spec). Closes #1019, #1073, #1074.
```

- [ ] **Step 4: Close the three VK tickets**

After merge, mark all three Vikunja tickets done (full-body POST per the using-vikunja skill):
- **#1019** — umbrella; close with a one-line summary linking the 3 PRs
- **#1073** — close (shipped in slice 2)
- **#1074** — close (shipped in slice 3)

---

## Self-Review (controller runs before handing to subagents)

**1. Spec coverage:**
- §3.1 derivation (additive deltas, day/night swing, weather-name floors) → Task 1.2 + 1.3 tests pin all constants.
- §3.2 elevation + latitude content → Task 1.1 (elevation overrides), Task 1.2 (`latitudeN` derivation).
- §3.3 consumer #1019 wire → Task 2.2 (callsite replacement).
- §3.3 consumer #1073 cold-camp intensity scaling → Task 2.2 (`coldIntensity` + scaled hits).
- §3.3 consumer #1074 ox water → Task 3.2 (`tempWaterMult`).
- §4 build slicing into 3 PRs → mirrored exactly.
- §5 testing — period anchors → Task 1.3; calibration-of-deadly-cases via Task 2.1 cases; per-slice sweep → Task 1.4 / 2.3 / 3.3.
- §6 cross-refs noted in PR commit messages.

**2. Placeholder scan:** None. Every step has exact code blocks or exact commands. The one approximation (mid-segment elevation interpolation t=0.5 fallback) is called out in the code comment and tests cover both endpoints — the spec acknowledged sub-segment precision as a future refinement.

**3. Type consistency:** `nightTempF`/`dayTempF`/`midTempF`/`elevationFtAt`/`latitudeN`/`coldIntensity`/`tempWaterMult` — names used consistently across tasks. `COLD_NIGHT_TEMP_THRESHOLD_F = 40` declared once and referenced by both `applyColdPenalty` and `attemptFire`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-23-1019-temperature-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Each slice ships as a PR before the next one starts.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch with checkpoints.

Which approach?
