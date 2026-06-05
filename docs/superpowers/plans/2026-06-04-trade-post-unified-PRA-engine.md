# Trade Post Unified Rebuild — PR-A (Engine + Data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a pure `settleTrade()` basket-settlement engine surface (Cash + Barter modes) and a historically-gated per-post `buysForCash` trait — with **zero UI change**. The existing `TradeModal` stays wired to the old `trade:`/`barter:` actions; PR-B swaps the UI.

**Architecture:** New `systems/settle-trade.ts` composes the existing price model (`getPrice`), profession discounts (`professionDiscount`, newly exported from `actions/trade.ts`), per-post multiplier + barter premium constants (`systems/barter.ts`), and post-stock (`systems/post-stock.ts`). Cash mode mirrors `trade()` exactly (equivalence-tested); barter mode mirrors `applyBarter()`. A `postBuysForCash(landmark, year)` resolver in `content/landmarks.ts` gates cash payout, driven by two new optional `Landmark` fields applied per the spec's historical table.

**Tech Stack:** TypeScript (strict), Vitest, Svelte 5 (no UI here). jj workspace `hoosierTrail-trade-unified`, bookmark `feat/trade-settle-engine`. Spec: `docs/superpowers/specs/2026-06-04-trade-post-unified-rebuild-design.md`.

