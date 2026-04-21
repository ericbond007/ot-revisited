# Plan 3a: Content Catalogs & Profession Bonuses — Hoosier Trail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Plan 2a/b stubs with production content: 13 professions each with their starting gear and passive-bonus wiring into the systems that read them; the full item catalog used by every existing system and action; the full ~31-stop trail from Independence to Oregon City (replacing the 3-stop stub). After this plan, `createInitialState` produces a proper party with correct starter gear and a full journey can be traced end-to-end on the real map.

**Architecture:** Content stays in `src/lib/game/content/` as plain TypeScript data. Profession bonuses are implemented as *predicate helpers* (e.g., `hasLiveFarmer(state) => boolean`) living in a new `src/lib/game/professions/` module, so systems call the predicate rather than string-matching on `profession === 'farmer'`. This centralizes the bonus logic and makes new professions additive. The existing item-and-price stubs in `content/prices.ts` expand; the landmark stub in `content/landmarks.ts` expands.

**Tech Stack:** Same as prior plans.

**Companion spec:** §6 (professions) · §7 (items) · §8 (trail) of `docs/superpowers/specs/2026-04-20-hoosier-trail-design.md`. Plan 2a/b established the passive-tick + action systems that Plan 3a now fully populates.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/game/content/professions.ts` | Catalog of 13 professions: id, name, starter gear, passive bonus summary (data-only) |
| `src/lib/game/professions/predicates.ts` | Live-profession predicates (`hasLiveDoctor`, `hasLiveFarmer`, etc.) + `aliveOf(state, id)` |
| `src/lib/game/content/items.ts` | Full item catalog: id, name, category, stacking rules, flag for "is food" |
| `src/lib/game/content/starter-kit.ts` | Base kit + profession-gear union logic (consumed by `createInitialState`) |
| `tests/professions-catalog.test.ts` | Catalog integrity (13 entries, valid ids, gear keys in item catalog) |
| `tests/professions-predicates.test.ts` | Predicate behavior (live vs dead, multiple of same profession) |
| `tests/items-catalog.test.ts` | Catalog integrity (every referenced item exists, no orphans) |
| `tests/starter-kit.test.ts` | Kit assembly produces expected inventory given a party composition |
| `tests/landmarks-full.test.ts` | Full trail integrity (31 stops, monotonic mileage, end reachable) |

### Files modified

| Path | Change |
|---|---|
| `src/lib/game/content/landmarks.ts` | Expand from 3 to ~31 stops per spec §8 |
| `src/lib/game/content/prices.ts` | Expand to cover every catalog item |
| `src/lib/game/engine.ts` | `createInitialState` uses `buildStarterKit(opts)` from starter-kit.ts |
| `src/lib/game/systems/consumption.ts` | Replace hard-coded `FOOD_DRAW_ORDER` with `items.ts` food flag lookup |
| `src/lib/game/systems/morale.ts` | Same — replace `FOOD_KEYS` with catalog-driven food lookup |
| `src/lib/game/systems/water-purity.ts` | Uses `hasLiveDoctor` predicate instead of string-matching |
| `src/lib/game/actions/rest.ts` | Uses `hasLiveFarmer` predicate |
| `src/lib/game/actions/camp.ts` | Same |
| `src/lib/game/actions/hunt.ts` | Uses `hasLiveHunter` / `hasLiveGunsmith` predicates |
| `src/lib/game/actions/trade.ts` | Uses `hasLiveMerchant` / `hasLiveBanker` predicates |

### Boundaries
- Content files export only data + lookup helpers (no state-dependent logic).
- `professions/predicates.ts` is the only place that reads `state.party[].profession`. Everything else goes through the predicates.
- The item catalog is the source of truth for what's a "food item" (used by consumption drawdown order and morale famine check).
- Starter-kit composition is a pure function of `(leaderPick, companions)` — no RNG, no DB.

---

## Task 1: Item catalog + food flag refactor

**Files:**
- Create: `src/lib/game/content/items.ts`
- Create: `tests/items-catalog.test.ts`
- Modify: `src/lib/game/systems/consumption.ts` — draw food order from catalog
- Modify: `src/lib/game/systems/morale.ts` — famine check from catalog

Per spec §7. Item entries are data. Systems that care about "is this a food?" read `items.ts`.

### Step 1: Failing catalog tests

Create `tests/items-catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ITEMS, getItem, foodItemIds } from '../src/lib/game/content/items';

const REQUIRED_FOOD_IDS = ['flour', 'bacon', 'beans', 'hardtack', 'sugar', 'coffee', 'tea', 'dried_fruit', 'pemmican'];

describe('item catalog', () => {
  it('includes every required food id', () => {
    const foods = foodItemIds();
    for (const id of REQUIRED_FOOD_IDS) {
      expect(foods).toContain(id);
    }
  });

  it('includes core non-food items', () => {
    const ids = Object.keys(ITEMS);
    ['wagon', 'ox', 'yoke', 'rifle', 'bullets', 'shovel', 'bible', 'quinine', 'laudanum', 'bandages'].forEach((id) => {
      expect(ids).toContain(id);
    });
  });

  it('every item has a name + category', () => {
    for (const item of Object.values(ITEMS)) {
      expect(item.name).toBeTruthy();
      expect(item.category).toBeTruthy();
    }
  });

  it('getItem throws for unknown ids', () => {
    expect(() => getItem('phlogiston')).toThrow();
  });

  it('foodItemIds returns only items flagged as food', () => {
    for (const id of foodItemIds()) {
      expect(ITEMS[id].category).toBe('food');
    }
  });
});
```

### Step 2: Implement items.ts

Create `src/lib/game/content/items.ts`:

```ts
// Item catalog. Item ids are plain strings — keep short, snake_case.

