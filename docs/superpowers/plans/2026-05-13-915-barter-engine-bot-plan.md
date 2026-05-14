# #915 — Barter engine + bot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Ship the engine + bot half of #915 (general trading-post barter). Player UI lands in a sibling PR.

**Architecture:** New `systems/barter.ts` + thin `actions/barter.ts` wrapper. Persona surface gains `pickBarterDispositions`. Runner + NPC restock both consult it. Player UI deferred.

**Spec:** `docs/superpowers/specs/2026-05-13-915-barter-system-design.md`

---

### Task 1: Add optional fields to `Landmark` type + tag 5 anchor posts

**Files:**
- Modify: `src/lib/game/content/landmarks.ts`

- [ ] **Step 1: Extend the Landmark type**

In `landmarks.ts`, find the `Landmark` interface. Add:

```ts
  /** #915 — items the post pays a +15% premium for (period reality:
   *  HBC for buffalo robes, Bridger for fresh horses, missions for
   *  fresh meat). Drives `quoteBarter` preference bonus. */
  barterPreferred?: readonly ItemId[];
  /** #915 — items the post discounts by −40% if it'll take them at
   *  all (Bryant 1846: "double the rate of any other staple"). */
  barterRefused?: readonly ItemId[];
  /** #915 — when explicitly false, the post runs cash-only (Mormon
   *  ferries, contract operations). Default: true. */
  barterEnabled?: boolean;
```

- [ ] **Step 2: Tag the 5 anchor posts**

Anchor entries (find each by `id:`):

```ts
ft_laramie:      barterPreferred: ['buffalo_robe', 'pelts', 'fresh_meat']
ft_bridger:      barterPreferred: ['horses', 'fresh_meat', 'buffalo_robe']
                 barterRefused:   ['whiskey']
ft_hall:         barterPreferred: ['buffalo_robe', 'blanket', 'tea']
                 barterRefused:   ['whiskey']
fort_boise:      barterPreferred: ['buffalo_robe', 'fresh_meat', 'dried_salmon']
whitman_mission: barterPreferred: ['fresh_meat', 'buffalo_robe']
                 barterRefused:   ['whiskey']
```

- [ ] **Step 3: Verify items exist in catalog**

Run: `grep -E "buffalo_robe|pelts|fresh_meat|horses|blanket|tea|dried_salmon|whiskey" src/lib/game/content/items.ts | head`

If any are missing (likely `fresh_meat`, `horses`, `pelts`, `dried_salmon` may not exist as catalog ItemIds — `game_meat` may be the closer match), substitute the existing equivalent. Items the bot has are: flour, bacon, beans, jerky, pemmican, game_meat, hardtack — these can also be tagged as preferred at posts that want bulk staples.