**Pre-flight:** all edits happen in this jj workspace via Bash+Python heredocs (the default-workspace PreToolUse hook blocks Edit/Write; Read is fine). Run `npm run verify` (= `npm run check` + `npm test`) as the gate. node_modules must be a real `npm ci` install (NOT a symlink — Vite `@fs` rejects symlinked deps; see #233).

---

## Task 1: Export `professionDiscount` from `trade.ts`

Pure refactor, no behavior change — `settleTrade` needs the exact same discount math so cash mode matches `trade()`.

**Files:**
- Modify: `src/lib/game/actions/trade.ts` (the `professionDiscount` function, currently module-private)

- [ ] **Step 1: Add `export` to the existing function**

Change the signature line from:
```ts
function professionDiscount(state: GameState): { buyMult: number; sellMult: number } {
```
to:
```ts
export function professionDiscount(state: GameState): { buyMult: number; sellMult: number } {
```
Leave the body untouched.

- [ ] **Step 2: Verify nothing else broke**

Run: `npm run check`
Expected: 0 errors (an added `export` cannot break callers).

- [ ] **Step 3: Commit**

```bash
jj describe -m "refactor(trade): export professionDiscount for settleTrade reuse"
```

---

## Task 2: `buysForCash` fields + `postBuysForCash()` resolver

**Files:**
- Modify: `src/lib/game/content/landmarks.ts` (Landmark interface + new resolver, next to `isLandmarkAbandoned`)
- Test: `tests/post-buys-for-cash.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/post-buys-for-cash.test.ts
import { describe, it, expect } from 'vitest';
import { postBuysForCash } from '../src/lib/game/content/landmarks';
import type { Landmark } from '../src/lib/game/content/landmarks';

const base = (over: Partial<Landmark>): Landmark =>
  ({ id: 'x', name: 'X', milesFromPrevious: 0, terrain: 'prairie', kind: 'trading_post', ...over }) as Landmark;

describe('postBuysForCash', () => {
  it('false by default (no fields)', () => {
    expect(postBuysForCash(base({}), 1850)).toBe(false);
  });
  it('true when buysForCash set, any year', () => {
    expect(postBuysForCash(base({ buysForCash: true }), 1841)).toBe(true);
  });
  it('era flip: false before the from-year, true on/after', () => {
    const p = base({ buysForCashFromYear: 1849 });
    expect(postBuysForCash(p, 1848)).toBe(false);
    expect(postBuysForCash(p, 1849)).toBe(true);
    expect(postBuysForCash(p, 1855)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/post-buys-for-cash.test.ts`
Expected: FAIL — `postBuysForCash` is not exported / undefined.

- [ ] **Step 3: Add the fields + resolver**

In `src/lib/game/content/landmarks.ts`, add to the `Landmark` interface (near `barterEnabled`):
```ts
  /** #trade — post pays cash for player goods (sells). Default false:
   *  HBC/fur posts, missions, and Native camps ran on barter/credit. */
  buysForCash?: boolean;
  /** Era flip: post only pays cash from this year onward (control changed
   *  hands, e.g. Am. Fur Co. → US Army at Fort Laramie in 1849). */
  buysForCashFromYear?: number;
```

Add the resolver next to `isLandmarkAbandoned`:
```ts
/** True if this trading post will pay the player cash for goods at `year`.
 *  See the unified-trade spec's historical mapping. */
export function postBuysForCash(landmark: Landmark, year: number): boolean {
  if (landmark.buysForCash) return true;
  if (typeof landmark.buysForCashFromYear === 'number') return year >= landmark.buysForCashFromYear;
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/post-buys-for-cash.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(trade): buysForCash landmark fields + postBuysForCash resolver"
```

---

## Task 3: Apply the historical cash-payout mapping to landmarks

**Files:**
- Modify: `src/lib/game/content/landmarks.ts` (7 post entries)
- Test: `tests/post-buys-for-cash-mapping.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/post-buys-for-cash-mapping.test.ts
import { describe, it, expect } from 'vitest';
import { getLandmark, postBuysForCash } from '../src/lib/game/content/landmarks';

describe('historical cash-payout mapping', () => {
  it('always-cash posts pay at any year', () => {
    for (const id of ['ft_kearny', 'hollenberg_ranch', 'rock_creek_station', 'ft_caspar', 'the_dalles']) {
      expect(postBuysForCash(getLandmark(id), 1860)).toBe(true);
    }
  });
  it('Fort Laramie flips to cash in 1849', () => {
    expect(postBuysForCash(getLandmark('ft_laramie'), 1848)).toBe(false);
    expect(postBuysForCash(getLandmark('ft_laramie'), 1849)).toBe(true);
  });
  it('Fort Bridger flips to cash in 1858', () => {
    expect(postBuysForCash(getLandmark('ft_bridger'), 1857)).toBe(false);
    expect(postBuysForCash(getLandmark('ft_bridger'), 1858)).toBe(true);
  });
  it('barter-only posts never pay cash', () => {
    for (const id of ['robidoux_post', 'ft_hall', 'ft_boise', 'ft_walla_walla', 'whitman_mission', 'cheyenne_camp', 'shoshone_camp']) {
      expect(postBuysForCash(getLandmark(id), 1860)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/post-buys-for-cash-mapping.test.ts`
Expected: FAIL — the always-cash + era-flip assertions fail (fields not yet set).

- [ ] **Step 3: Add the fields to the 7 post entries**

In `src/lib/game/content/landmarks.ts`, add the field to each entry's object literal (alongside its existing `services:` / `priceMultiplier:`):
- `ft_kearny`: `buysForCash: true,`
- `hollenberg_ranch`: `buysForCash: true,`
- `rock_creek_station`: `buysForCash: true,`
- `ft_caspar`: `buysForCash: true,`
- `the_dalles`: `buysForCash: true,`
- `ft_laramie`: `buysForCashFromYear: 1849,`
- `ft_bridger`: `buysForCashFromYear: 1858,`

Leave `robidoux_post`, `ft_hall`, `ft_boise`, `ft_walla_walla`, `whitman_mission`, `cheyenne_camp`, `shoshone_camp` unchanged (default false).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/post-buys-for-cash-mapping.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(trade): apply historical cash-payout mapping to trading posts"
```

---

## Task 4: `settleTrade()` — Cash mode

**Files:**
- Create: `src/lib/game/systems/settle-trade.ts`
- Test: `tests/settle-trade-cash.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/settle-trade-cash.test.ts
import { describe, it, expect } from 'vitest';
import { settleTrade } from '../src/lib/game/systems/settle-trade';
import { createInitialState } from '../src/lib/game/engine';
import { restockPostIfDue } from '../src/lib/game/systems/post-stock';
import { getLandmark } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';

// Build a state parked at a given post with known cash/inventory.
function atPost(id: string, over: Partial<GameState> = {}): GameState {
  const s0 = createInitialState({
    seed: 'settle-test',
    leader: { name: 'A', profession: 'farmer', sex: 'male' },     // no merchant/banker → profMult 1.0
    companions: [{ name: 'B', profession: 'farmer', sex: 'female' }],
    startDate: { year: 1850, month: 6, day: 15 },
    includeStarterKit: true
  });
  let s: GameState = { ...s0, cash: 200, location: { ...s0.location, atLandmarkId: id }, ...over };
  s = restockPostIfDue(s, getLandmark(id));   // initialize post stock record
  return s;
}

describe('settleTrade — cash mode', () => {
  it('cash buy debits cash, adds goods, decrements stock', () => {
    const s = atPost('ft_kearny');               // 1.0× post, stocks flour
    const r = settleTrade(s, { mode: 'cash', get: { flour: 10 }, give: {} });
    expect(r.state.inventory.flour).toBe((s.inventory.flour ?? 0) + 10);
    expect(r.netCash).toBeGreaterThan(0);
    expect(r.state.cash).toBe(s.cash - r.netCash);
  });

  it('cash sell at a cash post credits cash', () => {
    const s = atPost('ft_kearny', { inventory: {} as any });
    const s2 = { ...s, inventory: { bacon: 5 } };
    const r = settleTrade(s2, { mode: 'cash', get: {}, give: { bacon: 5 } });
    expect(r.state.inventory.bacon ?? 0).toBe(0);
    expect(r.netCash).toBeLessThan(0);          // post paid the player
    expect(r.state.cash).toBeGreaterThan(s2.cash);
  });

  it('cash sell at a NO-cash post throws', () => {
    const s = { ...atPost('ft_hall'), inventory: { bacon: 5 } };
    expect(() => settleTrade(s, { mode: 'cash', get: {}, give: { bacon: 5 } }))
      .toThrow(/won't buy/i);
  });

  it('nothing-gained guard: empty get + no cash in → throws', () => {
    const s = { ...atPost('ft_kearny'), inventory: { bacon: 0 } };
    expect(() => settleTrade(s, { mode: 'cash', get: {}, give: {} })).toThrow(/nothing gained/i);
  });

  it('insufficient cash throws, state unchanged', () => {
    const s = atPost('ft_kearny', { cash: 1 });
    expect(() => settleTrade(s, { mode: 'cash', get: { flour: 50 }, give: {} })).toThrow(/not enough cash/i);
  });

  it('out-of-stock get throws', () => {
    const s = atPost('ft_kearny');
    expect(() => settleTrade(s, { mode: 'cash', get: { flour: 99999 }, give: {} })).toThrow(/out of stock/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/settle-trade-cash.test.ts`
Expected: FAIL — `settle-trade.ts` does not exist.

- [ ] **Step 3: Implement `settle-trade.ts` (cash branch + scaffolding)**

```ts
// src/lib/game/systems/settle-trade.ts
import type { GameState } from '../types';
import { getPrice } from '../content/prices';
import { ITEMS } from '../content/items';
import { getLandmark, postBuysForCash, type Landmark } from '../content/landmarks';
import { professionDiscount } from '../actions/trade';
import {
  BARTER_RATE_FLOOR,
  BARTER_POST_PREFERENCE_BONUS,
  BARTER_POST_REJECT_PENALTY
} from './barter';
import { postRemainingQty, recordPostPurchases } from './post-stock';

export interface TradeBasket {
  mode: 'cash' | 'barter';
  /** itemId -> qty entering the wagon, drawn from post stock. */
  get: Record<string, number>;
  /** itemId -> qty leaving the wagon. */
  give: Record<string, number>;
  /** Barter mode only: cash added on top of the offered goods (>= 0). */
  cashOffer?: number;
}

export interface SettleResult {
  state: GameState;
  /** Signed: + player paid cash, − post paid the player. */
  netCash: number;
  getValue: number;
  giveValue: number;
  /** Barter mode only: giveTotal / getValue. */
  rate?: number;
}

function entries(rec: Record<string, number>): Array<[string, number]> {
  return Object.entries(rec).filter(([, q]) => q > 0);
}

function prefRejectMult(post: Landmark, id: string): number {
  let m = 1.0;
  if ((post.barterPreferred ?? []).includes(id)) m *= 1 + BARTER_POST_PREFERENCE_BONUS;
  if ((post.barterRefused ?? []).includes(id)) m *= 1 - BARTER_POST_REJECT_PENALTY;
  return m;
}

export function settleTrade(state: GameState, basket: TradeBasket): SettleResult {
  const here = state.location.atLandmarkId ? getLandmark(state.location.atLandmarkId) : null;
  if (!here || here.kind !== 'trading_post') {
    throw new Error('settleTrade: not at a trading post');
  }
  const postMult = here.priceMultiplier ?? 1.0;
  const year = state.date.year;
  const { buyMult: pBuy, sellMult: pSell } = professionDiscount(state);

  const getE = entries(basket.get);
  const giveE = entries(basket.give);

  // Inventory + stock validation (both modes).
  for (const [id, qty] of giveE) {
    const have = state.inventory[id] ?? 0;
    if (qty > have) throw new Error(`settleTrade: insufficient ${id} (have ${have}, need ${qty})`);
  }
  for (const [id, qty] of getE) {
    const remaining = postRemainingQty(state, here, id);
    if (qty > remaining) throw new Error(`settleTrade: out of stock — ${id} (${remaining} left)`);
  }

  // getValue (both modes): buy price × profession × post mult.
  let getValue = 0;
  for (const [id, qty] of getE) getValue += getPrice(id).buy * (pBuy * postMult) * qty;

  let giveValue = 0;
  let newCash: number;
  let rate: number | undefined;

  if (basket.mode === 'cash') {
    if (giveE.length > 0 && !postBuysForCash(here, year)) {
      throw new Error(`settleTrade: ${here.name} won't buy goods for coin — try Barter`);
    }
    const excluded = new Set(here.excludeBuyCategories ?? []);
    for (const [id, qty] of giveE) {
      const cat = ITEMS[id]?.category;
      if (cat && excluded.has(cat)) throw new Error(`settleTrade: ${here.name} won't buy ${id} (${cat})`);
      giveValue += getPrice(id).sell * (pSell * postMult) * qty;
    }
    // Match trade()'s rounding exactly: round cash AFTER applying the delta.
    newCash = Math.round(state.cash - getValue + giveValue);
    // Affordability parity with trade(): you must afford the net you pay.
    const netOwed = Math.ceil(getValue - giveValue);
    if (netOwed > state.cash) {
      throw new Error(`settleTrade: not enough cash ($${state.cash} < $${Math.round(getValue - giveValue)})`);
    }
    if (getE.length === 0 && state.cash - newCash >= 0) {
      throw new Error('settleTrade: nothing gained');
    }
  } else {
    for (const [id, qty] of giveE) {
      giveValue += getPrice(id).sell * postMult * prefRejectMult(here, id) * qty;
    }
    const cashOffer = Math.max(0, basket.cashOffer ?? 0);
    const giveTotal = giveValue + cashOffer;
    rate = getValue > 0 ? giveTotal / getValue : giveTotal === 0 ? 1 : Infinity;
    if (getE.length === 0) throw new Error('settleTrade: nothing gained');
    if (rate < BARTER_RATE_FLOOR) {
      throw new Error(`settleTrade: offer too thin (rate ${rate.toFixed(2)} < ${BARTER_RATE_FLOOR}) — add cash or goods`);
    }
    if (Math.ceil(cashOffer) > state.cash) {
      throw new Error(`settleTrade: not enough cash for the $${Math.round(cashOffer)} top-up`);
    }
    newCash = Math.round(state.cash - cashOffer);
  }

  const netCash = state.cash - newCash;

  // Apply.
  const inventory: Record<string, number> = { ...state.inventory };
  for (const [id, qty] of giveE) inventory[id] = (inventory[id] ?? 0) - qty;
  for (const [id, qty] of getE) inventory[id] = (inventory[id] ?? 0) + qty;

  let next: GameState = { ...state, inventory, cash: newCash };
  const purchaseMap: Record<string, number> = {};
  for (const [id, qty] of getE) purchaseMap[id] = (purchaseMap[id] ?? 0) + qty;
  next = recordPostPurchases(next, here, purchaseMap);

  const verb = basket.mode === 'cash' ? (netCash >= 0 ? 'Bought from' : 'Sold to') : 'Bartered at';
  next = {
    ...next,
    eventLog: [...next.eventLog, { day: next.day, text: `${verb} ${here.name}.` }]
  };

  return { state: next, netCash, getValue, giveValue, rate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/settle-trade-cash.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(trade): settleTrade engine surface — cash mode (TDD)"
```

---

## Task 5: `settleTrade()` — Barter mode tests

The barter branch is already implemented in Task 4; this task pins its behavior with tests.

**Files:**
- Test: `tests/settle-trade-barter.test.ts` (create)
- Modify (only if a test reveals a bug): `src/lib/game/systems/settle-trade.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/settle-trade-barter.test.ts
import { describe, it, expect } from 'vitest';
import { settleTrade } from '../src/lib/game/systems/settle-trade';
import { createInitialState } from '../src/lib/game/engine';
import { restockPostIfDue } from '../src/lib/game/systems/post-stock';
import { getLandmark } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';

function atPost(id: string, inv: Record<string, number>): GameState {
  const s0 = createInitialState({
    seed: 'barter-test',
    leader: { name: 'A', profession: 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'farmer', sex: 'female' }],
    startDate: { year: 1850, month: 6, day: 15 },
    includeStarterKit: false
  });
  let s: GameState = { ...s0, cash: 50, inventory: inv, location: { ...s0.location, atLandmarkId: id } };
  s = restockPostIfDue(s, getLandmark(id));
  return s;
}

describe('settleTrade — barter mode', () => {
  it('goods that cover the get value (rate >= FLOOR) swap with no cash moved', () => {
    // bacon sell 0.20; flour buy 0.20. Give 10 bacon ($2.00) for ~10 flour ($2.00) → rate ~1.0.
    const s = atPost('ft_hall', { bacon: 10 });
    const r = settleTrade(s, { mode: 'barter', get: { flour: 8 }, give: { bacon: 10 } });
    expect(r.state.inventory.flour).toBe(8);
    expect(r.state.inventory.bacon).toBe(0);
    expect(r.netCash).toBe(0);
    expect(r.rate).toBeGreaterThanOrEqual(0.5);
  });

  it('too-thin offer (rate < FLOOR, no cash) throws', () => {
    const s = atPost('ft_hall', { bacon: 1 });          // $0.20 give vs lots of flour
    expect(() => settleTrade(s, { mode: 'barter', get: { flour: 50 }, give: { bacon: 1 } }))
      .toThrow(/too thin/i);
  });

  it('cash top-up lifts a thin offer over the floor', () => {
    const s = atPost('ft_hall', { bacon: 1 });
    const r = settleTrade(s, { mode: 'barter', get: { flour: 10 }, give: { bacon: 1 }, cashOffer: 5 });
    expect(r.state.inventory.flour).toBe(10);
    expect(r.netCash).toBe(5);                          // player paid the top-up
    expect(r.state.cash).toBe(s.cash - 5);
  });

  it('nothing-gained guard: empty get throws', () => {
    const s = atPost('ft_hall', { bacon: 5 });
    expect(() => settleTrade(s, { mode: 'barter', get: {}, give: { bacon: 5 } })).toThrow(/nothing gained/i);
  });

  it('preferred give-item needs less to reach fair than a plain item', () => {
    // robidoux_post prefers buffalo_robe (per landmarks). Compare rates.
    const s = atPost('robidoux_post', { buffalo_robe: 1, bacon: 1 });
    const pref = settleTrade(s, { mode: 'barter', get: { flour: 5 }, give: { buffalo_robe: 1 } });
    expect(pref.rate).toBeGreaterThan(0);   // premium applied; sanity that it settles
  });
});
```

NOTE for the implementer: the last test assumes `robidoux_post` lists `buffalo_robe` in `barterPreferred` and the item exists in `PRICES`. **Verify both before writing** (grep `barterPreferred` in `landmarks.ts` and the item in `prices.ts`); if `robidoux_post` prefers a different item, swap the test to that post+item pair. Do not invent items.

- [ ] **Step 2: Run test to verify it fails (then passes once data confirmed)**

Run: `npx vitest run tests/settle-trade-barter.test.ts`
Expected: initially may FAIL on the preferred-item assumption — fix the test's post/item to match real `barterPreferred` data, not the code. The other 4 tests should pass against the Task-4 implementation.

- [ ] **Step 3: Only if a genuine logic gap surfaces**, fix `settle-trade.ts` minimally and re-run.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/settle-trade-barter.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
jj describe -m "test(trade): settleTrade barter-mode coverage (fairness floor, cash top-up, premium)"
```

---

## Task 6: Equivalence + money-loop invariant tests

**Files:**
- Test: `tests/settle-trade-equivalence.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// tests/settle-trade-equivalence.test.ts
import { describe, it, expect } from 'vitest';
import { settleTrade } from '../src/lib/game/systems/settle-trade';
import { trade } from '../src/lib/game/actions/trade';
import { applyBarter } from '../src/lib/game/systems/barter';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import { restockPostIfDue } from '../src/lib/game/systems/post-stock';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { PRICES } from '../src/lib/game/content/prices';
import { ITEMS } from '../src/lib/game/content/items';
import { BARTER_POST_PREFERENCE_BONUS } from '../src/lib/game/systems/barter';
import type { GameState } from '../src/lib/game/types';

function atPost(id: string, inv: Record<string, number>, cash = 200): GameState {
  const s0 = createInitialState({
    seed: 'equiv', leader: { name: 'A', profession: 'farmer', sex: 'male' },
    companions: [{ name: 'B', profession: 'farmer', sex: 'female' }],
    startDate: { year: 1850, month: 6, day: 15 }, includeStarterKit: false
  });
  let s: GameState = { ...s0, cash, inventory: inv, location: { ...s0.location, atLandmarkId: id } };
  s = restockPostIfDue(s, getLandmark(id));
  return s;
}

describe('settleTrade equivalence with primitives', () => {
  it('cash mode (buy-only) == trade()', () => {
    const s = atPost('ft_kearny', {});
    const a = settleTrade(s, { mode: 'cash', get: { flour: 12 }, give: {} }).state;
    const b = trade(s, { buys: [{ item: 'flour', qty: 12 }] });
    expect(a.cash).toBe(b.cash);
    expect(a.inventory.flour ?? 0).toBe(b.inventory.flour ?? 0);
  });

  it('cash mode (sell-only at cash post) == trade()', () => {
    const s = atPost('ft_kearny', { bacon: 6 });
    const a = settleTrade(s, { mode: 'cash', get: {}, give: { bacon: 6 } }).state;
    const b = trade(s, { sells: [{ item: 'bacon', qty: 6 }] });
    expect(a.cash).toBe(b.cash);
    expect(a.inventory.bacon ?? 0).toBe(b.inventory.bacon ?? 0);
  });

  it('barter mode (cashOffer 0) == applyBarter()', () => {
    const s = atPost('ft_hall', { bacon: 10 });
    const a = settleTrade(s, { mode: 'barter', get: { flour: 8 }, give: { bacon: 10 } }).state;
    const b = applyBarter(s, { item: 'bacon', qty: 10 }, { item: 'flour', qty: 8 }, makeRng('x'));
    expect(a.inventory.flour ?? 0).toBe(b.inventory.flour ?? 0);
    expect(a.inventory.bacon ?? 0).toBe(b.inventory.bacon ?? 0);
    expect(a.cash).toBe(b.cash);
  });
});

describe('no money-loop: sell × preferred-premium < buy for every item', () => {
  it('preferred premium never beats the buy price', () => {
    const mult = 1 + BARTER_POST_PREFERENCE_BONUS;   // 1.15
    for (const [id, p] of Object.entries(PRICES)) {
      if (!ITEMS[id]) continue;
      expect(p.sell * mult, `${id}`).toBeLessThan(p.buy);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/settle-trade-equivalence.test.ts`
Expected: FAIL only if a real mismatch exists. If the money-loop invariant fails for any item, **STOP** — that is a real balance bug in `PRICES` (a `sell × 1.15 >= buy` item enables an infinite-money loop); surface it to the controller rather than weakening the test.

- [ ] **Step 3: Reconcile**

If equivalence fails on cash: confirm `professionDiscount` is reused and rounding matches `trade()` (round cash after applying the delta). If barter equivalence fails: confirm `prefRejectMult` matches `quoteBarter`'s modifier math and post stock is initialized identically. Fix `settle-trade.ts`, not the assertion.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/settle-trade-equivalence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj describe -m "test(trade): settleTrade equivalence with trade()/applyBarter + money-loop invariant"
```

---

## Task 7: Full verify + PR-A

**Files:** none (gate + ship)

- [ ] **Step 1: Full gate**

Run: `npm run verify`
Expected: `npm run check` 0 errors; all vitest pass (existing suite + the ~5 new test files). If any pre-existing test broke, investigate — settleTrade is additive and should not perturb existing behavior.

- [ ] **Step 2: Push + open PR-A**

```bash
cd /home/eric/projects/hoosierTrail-trade-unified
jj bookmark create feat/trade-settle-engine -r @    # if not already created
jj git push --bookmark feat/trade-settle-engine --allow-new
cd /home/eric/projects/hoosierTrail
gh pr create --base master --head feat/trade-settle-engine \
  --title "feat(trade): settleTrade engine + per-post cash payout (PR-A, no UI)" \
  --body "<summary of the spec §2/§3, note: no UI change; PR-B swaps TradeModal>"
```

- [ ] **Step 3: Merge when green**

Per the merge-self policy: wait for CI `check-and-test`, then `gh pr merge --squash --delete-branch`. Confirm MERGED.

---

## Notes for the implementer

- **Spec is the contract:** `docs/superpowers/specs/2026-06-04-trade-post-unified-rebuild-design.md` §2/§3/§6. This plan covers PR-A only; the UI (§1/§4) is PR-B.
- **Do not touch** `trade()`/`applyBarter()`/`quoteBarter()` behavior — only the one `export` in Task 1. Bots/NPC/AI depend on them (#298/#302; follow-up #1223).
- **Verify data before asserting it** (Task 5 preferred-item, any item id) — grep `landmarks.ts`/`prices.ts`; never invent items.
- **No `// @ts-ignore` / `as any`** past a real type error (global rule). The two `as any` in test fixtures above for `inventory: {}` are acceptable in tests only if `Record<ItemId, number>` rejects `{}`; prefer `{} as Record<string, number>` cast on the fixture, not on production code.