export type ItemCategory =
  | 'food'
  | 'livestock'
  | 'wagon_part'
  | 'weapon'
  | 'ammo'
  | 'clothing'
  | 'tool'
  | 'medicine'
  | 'comfort'
  | 'native_trade';

export interface ItemMeta {
  id: string;
  name: string;
  category: ItemCategory;
  weightLbPerUnit: number;  // lb per unit for carry-cap math (0 = abstract / no weight)
  foodDrawOrder?: number;   // lower = drawn first when consuming food
}

export const ITEMS: Record<string, ItemMeta> = {
  // Food (ordered: first-eaten listed first)
  flour:       { id: 'flour',       name: 'Flour',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 1 },
  beans:       { id: 'beans',       name: 'Beans',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 2 },
  bacon:       { id: 'bacon',       name: 'Bacon',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 3 },
  hardtack:    { id: 'hardtack',    name: 'Hardtack',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 4 },
  dried_fruit: { id: 'dried_fruit', name: 'Dried fruit',  category: 'food', weightLbPerUnit: 1, foodDrawOrder: 5 },
  pemmican:    { id: 'pemmican',    name: 'Pemmican',     category: 'food', weightLbPerUnit: 1, foodDrawOrder: 6 },
  sugar:       { id: 'sugar',       name: 'Sugar',        category: 'food', weightLbPerUnit: 1, foodDrawOrder: 7 },
  coffee:      { id: 'coffee',      name: 'Coffee',       category: 'food', weightLbPerUnit: 1 },
  tea:         { id: 'tea',         name: 'Tea',          category: 'food', weightLbPerUnit: 1 },

  // Livestock
  ox: { id: 'ox', name: 'Ox', category: 'livestock', weightLbPerUnit: 0 },
  yoke: { id: 'yoke', name: 'Yoke', category: 'livestock', weightLbPerUnit: 15 },

  // Wagon parts
  wagon:       { id: 'wagon',       name: 'Wagon',          category: 'wagon_part', weightLbPerUnit: 0 },
  wheel:       { id: 'wheel',       name: 'Spare wheel',    category: 'wagon_part', weightLbPerUnit: 50 },
  axle:        { id: 'axle',        name: 'Spare axle',     category: 'wagon_part', weightLbPerUnit: 60 },
  tongue:      { id: 'tongue',      name: 'Spare tongue',   category: 'wagon_part', weightLbPerUnit: 40 },
  canvas:      { id: 'canvas',      name: 'Canvas cover',   category: 'wagon_part', weightLbPerUnit: 30 },
  spare_plank: { id: 'spare_plank', name: 'Spare plank',    category: 'wagon_part', weightLbPerUnit: 8 },
  iron_scrap:  { id: 'iron_scrap',  name: 'Iron scrap',     category: 'wagon_part', weightLbPerUnit: 5 },

  // Weapons / ammo
  rifle: { id: 'rifle', name: 'Rifle', category: 'weapon', weightLbPerUnit: 10 },
  bullets: { id: 'bullets', name: 'Bullets', category: 'ammo', weightLbPerUnit: 0.1 },
  rifle_cleaning_kit: { id: 'rifle_cleaning_kit', name: 'Rifle cleaning kit', category: 'tool', weightLbPerUnit: 2 },

  // Clothing
  coat: { id: 'coat', name: 'Coat', category: 'clothing', weightLbPerUnit: 4 },
  boots: { id: 'boots', name: 'Boots', category: 'clothing', weightLbPerUnit: 3 },
  blanket: { id: 'blanket', name: 'Blanket', category: 'clothing', weightLbPerUnit: 5 },

  // Tools
  iron_toolkit: { id: 'iron_toolkit', name: 'Iron toolkit', category: 'tool', weightLbPerUnit: 20 },
  cookware: { id: 'cookware', name: 'Cookware', category: 'tool', weightLbPerUnit: 15 },
  rope: { id: 'rope', name: 'Rope', category: 'tool', weightLbPerUnit: 8 },
  shovel: { id: 'shovel', name: 'Shovel', category: 'tool', weightLbPerUnit: 5 },
  compass: { id: 'compass', name: 'Compass', category: 'tool', weightLbPerUnit: 0.5 },
  water_skin: { id: 'water_skin', name: 'Water skin', category: 'tool', weightLbPerUnit: 2 },
  ox_shoes: { id: 'ox_shoes', name: 'Ox shoes', category: 'tool', weightLbPerUnit: 2 },
  spyglass: { id: 'spyglass', name: 'Spyglass', category: 'tool', weightLbPerUnit: 2 },

  // Medicine
  quinine: { id: 'quinine', name: 'Quinine', category: 'medicine', weightLbPerUnit: 0.2 },
  laudanum: { id: 'laudanum', name: 'Laudanum', category: 'medicine', weightLbPerUnit: 0.2 },
  calomel: { id: 'calomel', name: 'Calomel', category: 'medicine', weightLbPerUnit: 0.2 },
  bandages: { id: 'bandages', name: 'Bandages', category: 'medicine', weightLbPerUnit: 1 },
  herbal_poultice: { id: 'herbal_poultice', name: 'Herbal poultice', category: 'medicine', weightLbPerUnit: 0.5 },
  patent_medicine: { id: 'patent_medicine', name: 'Patent medicine', category: 'medicine', weightLbPerUnit: 0.5 },

  // Comfort / morale
  tobacco: { id: 'tobacco', name: 'Tobacco', category: 'comfort', weightLbPerUnit: 1 },
  whiskey: { id: 'whiskey', name: 'Whiskey', category: 'comfort', weightLbPerUnit: 4 },
  harmonica: { id: 'harmonica', name: 'Harmonica', category: 'comfort', weightLbPerUnit: 0.2 },
  fiddle: { id: 'fiddle', name: 'Fiddle', category: 'comfort', weightLbPerUnit: 3 },
  bible: { id: 'bible', name: 'Bible', category: 'comfort', weightLbPerUnit: 2 },

  // Native trade goods
  moccasins: { id: 'moccasins', name: 'Moccasins', category: 'native_trade', weightLbPerUnit: 1 },
  buffalo_robe: { id: 'buffalo_robe', name: 'Buffalo robe', category: 'native_trade', weightLbPerUnit: 8 },
  beads: { id: 'beads', name: 'Trade beads / calico', category: 'native_trade', weightLbPerUnit: 2 }
};

