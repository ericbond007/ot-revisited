# #915 — General barter system at trading posts

> Implements item-for-item (and item-for-cash) trade at trading posts.
> Closes the period-historical gap: emigrants regularly bartered
> staples (flour, bacon, robes, pelts) for medicine/ammo/repairs at
> posts. Cash was scarce; goods circulated.

## Goal

A bot with $1 cash + 200 lb flour at Fort Hall can trade flour for
quinine, calomel, or even a fresh ox boot. A player at Bridger can
swap a buffalo robe for the flour they need. Both routes use the
same engine helper and the same rate math.

Today's state:
- Ox swap (#278) — partial: 2 worn oxen + cash boot → 1 fresh ox. Item-for-cash, not item-for-item.
- Train companion barter (camp evenings) — micro-trades only, not at posts.
- Native encounter barter (`tribesAtMile` encounter events) — trade goods → pemmican/hides/moccasins. Encounter-side only.
- **Missing**: general item-for-item at trading posts. The Bryant / Royce / Palmer diaries describe this as the dominant economy at the forts; the codebase models posts as cash-only outside the ox-swap exception.

## Architecture

```
NEW: src/lib/game/systems/barter.ts
  Constants (period-checked against Bryant 1846 / Hastings 1845 /
  Palmer 1845 / Carpenter 1857 / Russell 1841):
    BARTER_RATE_FLOOR = 0.5   // give-side undervalued at most 50%
                              //   (matches median diary rates;
                              //   Bridger's 17% horse-buys were
                              //   extreme outliers)
    BARTER_RATE_CEIL  = 1.05  // posts occasionally accept par or
                              //   slight emigrant favor for items
                              //   they desperately need (HBC for
                              //   robes; Bridger for fresh horses).
                              //   1.05 leaves a sliver above par.
    BARTER_POST_PREFERENCE_BONUS = 0.15  // HBC at Boise ~25% premium
                                          // for robes (Carpenter 1857);
                                          // Bridger 5-15% for horses
                                          // (Hastings); Whitman ~20%
                                          // for fresh meat. 15% sits
                                          // in the diary median.
    BARTER_POST_REJECT_PENALTY = 0.40    // Bryant 1846: refused items
                                          // ran "double the rate of
                                          // any other staple". 40%
                                          // captures the punitive
                                          // posture without snapping
                                          // every trade.

  Types:
    BarterOffer { item: ItemId; qty: number }
    BarterQuote {
      give: BarterOffer;
      receive: BarterOffer;
      rate: number;       // give-value / receive-value × postMult
      fair: boolean;      // true if rate is within (FLOOR, CEIL)
    }

  Pure helpers:
    quoteBarter(state, give, receive): BarterQuote
      // Compute give-value (sell price × postMult) and receive-value
      // (buy price × postMult). Apply per-post preference bonus or
      // reject penalty (see post.barterPreferred / .barterRefused).
      // Return whether the quote is fair (between FLOOR and CEIL).

    applyBarter(state, give, receive, rng): GameState
      // Validate (item presence, stock presence, fair rate, post
      // gating). Mutate state: subtract from inventory, add to
      // inventory, log line. Throw on invalid.

    findBarterableItems(state, here): BarterableItem[]
      // The items the player/bot has that the post is willing to
      // take in barter. Returns each with its current trade-value.
      // Used by player UI to populate the give-side menu and by bot
      // for "what could I offer here?"

content/landmarks.ts:
  Optional landmark fields:
    barterPreferred?: readonly ItemId[];   // post pays 15% premium
    barterRefused?:   readonly ItemId[];   // post takes 40% discount
    barterEnabled?:   boolean;             // DEFAULT TRUE (opt-out).
                                           // Period reality: every
                                           // fort + mission + road
                                           // ranch pre-1860 ran
                                           // barter. Mormon ferries
                                           // + some contract ops
                                           // ran cash-only — those
                                           // explicitly set false.

  Per-post anchors (v1 — extend in playtest):
    ft_laramie:      preferred = buffalo_robe, pelts, fresh_meat
    ft_bridger:      preferred = horses, fresh_meat, buffalo_robe
                     refused   = whiskey
    ft_hall:         preferred = buffalo_robe, blankets, tea
                     refused   = whiskey
    fort_boise:      preferred = buffalo_robe, fresh_meat, dried_salmon
    whitman_mission: preferred = fresh_meat, buffalo_robe
                     refused   = whiskey
                     // Mission stations donated + bartered; preferred
                     // staples for fresh game/meat the mission farm
                     // couldn't produce on its own.

src/lib/game/actions/trade.ts:
  Existing trade() handles buys + sells (cash-based). Wrapper or new
  surface — keep tightly scoped:

    barter(state, give, receive, rng): GameState
      // Thin wrapper that calls quoteBarter, validates fair, then
      // applyBarter. Matches the trade() signature so the UI can
      // call either path uniformly.

src/lib/game/actions/index.ts:
  Re-export barter so the play screen action layer can invoke it.

src/lib/game/ai/personas.ts:
  Persona surface additions:

    pickBarterDispositions(state, here): BarterDisposition[]
      // Returns ordered list of barter swaps the persona wants to
      // make at this post. Items the persona has + post wants;
      // capped by need (e.g., flour-need from gap-aware) and by
      // surplus (e.g., game_meat > 100 lb).
      // Cautious: prefers barter over cash spend to preserve coin.
      // Aggressive: refuses unfavorable trades (rate < 0.80).
      // Hoarder: refuses to give up flour or saleratus.
      // Drinker: barters whiskey for anything.

src/lib/dev/bot/runner.ts:
  Inside handleLandmark trading_post block, AFTER existing trade
  attempt:

    if (post.barterEnabled !== false) {
      const dispositions = persona.pickBarterDispositions(s, here);
      for (const d of dispositions) {
        const quote = quoteBarter(s, d.give, d.receive);
        if (!quote.fair) continue;
        try {
          s = barter(s, d.give, d.receive, rng);
          stats.decisionsMade += 1;
        } catch {
          // Item moved or quote went stale — try next.
        }
      }
    }

src/lib/game/systems/wagon-train.ts (NPC restock):
  After the existing NPC food-restock loop, when cash is short and
  the wagon has surplus food/hides, fall back to barter. Bot uses
  pickBarterDispositions; NPC uses a leaner profile based on
  personaId for the train wagons.
```

## Rate calculation

```
quoteBarter(state, give, receive):
  postMult       = post.priceMultiplier ?? 1.0
  giveSellPrice  = price(give.item).sell * postMult * giveQty
  recvBuyPrice   = price(receive.item).buy * postMult * recvQty

  // Per-post preference modifier on the give side
  preference     = post.barterPreferred?.includes(give.item) ?  1 + BONUS : 1
  rejection      = post.barterRefused?.includes(give.item)   ?  1 - PENALTY : 1
  adjusted       = giveSellPrice * preference * rejection

  rate           = adjusted / recvBuyPrice
  fair           = rate >= BARTER_RATE_FLOOR && rate <= BARTER_RATE_CEIL
```

Worked example (Fort Hall preferring robes):
- Give: 1 buffalo robe (sell $8 × 1.5 mult = $12; +10% preferred = $13.20)
- Receive: 30 lb flour (buy $0.50/lb × 30 × 1.5 mult = $22.50)
- Rate: 13.20 / 22.50 = 0.587 → fair (above 0.5 floor)
- Trade proceeds; player loses 1 robe, gains 30 lb flour.

Worked example (Fort Bridger refusing whiskey):
- Give: 1 whiskey (sell $4 × 1.5 mult = $6; -30% refused = $4.20)
- Receive: 5 lb flour (buy $0.50/lb × 5 × 1.5 mult = $3.75)
- Rate: 4.20 / 3.75 = 1.12 → NOT fair (above 0.95 ceil — would
  favor the player, post refuses)
- The trade is rejected because the rate is too generous from the
  give side. (Bryant 1846: "they refused even my best knife — said
  it was lawful trade but not a fair exchange").

## Player UI

`src/lib/ui/play/TradePostModal.svelte` (or wherever the existing
trade UI lives) gains a "Barter" tab alongside "Buy" and "Sell".

Layout (Z Fold 4 884px target):
- Give side (top half): inventory grid of items the post will take.
  Each tile shows item, current qty, and (when selected) qty stepper.
- Receive side (bottom half): post stock grid of items the post offers.
  Same shape, selecting and qty-stepping.
- Center strip: live `quoteBarter` rate, fairness indicator (green/
  yellow/red), and a "Trade" button that calls `barter()`.
- Bottom hint: "Fort Bridger prefers horses and fresh meat — try
  trading those for the best rate."

## Bot persona dispositions

```ts
interface BarterDisposition {
  give: BarterOffer;
  receive: BarterOffer;
}

cautiousPersona.pickBarterDispositions(state, here):
  // Cautious barters surplus food (game_meat, pemmican, jerky, robes)
  // for medicine when foodOnHand > 200 lb. Preserves cash for the
  // back half.

aggressivePersona.pickBarterDispositions(state, here):
  // Aggressive only barters when cash < $30. Rate threshold 0.80.

hoarderPersona.pickBarterDispositions(state, here):
  // Hoarder refuses to give up flour, beans, or saleratus. Will trade
  // game_meat (surplus) and pelts (luxury). Rate threshold 0.90.

drinkerPersona.pickBarterDispositions(state, here):
  // Drinker barters whiskey freely for anything. (#287 character flag.)

chaosPersona.pickBarterDispositions(state, here, rng):
  // Random qty-of-random-give for random-receive, fairness-gated.
```

## NPC train integration

Existing `applyNpcPostRestock` in `wagon-train.ts` handles food
restocks but skips when cash < threshold. New fallback path:
```ts
if (next.cash < CASH_LOW_THRESHOLD && hasBarterableSurplus(next)) {
  for (const d of persona.pickBarterDispositions(faux, here)) {
    if (quoteBarter(faux, d.give, d.receive).fair) {
      next = applyBarter(faux, d.give, d.receive, rng);
    }
  }
}
```

NPC wagons that earn pemmican from #294 company hunts can convert
that surplus into flour at the next fort — closing the late-trail
food gap for the train as a whole.

## Out of scope (filed separately if scoping bites)

- Native barter at non-trade-post landmarks. Already partially
  implemented in `encounters.ts`; this PR doesn't touch it.
- Inter-wagon barter on the road (#52, shipped — camp evenings).
- Buffalo-robe production via hunting (the robe → flour trade only
  matters if hunting yields robes; verify `hunt.ts` yields).
- Live-cattle barter (oxen barter is already #278; we don't
  generalize that).
- Persona barter learning across runs (a "this post screwed me
  last time" memory).

## Decisions locked (2026-05-13 Dave review)

1. **Rate floor 0.5 / ceiling 1.05** — floor matches Bryant 1846
   median; ceiling lifted from 0.95 to 1.05 to allow par-or-near-par
   trades that period posts did accept when desperate (HBC for
   robes; Bridger for fresh horses). ✅
2. **Preference +15% / refused −40%** — widened from initial draft.
   Period anchors: HBC at Boise ~25% premium for robes (Carpenter
   1857); Bridger 5-15% for horses (Hastings); Bryant 1846 "double
   the rate of any other staple" for refused items. ✅
3. **`barterEnabled` default = true (opt-out)** — period reality:
   every fort + mission + road ranch pre-1860 ran barter; only
   Mormon ferries and contract operations went cash-only. ✅
4. **Per-post anchors** — Laramie, Bridger, Hall, Boise, plus
   Whitman Mission. Mission preferences focused on fresh meat /
   game (the mission farm couldn't supply). ✅
5. **PR scope** — split engine + bot in one PR; player UI as a
   sibling slice. Bot can validate the engine layer first; UI can
   land once the rate math is playtested. ✅
6. **Inventory precondition** — ship v1 using existing items
   (flour, bacon, beans, jerky, pemmican, buffalo_robe if present).
   Buffalo-robe yield from hunt.ts is a follow-up; existing food
   staples carry the bot path for now. ✅