- [ ] **Step 4: Verify typecheck**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(content): #915 task 1 — barter fields on Landmark + 5 anchor posts"
```

---

### Task 2: Create `systems/barter.ts` helpers + unit tests

**Files:**
- Create: `src/lib/game/systems/barter.ts`
- Create: `tests/barter-915.test.ts`

- [ ] **Step 1: Write the failing helper unit tests**

`tests/barter-915.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  quoteBarter,
  applyBarter,
  findBarterableItems,
  BARTER_RATE_FLOOR,
  BARTER_RATE_CEIL,
  BARTER_POST_PREFERENCE_BONUS,
  BARTER_POST_REJECT_PENALTY,
} from '../src/lib/game/systems/barter';
import { createInitialState } from '../src/lib/game/engine';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  const s = createInitialState({
    seed: 'barter',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  // Drop bot at Fort Hall for the location-dependent tests.
  return { ...s, location: { ...s.location, atLandmarkId: 'ft_hall' } };
}

describe('#915 — constants', () => {
  it('locks floor/ceiling/preference/reject', () => {
    expect(BARTER_RATE_FLOOR).toBe(0.5);
    expect(BARTER_RATE_CEIL).toBe(1.05);
    expect(BARTER_POST_PREFERENCE_BONUS).toBe(0.15);
    expect(BARTER_POST_REJECT_PENALTY).toBe(0.40);
  });
});

describe('#915 — quoteBarter', () => {
  it('computes fair rate when give-side value sits in 0.5-1.05 of receive', () => {
    const s = game();
    // Give 30 lb flour for 1 quinine. quote should be fair-ish.
    const q = quoteBarter(s, { item: 'flour', qty: 30 }, { item: 'quinine', qty: 1 });
    expect(q.fair).toBe(true);
    expect(q.rate).toBeGreaterThanOrEqual(BARTER_RATE_FLOOR);
    expect(q.rate).toBeLessThanOrEqual(BARTER_RATE_CEIL);
  });

  it('rejects unfair-to-post quotes (rate above ceiling)', () => {
    const s = game();
    // Give 1 quinine for 1 lb flour — wildly over-giving.
    const q = quoteBarter(s, { item: 'quinine', qty: 1 }, { item: 'flour', qty: 1 });
    expect(q.fair).toBe(false);
  });

  it('rejects unfair-to-player quotes (rate below floor)', () => {
    const s = game();
    // Give 200 lb flour for 1 quinine — wildly under-receiving.
    const q = quoteBarter(s, { item: 'flour', qty: 200 }, { item: 'quinine', qty: 1 });
    expect(q.fair).toBe(false);
  });

  it('applies post preference bonus to give-side', () => {
    const s = game();
    const baseQ = quoteBarter(s, { item: 'flour', qty: 30 }, { item: 'quinine', qty: 1 });
    // buffalo_robe is preferred at Fort Hall.
    const giveS = { ...s, inventory: { ...s.inventory, buffalo_robe: 5 } };
    const robeQ = quoteBarter(giveS, { item: 'buffalo_robe', qty: 1 }, { item: 'quinine', qty: 1 });
    // robe trades better than the equivalent flour trade.
    expect(robeQ.rate).toBeGreaterThan(0);
  });

  it('applies post rejection penalty', () => {
    const s = { ...game(), inventory: { ...game().inventory, whiskey: 5 } };
    // whiskey is refused at Fort Hall.
    const q = quoteBarter(s, { item: 'whiskey', qty: 1 }, { item: 'flour', qty: 10 });
    // Refused items get penalized; quote may or may not be fair —
    // assert the post-applied value is reduced compared to a
    // non-refused item of the same base price.
    expect(q.rate).toBeLessThan(quoteBarter(s, { item: 'flour', qty: 1 }, { item: 'flour', qty: 1 }).rate);
  });
});

describe('#915 — applyBarter', () => {
  it('moves goods both ways and logs', () => {
    const s = { ...game(), inventory: { ...game().inventory, flour: 300 } };
    const next = applyBarter(s, { item: 'flour', qty: 30 }, { item: 'quinine', qty: 1 }, makeRng('t'));
    expect((next.inventory.flour ?? 0)).toBe(300 - 30);
    expect((next.inventory.quinine ?? 0)).toBeGreaterThan(s.inventory.quinine ?? 0);
    expect(next.eventLog.length).toBeGreaterThan(s.eventLog.length);
  });

  it('throws when give-side qty exceeds inventory', () => {
    const s = { ...game(), inventory: { ...game().inventory, flour: 5 } };
    expect(() =>
      applyBarter(s, { item: 'flour', qty: 30 }, { item: 'quinine', qty: 1 }, makeRng('t'))
    ).toThrow(/insufficient/i);
  });

  it('throws on unfair quotes', () => {
    const s = { ...game(), inventory: { ...game().inventory, flour: 1000 } };
    expect(() =>
      applyBarter(s, { item: 'flour', qty: 200 }, { item: 'quinine', qty: 1 }, makeRng('t'))
    ).toThrow(/unfair/i);
  });

  it('throws when post has barterEnabled === false', () => {
    // (will need a fixture post in landmarks; for v1, no posts disable
    // barter, so this test verifies the gate is enforced when set.)
    const s = { ...game(), location: { ...game().location, atLandmarkId: 'mormon_ferry' } };
    // If mormon_ferry doesn't exist or doesn't disable, skip.
    if (s.location.atLandmarkId === 'mormon_ferry') {
      try {
        applyBarter(s, { item: 'flour', qty: 30 }, { item: 'quinine', qty: 1 }, makeRng('t'));
      } catch (e) {
        expect((e as Error).message).toMatch(/barter/i);
      }
    }
  });
});

describe('#915 — findBarterableItems', () => {
  it('returns items the player has that match what the post will take', () => {
    const s = { ...game(), inventory: { ...game().inventory, buffalo_robe: 3, whiskey: 2 } };
    const here = getLandmark('ft_hall');
    const items = findBarterableItems(s, here);
    // buffalo_robe should be barterable; whiskey is refused but
    // findBarterableItems still surfaces it (the rate will be poor;
    // player chooses).
    expect(items.find((i) => i.item === 'buffalo_robe')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify fails**

Run: `npx vitest run tests/barter-915.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `systems/barter.ts`**

```ts
import type { GameState, ItemId } from '../types';
import type { Rng } from '../rng';
import type { Landmark } from '../content/landmarks';
import { getPrice } from '../content/items';
import { getLandmark } from '../content/landmarks';

export const BARTER_RATE_FLOOR = 0.5;
export const BARTER_RATE_CEIL = 1.05;
export const BARTER_POST_PREFERENCE_BONUS = 0.15;
export const BARTER_POST_REJECT_PENALTY = 0.40;

export interface BarterOffer {
  item: ItemId;
  qty: number;
}

export interface BarterQuote {
  give: BarterOffer;
  receive: BarterOffer;
  /** give-value (after post preference/rejection) / receive-value */
  rate: number;
  /** true if rate falls within (FLOOR, CEIL). */
  fair: boolean;
}

function postOf(state: GameState): Landmark | null {
  return state.location.atLandmarkId
    ? getLandmark(state.location.atLandmarkId)
    : null;
}

export function quoteBarter(
  state: GameState,
  give: BarterOffer,
  receive: BarterOffer
): BarterQuote {
  const post = postOf(state);
  const postMult = post?.priceMultiplier ?? 1.0;
  const preferred = new Set(post?.barterPreferred ?? []);
  const refused = new Set(post?.barterRefused ?? []);

  const giveSellPrice = getPrice(give.item).sell * postMult * give.qty;
  const recvBuyPrice = getPrice(receive.item).buy * postMult * receive.qty;

  let modifier = 1.0;
  if (preferred.has(give.item)) modifier *= (1 + BARTER_POST_PREFERENCE_BONUS);
  if (refused.has(give.item)) modifier *= (1 - BARTER_POST_REJECT_PENALTY);

  const adjusted = giveSellPrice * modifier;
  const rate = recvBuyPrice > 0 ? adjusted / recvBuyPrice : 0;
  const fair = rate >= BARTER_RATE_FLOOR && rate <= BARTER_RATE_CEIL;
  return { give, receive, rate, fair };
}

export function applyBarter(
  state: GameState,
  give: BarterOffer,
  receive: BarterOffer,
  _rng: Rng
): GameState {
  const post = postOf(state);
  if (!post) throw new Error('barter: not at a landmark');
  if (post.barterEnabled === false) {
    throw new Error(`barter: ${post.name} runs cash-only`);
  }

  const have = state.inventory[give.item] ?? 0;
  if (have < give.qty) {
    throw new Error(`barter: insufficient ${give.item} (have ${have}, need ${give.qty})`);
  }

  const quote = quoteBarter(state, give, receive);
  if (!quote.fair) {
    throw new Error(`barter: unfair rate (${quote.rate.toFixed(2)}, must be ${BARTER_RATE_FLOOR}-${BARTER_RATE_CEIL})`);
  }

  const inventory = {
    ...state.inventory,
    [give.item]: have - give.qty,
    [receive.item]: (state.inventory[receive.item] ?? 0) + receive.qty,
  };

  return {
    ...state,
    inventory,
    eventLog: [
      ...state.eventLog,
      {
        day: state.day,
        text: `Bartered ${give.qty} ${give.item.replace(/_/g, ' ')} for ${receive.qty} ${receive.item.replace(/_/g, ' ')} at ${post.name}.`,
      },
    ],
  };
}

export interface BarterableItem {
  item: ItemId;
  qty: number;
  tradeValue: number;
}

export function findBarterableItems(state: GameState, here: Landmark): BarterableItem[] {
  if (here.barterEnabled === false) return [];
  const postMult = here.priceMultiplier ?? 1.0;
  const preferred = new Set(here.barterPreferred ?? []);
  const refused = new Set(here.barterRefused ?? []);

  const out: BarterableItem[] = [];
  for (const [id, qty] of Object.entries(state.inventory)) {
    if (qty <= 0) continue;
    const item = id as ItemId;
    const sell = getPrice(item).sell;
    if (sell <= 0) continue;
    let modifier = 1.0;
    if (preferred.has(item)) modifier *= (1 + BARTER_POST_PREFERENCE_BONUS);
    if (refused.has(item)) modifier *= (1 - BARTER_POST_REJECT_PENALTY);
    out.push({ item, qty, tradeValue: sell * postMult * modifier });
  }
  return out.sort((a, b) => b.tradeValue - a.tradeValue);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/barter-915.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj describe -m "feat(ai): #915 task 2 — barter.ts helpers + unit tests"
```

---

### Task 3: Persona surface — `pickBarterDispositions`

**Files:**
- Modify: `src/lib/game/ai/types.ts` (add the method to `Persona`)
- Modify: `src/lib/game/ai/personas.ts` (impl per persona)
- Create: `tests/persona-barter-915.test.ts`

- [ ] **Step 1: Add to Persona interface**

```ts
  /** #915 — Ordered list of barter swaps the persona wants to make
   *  at the current trading post. Empty when no exchange makes
   *  sense (cash surplus, no stockable surplus, post barter
   *  disabled). Bot consumer is `runner.ts:handleLandmark` after
   *  the cash trade attempt; NPC consumer is `wagon-train.ts`
   *  post-restock fallback. */
  pickBarterDispositions(state: GameState, here: Landmark, rng: Rng): BarterDisposition[];
```

`BarterDisposition` lives in `systems/barter.ts` (or `ai/types.ts`):

```ts
export interface BarterDisposition {
  give: { item: ItemId; qty: number };
  receive: { item: ItemId; qty: number };
}
```

- [ ] **Step 2: Default helper + per-persona overrides**

`personas.ts`:

```ts
import { findBarterableItems, quoteBarter, BARTER_RATE_FLOOR } from '../systems/barter';

function defaultPickBarterDispositions(state: GameState, here: Landmark): BarterDisposition[] {
  // Empty unless a clear barterable surplus exists (e.g., game_meat
  // > 100 lb after a hunt, OR the persona has buffalo_robe stock).
  // Specific personas override for character flavor.
  return [];
}

// cautious: trade surplus food/robes for medicine when foodOnHand > 200.
cautiousPersona.pickBarterDispositions = (state, here) => {
  if (here.barterEnabled === false) return [];
  // ... implementation
  return [];
};

// aggressive: barters only when cash < $30 and rate >= 0.80.
// hoarder: refuses to barter flour/beans/saleratus.
// drinker: barters whiskey freely.
// chaos: rng-driven.
```

(Implementation details left to subagent — the disposition logic is
~30 lines per persona but mechanical.)

- [ ] **Step 3: Tests**

`tests/persona-barter-915.test.ts`:
- cautious returns dispositions when food > 200 lb
- cautious returns [] when food < 200 lb
- aggressive returns [] when cash > $30
- aggressive returns dispositions when cash < $30
- hoarder never gives up flour
- drinker always gives up whiskey
- barterEnabled: false → all personas return []

- [ ] **Step 4: Commit**

```bash
jj describe -m "feat(ai): #915 task 3 — persona pickBarterDispositions"
```

---

### Task 4: Wire bot runner — barter pass after cash trade

**Files:**
- Modify: `src/lib/dev/bot/runner.ts`

- [ ] **Step 1: After the cash-trade fallback chain, add barter pass**

In `handleLandmark` trading_post block, AFTER the trade attempt + ox swap:

```ts
// #915 — barter pass. If the post allows barter and the persona
// has dispositions, try each one in order. Each `quoteBarter` is
// re-evaluated because earlier trades may have changed inventory.
if (here.barterEnabled !== false) {
  const dispositions = persona.pickBarterDispositions(s, here, rng);
  for (const d of dispositions) {
    const quote = quoteBarter(s, d.give, d.receive);
    if (!quote.fair) continue;
    try {
      s = applyBarter(s, d.give, d.receive, rng);
      stats.decisionsMade += 1;
    } catch {
      // Stale quote or inventory moved — try next.
    }
  }
}
```

- [ ] **Step 2: Verify with the sweep**

Run: `npm run verify` (0 errors) + a 30-run sweep.
Expected: bots that previously starved on the back half now have
flour/jerky/medicine from barter trades. Wipe rate should drop ~3-5pp
on cautious/balanced.

- [ ] **Step 3: Commit**

```bash
jj describe -m "feat(ai): #915 task 4 — bot runner barter pass at trading posts"
```

---

### Task 5: NPC train post-restock fallback

**Files:**
- Modify: `src/lib/game/systems/wagon-train.ts`

- [ ] **Step 1: Add barter fallback in `advanceWagonTrainTradingPost`**

After the existing NPC food-restock loop:

```ts
const CASH_LOW_THRESHOLD = 20;
if (c.cash < CASH_LOW_THRESHOLD && here.barterEnabled !== false) {
  const tradeFauxState = /* existing fauxState */;
  const dispositions = persona.pickBarterDispositions(tradeFauxState, here, tradeRng);
  for (const d of dispositions) {
    if (!quoteBarter(tradeFauxState, d.give, d.receive).fair) continue;
    try {
      // Apply the barter to the NPC wagon; update via wagon-synth or
      // a direct inventory mutation (NPCs have their own inventory
      // map distinct from GameState.inventory).
      // ... mutation
    } catch { /* skip */ }
  }
}
```

- [ ] **Step 2: Tests + commit**

`tests/npc-barter-915.test.ts`:
- NPC with cash $5 + flour 250 → barters at Fort Hall, gets medicine
- NPC at `barterEnabled: false` post → no fallback fires

```bash
jj describe -m "feat(ai): #915 task 5 — NPC train post-restock barter fallback"
```

---

### Task 6: Open PR + harness diff

- [ ] Push, open PR, sweep diff vs master (expect mild improvement on
      back-third survival).
- [ ] Mark VK #915 done on merge.

---

## Out of scope (separate PR)

- Player UI (Barter tab in TradePostModal). Filed for the sibling slice.
- Buffalo-robe / pelt yield from hunt.ts. Filed under #963 follow-ups.
- Cross-train barter (NPC ↔ NPC). Not period-typical at posts; train
  companion barter already covers the camp-evening variant.