export function getItem(id: string): ItemMeta {
  const i = ITEMS[id];
  if (!i) throw new Error(`Unknown item: ${id}`);
  return i;
}

// Returns food ids in drawdown order (lowest foodDrawOrder first).
export function foodItemIds(): string[] {
  return Object.values(ITEMS)
    .filter((i) => i.category === 'food' && typeof i.foodDrawOrder === 'number')
    .sort((a, b) => (a.foodDrawOrder! - b.foodDrawOrder!))
    .map((i) => i.id);
}
```

### Step 3: Update consumption.ts to use catalog

In `src/lib/game/systems/consumption.ts`, find the `FOOD_DRAW_ORDER` constant and replace the hard-coded list with a runtime lookup:

```ts
import { foodItemIds } from '../content/items';

// ... existing imports

// Remove the old FOOD_DRAW_ORDER constant.
// In applyDailyConsumption, call foodItemIds() once at function top.

export function applyDailyConsumption(state: GameState): GameState {
  const foodNeeded = foodConsumedToday(state);
  const waterNeeded = waterConsumedToday(state);

  const foodDrawOrder = foodItemIds();   // <-- from catalog

  const inventory = { ...state.inventory };
  let remaining = foodNeeded;
  for (const id of foodDrawOrder) {
    if (remaining <= 0) break;
    const have = inventory[id] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    inventory[id] = have - take;
    remaining -= take;
  }

  const resources = {
    ...state.resources,
    water: Math.max(0, state.resources.water - waterNeeded)
  };

  return { ...state, inventory, resources };
}
```

### Step 4: Update morale.ts famine check to use catalog

In `src/lib/game/systems/morale.ts`, replace `FOOD_KEYS` with the catalog:

```ts
import { foodItemIds } from '../content/items';

// Remove: const FOOD_KEYS = [...]

function totalFood(state: GameState): number {
  return foodItemIds().reduce((sum, k) => sum + (state.inventory[k] ?? 0), 0);
}
```

### Step 5: Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): add item catalog; drive food logic from catalog"
```

All existing tests (177) should still pass because the draw-down order from the catalog matches the previous hard-coded order (flour → beans → bacon → hardtack → dried_fruit → pemmican). Plus 5 new catalog tests = 182 total.

---

## Task 2: Profession predicates module

**Files:**
- Create: `src/lib/game/professions/predicates.ts`
- Create: `tests/professions-predicates.test.ts`

Centralizes `profession === 'X'` checks. Every system/action that conditions on profession now calls a predicate.

### Step 1: Failing tests

Create `tests/professions-predicates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  aliveOf,
  hasLive,
  hasLiveDoctor,
  hasLiveFarmer,
  hasLiveHunter,
  hasLiveGunsmith,
  hasLiveMerchant,
  hasLiveBanker,
  hasLivePreacher
} from '../src/lib/game/professions/predicates';
import { createInitialState } from '../src/lib/game/engine';

function game(leaderProfession: string, companionsProfession: string) {
  return createInitialState({
    seed: 'pred',
    leader: { name: 'A', profession: leaderProfession as never },
    companions: [{ name: 'B', profession: companionsProfession as never }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('hasLive<Profession>', () => {
  it('returns true when a matching member is alive', () => {
    const s = game('farmer', 'doctor');
    expect(hasLiveFarmer(s)).toBe(true);
    expect(hasLiveDoctor(s)).toBe(true);
  });

  it('returns false when a matching member is dead', () => {
    const s = game('farmer', 'doctor');
    s.party[0].dead = true;
    expect(hasLiveFarmer(s)).toBe(false);
    expect(hasLiveDoctor(s)).toBe(true);
  });

  it('returns false when no one has that profession', () => {
    const s = game('farmer', 'doctor');
    expect(hasLiveHunter(s)).toBe(false);
    expect(hasLiveGunsmith(s)).toBe(false);
  });
});

describe('aliveOf / hasLive (generic)', () => {
  it('aliveOf lists alive members of a profession', () => {
    const s = game('farmer', 'farmer');
    const farmers = aliveOf(s, 'farmer');
    expect(farmers).toHaveLength(2);
    s.party[1].dead = true;
    expect(aliveOf(s, 'farmer')).toHaveLength(1);
  });

  it('hasLive(state, id) is a generic predicate', () => {
    const s = game('merchant', 'banker');
    expect(hasLive(s, 'merchant')).toBe(true);
    expect(hasLive(s, 'banker')).toBe(true);
    expect(hasLive(s, 'scout')).toBe(false);
  });
});
```

### Step 2: Implement

Create `src/lib/game/professions/predicates.ts`:

```ts
import type { GameState, PartyMember, ProfessionId } from '../types';

export function aliveOf(state: GameState, id: ProfessionId): PartyMember[] {
  return state.party.filter((m) => !m.dead && m.profession === id);
}

export function hasLive(state: GameState, id: ProfessionId): boolean {
  return aliveOf(state, id).length > 0;
}

// Named convenience predicates — one per profession.
export const hasLiveBanker = (s: GameState) => hasLive(s, 'banker');
export const hasLiveFarmer = (s: GameState) => hasLive(s, 'farmer');
export const hasLiveCarpenter = (s: GameState) => hasLive(s, 'carpenter');
export const hasLiveDoctor = (s: GameState) => hasLive(s, 'doctor');
export const hasLiveBlacksmith = (s: GameState) => hasLive(s, 'blacksmith');
export const hasLiveHunter = (s: GameState) => hasLive(s, 'hunter');
export const hasLiveTeamster = (s: GameState) => hasLive(s, 'teamster');
export const hasLiveMerchant = (s: GameState) => hasLive(s, 'merchant');
export const hasLiveWhore = (s: GameState) => hasLive(s, 'whore');
export const hasLiveScout = (s: GameState) => hasLive(s, 'scout');
export const hasLivePreacher = (s: GameState) => hasLive(s, 'preacher');
export const hasLiveIndianTrader = (s: GameState) => hasLive(s, 'indian_trader');
export const hasLiveGunsmith = (s: GameState) => hasLive(s, 'gunsmith');
```

### Step 3: Refactor consumers

Update these files to use predicates instead of `profession === '...'`:

- `src/lib/game/systems/water-purity.ts` — `hasLiveDoctor(state)`
- `src/lib/game/actions/rest.ts` — `hasLiveFarmer(state)`
- `src/lib/game/actions/camp.ts` — `hasLiveFarmer(state)`
- `src/lib/game/actions/hunt.ts` — `hasLiveHunter(state)` and `hasLiveGunsmith(state)`
- `src/lib/game/actions/trade.ts` — `hasLiveMerchant(state)` and `hasLiveBanker(state)`

Each has a line like `const hasLiveFoo = state.party.some((m) => !m.dead && m.profession === 'foo')`. Replace with the predicate import.

### Step 4: Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "refactor(game): centralize profession checks into predicate helpers"
```

All existing tests still pass. No new behavior, just extraction. +6 new predicate tests.

---

## Task 3: Profession catalog

**Files:**
- Create: `src/lib/game/content/professions.ts`
- Create: `tests/professions-catalog.test.ts`

Data-only catalog describing each profession. Used by starter-kit assembly (Task 4) and by UI (Plan 4) to display bonus summaries.

### Step 1: Failing tests

Create `tests/professions-catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PROFESSIONS, getProfession } from '../src/lib/game/content/professions';
import { ITEMS } from '../src/lib/game/content/items';
import type { ProfessionId } from '../src/lib/game/types';

const EXPECTED: ProfessionId[] = [
  'banker', 'farmer', 'carpenter', 'doctor', 'blacksmith', 'hunter',
  'teamster', 'merchant', 'whore', 'scout', 'preacher', 'indian_trader', 'gunsmith'
];

describe('profession catalog', () => {
  it('has all 13 professions', () => {
    const ids = Object.keys(PROFESSIONS).sort();
    expect(ids).toEqual([...EXPECTED].sort());
  });

  it('every profession has a display name + bonus summary', () => {
    for (const p of Object.values(PROFESSIONS)) {
      expect(p.name).toBeTruthy();
      expect(p.bonusSummary).toBeTruthy();
    }
  });

  it('every starter-gear key exists in the item catalog (or is cash)', () => {
    for (const p of Object.values(PROFESSIONS)) {
      for (const g of p.starterGear) {
        if (g.item === 'cash') continue;
        expect(ITEMS[g.item]).toBeDefined();
      }
    }
  });

  it('getProfession throws for unknown id', () => {
    // @ts-expect-error - wrong id
    expect(() => getProfession('astronaut')).toThrow();
  });

  it('Whore profession is female-only', () => {
    const w = getProfession('whore');
    expect(w.femaleOnly).toBe(true);
  });
});
```

### Step 2: Implement

Create `src/lib/game/content/professions.ts`:

```ts
import type { ProfessionId } from '../types';

export interface StarterGearEntry {
  item: string;  // item id OR 'cash' for cash bonus
  qty: number;   // dollars for cash; units otherwise
}

export interface ProfessionMeta {
  id: ProfessionId;
  name: string;
  bonusSummary: string;
  starterGear: StarterGearEntry[];
  femaleOnly?: boolean;
}

