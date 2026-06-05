# Trade Post — Unified Basket Rebuild (Design)

**Closes:** the "#3 — rebuild Trade Post to the handoff" item from the design-handoff
coverage review. Supersedes the legacy grouped buy/sell + barter-toggle modal
(`TradeModal.svelte`, the #265 recolor).

**Goal:** Rebuild the Trade Post modal as the Claude Design handoff's **unified**
variant — one two-column give│get basket with a **Cash (default) / Barter toggle**.
Back it with a new pure engine settlement surface, and make cash payout to the
player a historically-gated per-post trait.

---

## 1. Interaction model (what the player sees)

One two-column basket, always showing both sides. A **mode toggle** sits in the
sticky summary; **Cash is the default**, Barter is opt-in (per the handoff).

```
┌──────────────── SUMMARY (sticky) ──────────────────┐
│  [ Cash ]  [ Barter ]      "Pay the post in cash.  │
│                             Use give to sell back." │
│  CASH MODE:   You pay $34   (or "Post pays you $6") │
│  BARTER MODE: You give $34 goods + $6 cash = $40    │
│               You get  $40 goods                    │
│               ════════ rate bar · fair ════════     │
└─────────────────────────────────────────────────────┘
┌─ Your wagon (give) ──────┬─ Post stock (get) ───────┐
│ 🦬 Buffalo robe ★prefers │ 🌾 Flour    $0.15/u      │
│    [− 1 +]                │    [− 0 +]  (80 left)    │
│ 🥃 Whiskey ⊘refused      │ 🥓 Bacon    $0.30/u      │
│    [− 0 +]                │    [− 0 +]  (60 left)    │
└──────────────────────────┴───────────────────────────┘
```

### Cash mode (default)
- **Get** (post stock) costs its buy-price × post multiplier — you pay cash.
- **Give** (wagon goods) is a **sell-back** at sell-price × multiplier, **no
  preferred/refused premium** — and only available if the post `buysForCash`
  (see §3). At a no-cash post the give column is disabled in cash mode with a
  "this post won't buy for coin — try Barter" note.
- `netCash = getValue − sellCredit` (signed: + you pay, − post pays you). Negative
  only possible at cash posts.
- No rate bar — a cash purchase is exact, never "unfair."

### Barter mode (toggle)
- **Get** is valued at buy-price × mult (the value you're acquiring).
- **Give** uses the **barter valuation** — sell-price × mult × preferred(+15%) /
  refused(−40%). This is where offering a post's prized goods pays off.
- **Cash-top-up chips** (`+50¢ +$1 +$5 +$10`, and an "Even $X" suggestion) let the
  player add cash *on top* of their goods to reach a fair offer. Discrete chips,
  **not** a continuous slider. Cash flows player→post only — **no cash back in
  barter mode.**
- `giveTotal = giveGoodsValue + cashOffer`; `rate = giveTotal / getTotal`. The post
  **refuses** offers below `RATE_FLOOR` (0.5) — "add $X to balance"; offers above
  `RATE_CEIL` (1.05) show an advisory "you're overpaying" (allowed, not blocked).
- The rate bar is visible in barter mode, shaded fair-band + a notch at the current
  rate.

### Shared chrome (from the handoff)
PostHeader (post identity + party cash), PreferencesBanner (prefers/refuses…),
left-rail live inventory, footer (confirm/cancel). Broadsheet `--of-*` tokens
throughout — no new contrast debt.

---

## 2. Engine: `settleTrade()` — new pure surface

New file `src/lib/game/systems/settle-trade.ts`. One pure function settles a whole
basket atomically, branching on mode. Reuses the existing price model + the
`barter.ts` rate constants.

```ts
export interface TradeBasket {
  mode: 'cash' | 'barter';
  get: Record<ItemId, number>;    // entering wagon, drawn from post stock
  give: Record<ItemId, number>;   // leaving wagon
  cashOffer?: number;             // barter mode only: cash added on top (>= 0)
}

export interface SettleResult {
  state: GameState;
  netCash: number;     // signed: + player paid, − post paid player
  getValue: number;    // Σ buy(id)  × postMult × qty
  giveValue: number;   // give-side value (cash: plain sell; barter: sell × pref/reject)
  rate?: number;       // barter mode only: giveTotal / getValue
}

export function settleTrade(state: GameState, basket: TradeBasket): SettleResult
```

**Valuation.** Cash mode must match the existing `trade()` exactly (the
equivalence test depends on it), so it reuses **`trade()`'s profession discounts
× post multiplier** — `buyMult = professionBuy × postMult`,
`sellMult = professionSell × postMult` (merchant −15%/+20%, banker −10%/+10%,
additive; `professionDiscount()` is exported from `trade.ts` and shared). Barter
mode matches `applyBarter()` — post multiplier + preferred/refused premium, **no
profession bonus** (the primitives differ here, deliberately).

```
year = state.date.year;  postMult = post.priceMultiplier ?? 1.0
{ buyMult: pBuy, sellMult: pSell } = professionDiscount(state)   // from trade.ts

getValue = Σ getPrice(id).buy × (pBuy × postMult) × qty             over get   (both modes)

CASH mode:
  giveValue = Σ getPrice(id).sell × (pSell × postMult) × qty        over give  (no barter premium)
  rawNet    = getValue − giveValue
  netCash   = round(rawNet)                 // signed; − only reachable at cash posts
  // give present at a !postBuysForCash post → THROW (see validation); also honors
  // the post's excludeBuyCategories (a sell of a refused category throws), parity with trade()

BARTER mode:
  giveValue = Σ getPrice(id).sell × postMult × prefReject(id) × qty over give  (+15% / −40%, no profession bonus)
  giveTotal = giveValue + (cashOffer ?? 0)
  rate      = getValue > 0 ? giveTotal / getValue : (giveTotal === 0 ? 1 : Infinity)
  netCash   = round(cashOffer ?? 0)         // player pays the top-up; never negative
```

`round()` matches `trade()`'s `Math.round` on the cash delta; the affordability
check uses `Math.ceil(netCash) > cash` (parity with `trade()`).

**Validation (throws, atomic — nothing applied on any failure):**
- not at a trading post → throw
- player owns each `give[id]` in qty (else `insufficient <id>`)
- post has stock for each `get[id]` (via post-stock state; else `out of stock`)
- **cash mode:** give-side present at a post where `!postBuysForCash` → throw
  `this post won't buy for coin` (the UI disables the give column to prevent it)
- **cash mode:** if `netCash > 0`, require `cash >= netCash` (else `not enough cash`)
- **barter mode:** `cashOffer >= 0` and `cash >= cashOffer`; `rate >= RATE_FLOOR`
  (else `offer too thin — add cash or goods`). `rate > RATE_CEIL` is allowed
  (overpaying is the player's choice).
- **nothing-gained guard:** reject a basket where `get` is empty AND the player
  receives nothing (cash mode netCash >= 0 with empty get; barter mode always
  costs the player) — can't hand goods over for $0.
- a give item the post explicitly refuses is allowed (priced down), matching
  `findBarterableItems` — refusal is a poor rate, not a block.

**Apply:** inventory −give +get; `cash -= netCash`; decrement post stock for the
get side via the existing `recordPostPurchases`; append one `eventLog` entry.
Give-goods are **not** added back to post stock (parity with today's `applyBarter`
abstraction).

**No money-loop exploit:** `sell × 1.15 < buy` holds for every catalog item, so
"buy cheap, re-offer as preferred" never nets a profit — asserted by a unit test.

### Relationship to existing primitives — primitives STAY

`trade()`, `quoteBarter()`, `applyBarter()`, `findBarterableItems()` are consumed
by the **bot player** (`dev/bot/runner.ts`), **NPC wagon-trains**
(`systems/wagon-train.ts`), the **AI personas** (`ai/personas.ts`), and dev
scenarios. `settleTrade` is **additive and player-UI-only** — it does not replace
them. Bots/NPCs/AI are untouched (#298 NPC parity / #302 game-ai: no behavior
change; named explicitly per project policy; follow-up #1223). An equivalence test
asserts `settleTrade` (cash mode) matches `trade()` and (barter mode, cashOffer 0)
matches `applyBarter()`, so the player path can't silently diverge.

---

## 3. Per-post cash payout — historically gated

Two optional fields on the `Landmark` trading-post shape, plus a resolver:

```ts
buysForCash?: boolean;        // post pays cash for player goods (default false)
buysForCashFromYear?: number; // era flip: cash only from this year onward

export function postBuysForCash(post: Landmark, year: number): boolean {
  if (post.buysForCash) return true;
  if (typeof post.buysForCashFromYear === 'number') return year >= post.buysForCashFromYear;
  return false;
}
```

**Historical mapping** (locked with Dave 2026-06-04). Rule of thumb:
HBC/fur-company posts, missions, and Native camps ran on barter/credit — coin was
scarce and they hoarded it; Army posts, road ranches, and real towns paid cash.

| Landmark id | Pays cash? | Field | History |
|---|---|---|---|
| `ft_kearny` | ✅ | `buysForCash: true` | US Army post (from 1848); sutler cash store |
| `hollenberg_ranch` | ✅ | `buysForCash: true` | Road ranche (only exists 1857+); cash trade |
| `rock_creek_station` | ✅ | `buysForCash: true` | Road ranche (only exists 1857+); cash trade |
| `ft_caspar` | ✅ | `buysForCash: true` | US Army / Platte Bridge Station (only exists 1855+) |
| `the_dalles` | ✅ | `buysForCash: true` | Bustling cash town / depot by the 1850s |
| `ft_laramie` | ⏳ | `buysForCashFromYear: 1849` | Am. Fur Co. barter → US Army cash in 1849 |
| `ft_bridger` | ⏳ | `buysForCashFromYear: 1858` | Bridger/Vasquez & Mormon barter → US Army cash in 1858 |
| `robidoux_post` | ❌ | — | Private fur trader; barter/credit, steep markup |
| `ft_hall` | ❌ | — | HBC; ran on credit ledgers (Made Beaver) |
| `ft_boise` | ❌ | — | HBC station; barter/credit |
| `ft_walla_walla` | ❌ | — | HBC; barter/credit |
| `whitman_mission` | ❌ | — | Mission; provisioned emigrants by charity/barter, not coin |
| `cheyenne_camp` | ❌ | — | Native camp; tribal trade in goods/robes |
| `shoshone_camp` | ❌ | — | Native camp; tribal trade in goods/robes |

`oregon_city` is `kind: 'end'` (destination, not a trade stop) — not mapped.

---

## 4. UI rebuild + server action

- Rebuild `src/lib/ui/TradeModal.svelte` to the two-mode unified layout above.
  Port the handoff's shared widgets (PostHeader, PreferencesBanner, item rows w/
  Stepper, RateScale/RateBadge, cash-chip row) to Svelte 5 runes + broadsheet
  tokens. The component derives `getValue` / `giveValue` / `netCash` / `rate`
  client-side for live preview and submits `{ mode, get_*, give_*, cashOffer }`
  to a single server action.
- New `settleTrade:` server action in `src/routes/play/+page.server.ts`: parse the
  mode + `get_<id>` / `give_<id>` + `cashOffer` form fields into a `TradeBasket`,
  call `settleTrade`, persist. Any test-imported parse helper is underscore-
  prefixed so SvelteKit permits the export (the #233 `_parseBuyOrders` lesson).
- Retire the `trade:` and `barter:` server actions **once nothing references
  them** (the rebuilt modal is the only caller). Engine primitives `trade()` /
  `applyBarter()` remain for bots/NPC/AI.

---

## 5. Sequencing — two PRs (de-risk per the #233 lesson)

**PR-A — engine + data (no UI change):**
- `settle-trade.ts` + `settleTrade()` (both modes), fully TDD.
- `buysForCash` / `buysForCashFromYear` fields + `postBuysForCash()` helper +
  the historical mapping applied to landmarks.
- Equivalence + invariant tests. Existing modal still wired to old actions —
  `npm run verify` green, zero UI change.

**PR-B — UI rebuild (on top of PR-A):**
- Rebuild `TradeModal.svelte` to the two-mode unified basket; add `settleTrade:`
  action; retire `trade:`/`barter:` actions.
- Verified in-browser via Playwright at a trading-post dev scenario: cash buy,
  cash sell at a cash post, sell blocked at a no-cash post, barter offset,
  barter cash-top-up to reach fair, over-offer "overpaying" warning.

---

## 6. Testing

**`settleTrade` unit tests:**
- cash buy (give empty) → netCash = getValue, stock decremented, cash debited
- cash sell at a cash post → netCash negative, cash credited
- cash sell at a NO-cash post → throws `won't buy for coin`, state unchanged
- barter, goods cover fully (cashOffer 0, rate ≥ FLOOR) → goods swap, no cash moved
- barter, goods too thin (rate < FLOOR, cashOffer 0) → throws `offer too thin`
- barter, cash-top-up lifts rate to FLOOR → succeeds, cash debited by cashOffer
- barter, overpaying (rate > CEIL) → allowed (no throw), flagged in result
- preferred-item premium lowers the cash needed; refused-item penalty raises it
- nothing-gained guard: get empty + no player gain → throws
- insufficient cash / give-inventory / out-of-stock → throws, state unchanged
- `postBuysForCash`: Laramie 1848 false / 1849 true; Bridger 1857 false / 1858
  true; Fort Hall always false; Fort Kearny always true

**Invariant test:** `sell(id) × 1.15 < buy(id)` for every catalog item (no loop).

**Equivalence test:** `settleTrade` cash mode == `trade()`; barter mode (cashOffer
0) == `applyBarter()`, on inventory + cash.

**Playwright (PR-B):** the flows in §5, plus contrast/legibility spot-check.

---

## 7. Out of scope

- Bot/NPC adoption of `settleTrade` — they keep the primitives (follow-up **#1223**).
- The handoff's `tabs` and `split` variants (Dave chose unified).
- Post stock gaining the player's given goods (follow-up **#1222**).
- Save migration (project policy: none).