export const PROFESSIONS: Record<ProfessionId, ProfessionMeta> = {
  banker: {
    id: 'banker',
    name: 'Banker',
    bonusSummary: 'Starts with extra cash. −10% buy / +10% sell at posts. Halves cash loss from theft events.',
    starterGear: [{ item: 'cash', qty: 800 }]
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    bonusSummary: '−5% food consumed/day. Auto-forages at rest/camp.',
    starterGear: [{ item: 'flour', qty: 100 }]
  },
  carpenter: {
    id: 'carpenter',
    name: 'Carpenter',
    bonusSummary: 'Wagon repairs faster and use fewer spare parts.',
    starterGear: [
      { item: 'axle', qty: 2 },
      { item: 'wheel', qty: 2 }
    ]
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    bonusSummary: 'Lower disease onset, faster recovery. Safe buffalo-liver prep. Unlocks water boiling pre-1854.',
    starterGear: [
      { item: 'quinine', qty: 2 },
      { item: 'laudanum', qty: 4 },
      { item: 'bandages', qty: 4 }
    ]
  },
  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith',
    bonusSummary: 'Quality re-shoeing (2× duration). Salvages iron scrap from broken metal items.',
    starterGear: [
      { item: 'iron_toolkit', qty: 1 },
      { item: 'ox_shoes', qty: 10 }
    ]
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    bonusSummary: '+20% meat per hunt.',
    starterGear: [
      { item: 'rifle', qty: 1 },
      { item: 'bullets', qty: 30 }
    ]
  },
  teamster: {
    id: 'teamster',
    name: 'Teamster',
    bonusSummary: 'Oxen fatigue slower. Can re-shoe without a Blacksmith.',
    starterGear: [
      { item: 'ox', qty: 1 },
      { item: 'yoke', qty: 1 },
      { item: 'ox_shoes', qty: 4 }
    ]
  },
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    bonusSummary: '−15% buy / +20% sell at posts.',
    starterGear: [
      { item: 'tobacco', qty: 20 },
      { item: 'beads', qty: 30 }
    ]
  },
  whore: {
    id: 'whore',
    name: 'Whore',
    bonusSummary: '+15% morale floor. +1 morale per rest night. Earns $5–15 per trading-post stop. Picks up trail rumors.',
    femaleOnly: true,
    starterGear: [
      { item: 'cash', qty: 100 },
      { item: 'tobacco', qty: 5 },
      { item: 'whiskey', qty: 5 },
      { item: 'tea', qty: 10 }
    ]
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    bonusSummary: 'Reveals landmarks further ahead. Better river-ford outcomes. Weather prediction 1–2 days out.',
    starterGear: [
      { item: 'compass', qty: 1 },
      { item: 'water_skin', qty: 2 },
      { item: 'spyglass', qty: 1 }
    ]
  },
  preacher: {
    id: 'preacher',
    name: 'Preacher',
    bonusSummary: 'Reduces death morale hit. Camp service fires every camp (morale/health). Converts bad events to minor morale gains.',
    starterGear: [
      { item: 'bible', qty: 1 },
      { item: 'shovel', qty: 1 },
      { item: 'herbal_poultice', qty: 10 }
    ]
  },
  indian_trader: {
    id: 'indian_trader',
    name: 'Indian Trader',
    bonusSummary: 'Native encounters become tradeable vs hostile. Unlocks Native trade menu at select posts.',
    starterGear: [
      { item: 'beads', qty: 30 },
      { item: 'pemmican', qty: 2 }
    ]
  },
  gunsmith: {
    id: 'gunsmith',
    name: 'Gunsmith',
    bonusSummary: 'Rifles don’t fail in wet weather. +20% to Hunter’s yield (stacks). Better outcomes in defense events.',
    starterGear: [
      { item: 'rifle_cleaning_kit', qty: 1 },
      { item: 'bullets', qty: 15 },
      { item: 'rifle', qty: 1 }
    ]
  }
};

export function getProfession(id: ProfessionId): ProfessionMeta {
  const p = PROFESSIONS[id];
  if (!p) throw new Error(`Unknown profession: ${id}`);
  return p;
}
```

### Step 3: Verify, commit

```bash
npm test -- tests/professions-catalog.test.ts
npm test
npm run check
git add -A
git commit -m "feat(game): add profession catalog (13 professions)"
```

---

## Task 4: Starter-kit assembly

**Files:**
- Create: `src/lib/game/content/starter-kit.ts`
- Create: `tests/starter-kit.test.ts`
- Modify: `src/lib/game/engine.ts` — `createInitialState` calls `buildStarterKit`

### Step 1: Failing tests

Create `tests/starter-kit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildStarterKit, BASE_KIT } from '../src/lib/game/content/starter-kit';

describe('starter kit', () => {
  it('BASE_KIT has wagon, oxen, cash, food, bullets, shovel, yoke', () => {
    expect(BASE_KIT.cash).toBeGreaterThan(0);
    expect(BASE_KIT.oxen).toBeGreaterThanOrEqual(4);
    expect(BASE_KIT.inventory.flour).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.bullets).toBeGreaterThan(0);
    expect(BASE_KIT.inventory.shovel).toBe(1);
    expect(BASE_KIT.inventory.yoke).toBe(1);
  });

  it('buildStarterKit stacks profession gear onto base', () => {
    const kit = buildStarterKit(['farmer']);
    // Farmer gives +100 flour on top of base
    expect(kit.inventory.flour).toBe((BASE_KIT.inventory.flour ?? 0) + 100);
    expect(kit.cash).toBe(BASE_KIT.cash); // Farmer has no cash modifier
  });

  it('banker adds starting cash', () => {
    const kit = buildStarterKit(['banker']);
    expect(kit.cash).toBe(BASE_KIT.cash + 800);
  });

  it('stacks duplicate professions', () => {
    const single = buildStarterKit(['farmer']);
    const double = buildStarterKit(['farmer', 'farmer']);
    expect(double.inventory.flour).toBe(single.inventory.flour + 100);
  });

  it('teamster adds an ox and a yoke', () => {
    const kit = buildStarterKit(['teamster']);
    expect(kit.oxen).toBe(BASE_KIT.oxen + 1);
    expect(kit.inventory.yoke).toBe(BASE_KIT.inventory.yoke + 1);
  });
});
```

### Step 2: Implement

Create `src/lib/game/content/starter-kit.ts`:

```ts
import type { ProfessionId } from '../types';
import { getProfession } from './professions';

export interface StarterKit {
  cash: number;
  oxen: number;                        // count of freshly-created oxen
  inventory: Record<string, number>;
}

export const BASE_KIT: StarterKit = {
  cash: 300,
  oxen: 4,
  inventory: {
    flour: 500,
    bullets: 20,
    shovel: 1,
    yoke: 1
  }
};

export function buildStarterKit(professions: ProfessionId[]): StarterKit {
  const inventory: Record<string, number> = { ...BASE_KIT.inventory };
  let cash = BASE_KIT.cash;
  let oxen = BASE_KIT.oxen;

  for (const id of professions) {
    const prof = getProfession(id);
    for (const entry of prof.starterGear) {
      if (entry.item === 'cash') {
        cash += entry.qty;
      } else if (entry.item === 'ox') {
        oxen += entry.qty;
      } else {
        inventory[entry.item] = (inventory[entry.item] ?? 0) + entry.qty;
      }
    }
  }

  return { cash, oxen, inventory };
}
```

### Step 3: Rewire createInitialState

In `src/lib/game/engine.ts`:

```ts
import { buildStarterKit } from './content/starter-kit';

// Inside createInitialState, replace the hard-coded inventory/cash/oxen:

export function createInitialState(opts: NewGameOptions): GameState {
  const size = 1 + opts.companions.length;
  if (size < 2) throw new Error('Party must have at least 2 adults.');
  if (size > 6) throw new Error('Party must have at most 6 adults.');

  const party: PartyMember[] = [
    makeMember(opts.leader, true, 0),
    ...opts.companions.map((c, i) => makeMember(c, false, i + 1))
  ];

  const professions = party.map((m) => m.profession);
  const kit = buildStarterKit(professions);
  const oxen = Array.from({ length: kit.oxen }, (_, i) => ({
    id: `ox-${i}`,
    health: 100,
    fatigue: 0,
    shod: true
  }));

  return {
    seed: opts.seed,
    day: 1,
    date: { ...opts.startDate },
    location: {
      trailPosition: 0,
      nextLandmarkId: 'ft_kearny',
      previousLandmarkId: null,
      milesTraveled: 0,
      terrain: 'prairie'
    },
    party,
    wagon: { condition: 100, carryCapacity: 2500 },
    oxen,
    inventory: kit.inventory,
    cash: kit.cash,
    resources: { water: 20, waterCap: 20 },
    morale: 70,
    pace: 'moderate',
    rations: 'normal',
    eventLog: [],
    flags: { hasBoilingKnowledge: false, hadFireLastNight: false },
    completed: false,
    outcome: 'in-progress'
  };
}
```

### Step 4: Fix any tests that now break

Several existing tests create a fresh game with `createInitialState` and assume no oxen were pre-created. That was Plan 1 behavior; Plan 3a gives every new party 4+ oxen from the base kit. Tests that **explicitly** pass custom oxen (Plan 2a/b test fixtures that do `return { ...s, oxen: [...] }`) will still work — they override the new default.

Tests that previously relied on `oxen: []` after createInitialState will fail. Find them and:
- If the test is checking oxen-empty behavior explicitly: leave it, but construct the state manually (`{ ...createInitialState(...), oxen: [] }`).
- If the test is just calling createInitialState without caring about oxen: assert updated expectations.

Run the suite to see what breaks, then adjust.

### Step 5: Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): starter kit assembly from professions + item catalog"
```

---

## Task 5: Full landmark catalog

**Files:**
- Modify: `src/lib/game/content/landmarks.ts` (replace 3-stop stub with ~31 stops)
- Create: `tests/landmarks-full.test.ts`

Per spec §8. Includes trading posts, landmarks, and rivers.

### Step 1: Failing tests

Create `tests/landmarks-full.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LANDMARKS } from '../src/lib/game/content/landmarks';

describe('full trail catalog', () => {
  it('has ~30+ stops', () => {
    expect(LANDMARKS.length).toBeGreaterThanOrEqual(30);
  });

  it('starts at Independence and ends at Oregon City', () => {
    expect(LANDMARKS[0].id).toBe('independence');
    expect(LANDMARKS[LANDMARKS.length - 1].id).toBe('oregon_city');
  });

  it('mileage totals ~2000 miles', () => {
    const total = LANDMARKS.reduce((sum, l) => sum + l.milesFromPrevious, 0);
    expect(total).toBeGreaterThan(1800);
    expect(total).toBeLessThan(2200);
  });

  it('every landmark has kind and terrain', () => {
    for (const l of LANDMARKS) {
      expect(l.kind).toBeTruthy();
      expect(l.terrain).toBeTruthy();
    }
  });

  it('includes the iconic stops', () => {
    const ids = LANDMARKS.map((l) => l.id);
    for (const id of [
      'ft_kearny', 'chimney_rock', 'ft_laramie', 'independence_rock',
      'south_pass', 'soda_springs', 'ft_hall', 'the_dalles', 'oregon_city'
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('includes river crossings', () => {
    const rivers = LANDMARKS.filter((l) => l.kind === 'river');
    expect(rivers.length).toBeGreaterThanOrEqual(5);
  });
});
```

### Step 2: Replace landmarks stub

Rewrite `src/lib/game/content/landmarks.ts`:

```ts
import type { Terrain } from '../types';

export interface Landmark {
  id: string;
  name: string;
  milesFromPrevious: number;
  terrain: Terrain;
  kind: 'start' | 'trading_post' | 'landmark' | 'river' | 'end';
}

// Mileage calibrated to historical ~2000-mile trail. Individual leg distances are
// approximate averages; they will be tuned during play-testing.
export const LANDMARKS: readonly Landmark[] = [
  { id: 'independence',        name: 'Independence, MO',    milesFromPrevious: 0,   terrain: 'prairie',   kind: 'start' },
  { id: 'kansas_river',        name: 'Kansas River',        milesFromPrevious: 110, terrain: 'river',     kind: 'river' },
  { id: 'alcove_spring',       name: 'Alcove Spring',       milesFromPrevious: 40,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'big_blue_river',      name: 'Big Blue River',      milesFromPrevious: 30,  terrain: 'river',     kind: 'river' },
  { id: 'ft_kearny',           name: 'Fort Kearny',         milesFromPrevious: 120, terrain: 'prairie',   kind: 'trading_post' },
  { id: 'ash_hollow',          name: 'Ash Hollow',          milesFromPrevious: 120, terrain: 'prairie',   kind: 'landmark' },
  { id: 'north_platte_1',      name: 'North Platte crossing (east)', milesFromPrevious: 60, terrain: 'river', kind: 'river' },
  { id: 'courthouse_rock',     name: 'Courthouse & Jail Rocks', milesFromPrevious: 70, terrain: 'prairie', kind: 'landmark' },
  { id: 'chimney_rock',        name: 'Chimney Rock',        milesFromPrevious: 25,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'scotts_bluff',        name: 'Scotts Bluff',        milesFromPrevious: 30,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'ft_laramie',          name: 'Fort Laramie',        milesFromPrevious: 50,  terrain: 'prairie',   kind: 'trading_post' },
  { id: 'register_cliff',      name: 'Register Cliff',      milesFromPrevious: 12,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'guernsey_ruts',       name: 'Guernsey Ruts',       milesFromPrevious: 5,   terrain: 'prairie',   kind: 'landmark' },
  { id: 'north_platte_2',      name: 'North Platte (west crossing)', milesFromPrevious: 75, terrain: 'river', kind: 'river' },
  { id: 'independence_rock',   name: 'Independence Rock',   milesFromPrevious: 80,  terrain: 'prairie',   kind: 'landmark' },
  { id: 'devils_gate',         name: "Devil's Gate",        milesFromPrevious: 6,   terrain: 'mountains', kind: 'landmark' },
  { id: 'sweetwater_1',        name: 'Sweetwater River ford', milesFromPrevious: 40, terrain: 'river',    kind: 'river' },
  { id: 'south_pass',          name: 'South Pass',          milesFromPrevious: 90,  terrain: 'mountains', kind: 'landmark' },
  { id: 'pacific_springs',     name: 'Pacific Springs',     milesFromPrevious: 5,   terrain: 'mountains', kind: 'landmark' },
  { id: 'green_river',         name: 'Green River crossing', milesFromPrevious: 90, terrain: 'river',    kind: 'river' },
  { id: 'ft_bridger',          name: 'Fort Bridger',        milesFromPrevious: 65,  terrain: 'mountains', kind: 'trading_post' },
  { id: 'bear_river',          name: 'Bear River crossing', milesFromPrevious: 100, terrain: 'river',     kind: 'river' },
  { id: 'soda_springs',        name: 'Soda Springs',        milesFromPrevious: 35,  terrain: 'mountains', kind: 'landmark' },
  { id: 'ft_hall',             name: 'Fort Hall',           milesFromPrevious: 70,  terrain: 'mountains', kind: 'trading_post' },
  { id: 'snake_three_island',  name: 'Three Island Crossing', milesFromPrevious: 150, terrain: 'river',   kind: 'river' },
  { id: 'ft_boise',            name: 'Fort Boise',          milesFromPrevious: 130, terrain: 'desert',    kind: 'trading_post' },
  { id: 'farewell_bend',       name: 'Farewell Bend',       milesFromPrevious: 95,  terrain: 'desert',    kind: 'landmark' },
  { id: 'blue_mountains',      name: 'Blue Mountains',      milesFromPrevious: 120, terrain: 'mountains', kind: 'landmark' },
  { id: 'ft_walla_walla',      name: 'Fort Walla Walla',    milesFromPrevious: 70,  terrain: 'mountains', kind: 'trading_post' },
  { id: 'the_dalles',          name: 'The Dalles',          milesFromPrevious: 100, terrain: 'mountains', kind: 'trading_post' },
  { id: 'laurel_hill',         name: 'Laurel Hill',         milesFromPrevious: 50,  terrain: 'mountains', kind: 'landmark' },
  { id: 'oregon_city',         name: 'Oregon City',         milesFromPrevious: 55,  terrain: 'forest',    kind: 'end' }
];

export function getLandmark(id: string): Landmark {
  const found = LANDMARKS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown landmark: ${id}`);
  return found;
}

export function nextLandmarkAfter(id: string): Landmark | null {
  const idx = LANDMARKS.findIndex((l) => l.id === id);
  if (idx < 0 || idx >= LANDMARKS.length - 1) return null;
  return LANDMARKS[idx + 1];
}
```

### Step 3: Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): expand landmark catalog to full 31-stop trail"
```

Existing `landmarks-stub.test.ts` (and any test that referenced `'chimney_rock'` specifically) should still pass — those ids all exist in the full catalog.

---

## Task 6: Price catalog expansion

**Files:**
- Modify: `src/lib/game/content/prices.ts` (expand to cover every item in catalog)

### Step 1: Tests

The existing `trade.test.ts` already tests price behavior. Instead of a new test, just extend prices.ts to cover every catalog item. Add a smoke check:

Append to `tests/items-catalog.test.ts` (created in Task 1):

```ts
import { PRICES } from '../src/lib/game/content/prices';

describe('prices cover the catalog', () => {
  it('every non-abstract item has a price entry', () => {
    // Abstract items (wagon, ox) don't need traditional prices — they're separately handled.
    const skipped = new Set(['wagon']);
    for (const [id, item] of Object.entries(ITEMS)) {
      if (skipped.has(id)) continue;
      if (item.category === 'livestock') continue; // ox is sold via a dedicated flow
      expect(PRICES[id], `missing price for ${id}`).toBeDefined();
    }
  });
});
```

### Step 2: Expand prices.ts

Update `src/lib/game/content/prices.ts` to include a full row for every catalog item (other than the `wagon` and `ox` abstract entries). Use spec §7.5 as a rough guide for relative costs — exact values will be tuned later:

```ts
export const PRICES: Record<string, PriceEntry> = {
  // Food
  flour:       { buy: 0.20, sell: 0.10 },
  beans:       { buy: 0.25, sell: 0.15 },
  bacon:       { buy: 0.40, sell: 0.30 },
  hardtack:    { buy: 0.15, sell: 0.08 },
  dried_fruit: { buy: 0.60, sell: 0.35 },
  pemmican:    { buy: 0.80, sell: 0.45 },
  sugar:       { buy: 0.35, sell: 0.20 },
  coffee:      { buy: 1.50, sell: 0.80 },
  tea:         { buy: 1.00, sell: 0.60 },

  // Livestock
  yoke:        { buy: 6.00, sell: 3.00 },

  // Wagon parts
  wheel:       { buy: 10.00, sell: 6.00 },
  axle:        { buy: 12.00, sell: 8.00 },
  tongue:      { buy: 8.00, sell: 5.00 },
  canvas:      { buy: 6.00, sell: 3.00 },
  spare_plank: { buy: 2.00, sell: 1.00 },
  iron_scrap:  { buy: 1.50, sell: 0.75 },

  // Weapons / ammo
  rifle:              { buy: 20.00, sell: 12.00 },
  bullets:            { buy: 2.00,  sell: 1.00 },
  rifle_cleaning_kit: { buy: 3.00,  sell: 1.50 },

  // Clothing
  coat:    { buy: 5.00, sell: 2.50 },
  boots:   { buy: 4.00, sell: 2.00 },
  blanket: { buy: 3.00, sell: 1.50 },

  // Tools
  iron_toolkit: { buy: 40.00, sell: 25.00 },
  cookware:     { buy: 8.00,  sell: 4.00 },
  rope:         { buy: 2.50,  sell: 1.20 },
  shovel:       { buy: 4.00,  sell: 2.00 },
  compass:      { buy: 8.00,  sell: 4.00 },
  water_skin:   { buy: 2.00,  sell: 1.00 },
  ox_shoes:     { buy: 1.00,  sell: 0.50 },
  spyglass:     { buy: 15.00, sell: 8.00 },

  // Medicine
  quinine:         { buy: 4.00, sell: 2.00 },
  laudanum:        { buy: 2.50, sell: 1.20 },
  calomel:         { buy: 2.00, sell: 1.00 },
  bandages:        { buy: 1.50, sell: 0.75 },
  herbal_poultice: { buy: 1.00, sell: 0.50 },
  patent_medicine: { buy: 3.00, sell: 1.50 },

  // Comfort / morale
  tobacco:   { buy: 1.00, sell: 0.50 },
  whiskey:   { buy: 2.50, sell: 1.20 },
  harmonica: { buy: 3.00, sell: 1.50 },
  fiddle:    { buy: 12.00, sell: 6.00 },
  bible:     { buy: 5.00, sell: 2.50 },

  // Native trade goods
  moccasins:    { buy: 3.00, sell: 1.50 },
  buffalo_robe: { buy: 8.00, sell: 4.00 },
  beads:        { buy: 0.50, sell: 0.25 }
};
```

Don't forget to `export { PRICES };` if it wasn't already exported, so the new test can import it.

### Step 3: Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "feat(game): expand price catalog to cover every item"
```

---

## Task 7: Cross-trail integration test

**Files:**
- Create: `tests/actions/trail-full.test.ts`

Prove that the full 31-stop trail can be traversed via travel + camp + rest without crashing (content-integration smoke test). Don't assert arrival at Oregon City — that's a tuning target, not a Plan 3a requirement. Just assert the game can tick for 200 days deterministically past several landmarks.

### Step 1: Write the test

Create `tests/actions/trail-full.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../../src/lib/game/engine';
import { camp } from '../../src/lib/game/actions/camp';
import { rest } from '../../src/lib/game/actions/rest';

function newGame() {
  return createInitialState({
    seed: 'trail',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' },
      { name: 'Sarah', profession: 'teamster' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('full-trail smoke', () => {
  it('a 4-person party survives 150 days of travel + camp + rest cycles', () => {
    let s = newGame();
    for (let cycle = 0; cycle < 30 && !s.completed; cycle++) {
      for (let d = 0; d < 4; d++) s = tickDay(s);
      s = camp(s, {});
      s = rest(s, 1);
    }
    // Not asserting Oregon City reach — that's a tuning target for Plan 3b/4.
    // But we should have moved far past Fort Kearny.
    expect(s.location.milesTraveled).toBeGreaterThan(500);
    // And the party should have at least one survivor.
    expect(s.party.some((m) => !m.dead)).toBe(true);
  });

  it('is deterministic across runs', () => {
    function run() {
      let s = newGame();
      for (let cycle = 0; cycle < 15; cycle++) {
        for (let d = 0; d < 4; d++) s = tickDay(s);
        s = camp(s, {});
        s = rest(s, 1);
      }
      return s;
    }
    expect(run()).toEqual(run());
  });
});
```

### Step 2: Verify, commit

```bash
npm test
npm run check
git add -A
git commit -m "test: full-trail smoke — 150-day deterministic run"
```

---

## Verification Checklist

- [ ] `npm test` all pass (177 + ~30 new = ~207+).
- [ ] `npm run check` 0 errors.
- [ ] `src/lib/game/content/` contains `items.ts`, `professions.ts`, `starter-kit.ts`, full `landmarks.ts`, full `prices.ts`, and the existing `conditions.ts`.
- [ ] `src/lib/game/professions/predicates.ts` shipped; systems and actions use predicates.
- [ ] `createInitialState` now produces inventory-from-professions via `buildStarterKit`.
- [ ] Full-trail smoke test runs 150 days without crashing.

---

## Handoff to Plan 3b

Plan 3b lands:
- The random event catalog (60–80 events) and firing from `tickDay`
- Year/month-gated events (1846+ Donner rumor, 1849+ Gold Rush, etc.)
- Native American encounter events that route through `hasLiveIndianTrader`
- Bandit / crime events
- Scurvy risk from low-fruit diet
- Health-boost events (hot springs, buffalo liver, patent medicine)
- Tuning pass on miles/day and pace so a reasonable party can reach Oregon City
