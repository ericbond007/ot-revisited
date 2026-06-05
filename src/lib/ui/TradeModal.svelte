<script lang="ts">
  // Unified two-mode trade basket (handoff port). One modal, a Cash (default)
  // / Barter toggle, a sticky summary, and two parallel item columns:
  //   left  = your wagon (give)   right = post stock (get)
  // Client preview math mirrors settle-trade.ts exactly so the displayed
  // totals match what the server applies on confirm. Submits a single
  // { mode, cashOffer, get_<id>, give_<id> } basket to ?/settleTrade.
  import type { GameState } from '$lib/game/types';
  import { PRICES, getPrice } from '$lib/game/content/prices';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { getLandmark, postBuysForCash, type PostKind } from '$lib/game/content/landmarks';
  import { getProfession } from '$lib/game/content/professions';
  import { professionDiscount } from '$lib/game/actions/trade';
  import { postRemainingQty } from '$lib/game/systems/post-stock';
  import {
    findBarterableItems,
    BARTER_RATE_FLOOR,
    BARTER_RATE_CEIL,
    BARTER_POST_PREFERENCE_BONUS,
    BARTER_POST_REJECT_PENALTY
  } from '$lib/game/systems/barter';
  import { POST_THEME } from '$lib/data/post-theme';
  import LandmarkIcon, { hasLandmarkIcon } from '$lib/ui/landmark-icons/LandmarkIcon.svelte';
  import TradeItemColumn from './TradeItemColumn.svelte';
  import { dialogA11y } from '$lib/ui/actions/dialog-a11y';

  let { state: gameState, slot, onclose }: {
    state: GameState;
    slot: string;
    onclose: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // ---- Post identity ----
  const hereId = $derived(gameState.location.atLandmarkId);
  const here = $derived(hereId ? getLandmark(hereId) : null);
  const postName = $derived(here?.name ?? 'Trading Post');
  const postKind = $derived<PostKind>(here?.postKind ?? 'frontier');
  const postBlurb = $derived(here?.blurb ?? 'A post on the trail.');
  const theme = $derived(POST_THEME[postKind]);

  // Leader + profession chip.
  const leader = $derived(gameState.party[0]);
  const leaderProf = $derived(leader?.profession ? getProfession(leader.profession) : null);
  const partyCount = $derived(gameState.party.filter((m) => !m.dead).length);

  // ---- Pricing primitives (mirror settle-trade.ts) ----
  const postMult = $derived(here?.priceMultiplier ?? 1.0);
  const profMult = $derived(professionDiscount(gameState));
  const pBuy = $derived(profMult.buyMult);
  const pSell = $derived(profMult.sellMult);
  const year = $derived(gameState.date.year);
  // Whether the post pays coin for player goods (cash-mode sell gate).
  const buysCash = $derived(here ? postBuysForCash(here, year) : false);

  const preferredSet = $derived(new Set(here?.barterPreferred ?? []));
  const refusedSet = $derived(new Set(here?.barterRefused ?? []));
  const excludedCats = $derived(new Set<string>(here?.excludeBuyCategories ?? []));
  const barterEnabled = $derived(here?.barterEnabled !== false);

  function prefReject(id: string): number {
    let m = 1.0;
    if (preferredSet.has(id)) m *= 1 + BARTER_POST_PREFERENCE_BONUS;
    if (refusedSet.has(id)) m *= 1 - BARTER_POST_REJECT_PENALTY;
    return m;
  }

  // ---- Mode + basket state ----
  let mode = $state<'cash' | 'barter'>('cash');
  let get = $state<Record<string, number>>({});
  let give = $state<Record<string, number>>({});
  let cashOffer = $state(0);

  // Switching modes clears the cash top-up (barter-only).
  function setMode(next: 'cash' | 'barter') {
    if (mode === next) return;
    mode = next;
    cashOffer = 0;
  }

  // ---- Item lists ----
  // Get side = post stock. Give side = player inventory; in barter mode it's
  // narrowed to what the post will actually take (findBarterableItems).
  const stockIds = $derived(
    (here?.stock ?? []).filter((id) => PRICES[id] && ITEMS[id])
  );
  const ownedIds = $derived(
    Object.entries(gameState.inventory)
      .filter(([id, qty]) => qty > 0 && PRICES[id] && ITEMS[id])
      .map(([id]) => id)
  );
  const barterableIds = $derived(
    here ? findBarterableItems(gameState, here).map((b) => b.item).filter((id) => ITEMS[id]) : []
  );
  // In cash mode the give side is a sell-back: all owned, minus post-excluded
  // categories (parity with settle-trade.ts cash-mode validation).
  const cashSellableIds = $derived(
    ownedIds.filter((id) => !excludedCats.has(ITEMS[id].category))
  );
  const giveIds = $derived(mode === 'barter' ? barterableIds : cashSellableIds);

  const CATEGORY_ORDER: ItemCategory[] = [
    'food', 'feed', 'medicine', 'tool', 'wagon_part', 'weapon', 'ammo',
    'clothing', 'livestock', 'comfort', 'native_trade'
  ];
  type Group = { cat: ItemCategory; ids: string[] };
  function groupOf(ids: string[]): Group[] {
    const byCat: Partial<Record<ItemCategory, string[]>> = {};
    for (const id of ids) {
      const meta = ITEMS[id];
      if (!meta) continue;
      (byCat[meta.category] ??= []).push(id);
    }
    return CATEGORY_ORDER
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => ({ cat: c, ids: byCat[c]!.sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name)) }));
  }
  const getGroups = $derived(groupOf(stockIds));
  const giveGroups = $derived(groupOf(giveIds));

  // Keep basket keys defined so the column bind:value works, and prune any
  // give entries that fall off the list when switching modes (e.g. a cash-
  // only excluded item that isn't barterable).
  $effect(() => {
    for (const id of stockIds) if (get[id] === undefined) get[id] = 0;
    for (const id of giveIds) if (give[id] === undefined) give[id] = 0;
    for (const id of Object.keys(give)) {
      if (give[id] > 0 && !giveIds.includes(id)) give[id] = 0;
    }
  });

  // ---- Per-unit values + source/max helpers (passed to columns) ----
  const getHave = (id: string) => (here ? postRemainingQty(gameState, here, id) : 0);
  const getMax = (id: string) => {
    // Chicken coop cap mirrors settle-trade.ts: can't exceed wagon capacity.
    const remaining = getHave(id);
    return Math.min(remaining, 999);
  };
  const giveHave = (id: string) => gameState.inventory[id] ?? 0;
  const giveMax = (id: string) => Math.min(giveHave(id), 999);

  // get-side per-unit value: buy × (pBuy × postMult)  (both modes)
  const getPerUnit = (id: string) => getPrice(id).buy * (pBuy * postMult);
  // give-side per-unit value:
  //   cash:   sell × (pSell × postMult)
  //   barter: sell × postMult × prefReject(id)
  const givePerUnit = (id: string) =>
    mode === 'cash'
      ? getPrice(id).sell * (pSell * postMult)
      : getPrice(id).sell * postMult * prefReject(id);

  // ---- Preview math (mirror settle-trade.ts) ----
  const getValue = $derived(
    Object.entries(get).reduce(
      (s, [id, q]) => (q > 0 ? s + getPrice(id).buy * (pBuy * postMult) * q : s), 0
    )
  );
  const giveValue = $derived(
    Object.entries(give).reduce((s, [id, q]) => {
      if (q <= 0) return s;
      return mode === 'cash'
        ? s + getPrice(id).sell * (pSell * postMult) * q
        : s + getPrice(id).sell * postMult * prefReject(id) * q;
    }, 0)
  );
  const getCount = $derived(Object.values(get).reduce((s, q) => s + (q > 0 ? q : 0), 0));
  const giveCount = $derived(Object.values(give).reduce((s, q) => s + (q > 0 ? q : 0), 0));

  // CASH mode net: + you pay, − you receive.
  const netCash = $derived(Math.round(getValue - giveValue));
  const overBudget = $derived(Math.ceil(getValue - giveValue) > gameState.cash);
  // Nothing-gained guard parity: empty get + no player gain.
  const cashNothingGained = $derived(getCount === 0 && netCash >= 0);

  // BARTER mode.
  const giveTotal = $derived(giveValue + cashOffer);
  const rate = $derived(
    getValue > 0 ? giveTotal / getValue : giveTotal === 0 ? 1 : Infinity
  );
  const tooThin = $derived(mode === 'barter' && getCount > 0 && rate < BARTER_RATE_FLOOR);
  const overpaying = $derived(mode === 'barter' && getCount > 0 && rate > BARTER_RATE_CEIL);
  // Cash needed to lift the give-goods to a FLOOR-fair offer.
  const cashGapToFair = $derived(Math.max(0, getValue * BARTER_RATE_FLOOR - giveValue));
  // Cash needed to balance the trade exactly (rate = 1).
  const cashGapEven = $derived(Math.max(0, getValue - giveValue));

  // ---- Confirm gating (mirror settle-trade.ts throw conditions) ----
  const canConfirm = $derived.by(() => {
    if (!here) return false;
    if (mode === 'cash') {
      if (cashNothingGained) return false;
      if (overBudget) return false;
      // A cash-mode give at a no-cash post is impossible (column hidden), but
      // guard anyway.
      if (giveCount > 0 && !buysCash) return false;
      return true;
    }
    // barter
    if (getCount === 0) return false;
    if (tooThin) return false;
    if (Math.ceil(cashOffer) > gameState.cash) return false;
    return true;
  });

  // ---- Cash top-up chips ----
  const cashChips = [0.5, 1, 5, 10];
  function addCash(amt: number) {
    cashOffer = Math.min(gameState.cash, Math.round((cashOffer + amt) * 100) / 100);
  }
  function clearCash() { cashOffer = 0; }
  function evenCash() {
    cashOffer = Math.min(gameState.cash, Math.ceil(cashGapEven));
  }

  // ---- RateScale geometry (port of handoff RateScale) ----
  const SCALE_LO = 0.30, SCALE_HI = 1.25;
  const scalePct = (v: number) =>
    Math.max(0, Math.min(100, ((v - SCALE_LO) / (SCALE_HI - SCALE_LO)) * 100));
  const scaleTicks = [0.5, 0.75, 1.0];
  const scaleTone = $derived(
    tooThin ? 'bad' : rate >= 0.95 ? 'good' : 'mid'
  );
  const showRate = $derived(rate > 0 && Number.isFinite(rate));

  // PreferencesBanner text.
  const fmtList = (ids: readonly string[]) => {
    const names = ids.map((id) => ITEMS[id]?.name ?? id.replace(/_/g, ' ')).filter(Boolean);
    if (names.length === 0) return '—';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  };
  const prefersText = $derived(fmtList(here?.barterPreferred ?? []));
  const refusesText = $derived(fmtList(here?.barterRefused ?? []));
  const hasRefuses = $derived((here?.barterRefused ?? []).length > 0);

  const money = (n: number) => `$${n.toFixed(2)}`;

  // Hidden form lines — only non-zero entries.
  const getLines = $derived(Object.entries(get).filter(([, q]) => q > 0));
  const giveLines = $derived(Object.entries(give).filter(([, q]) => q > 0));
</script>

<div class="trade-backdrop" onclick={(e) => e.target === e.currentTarget && onclose()} role="presentation">
  <div
    class="trade-wrap"
    role="dialog"
    use:dialogA11y={{ onClose: onclose }}
    style="--post-accent: {theme.accent};"
  >
    <!-- ===== PostHeader ===== -->
    <header class="tp-head">
      <div class="tp-head-l">
        {#if hereId && hasLandmarkIcon(hereId)}
          <LandmarkIcon id={hereId} size={52} className="post-glyph-svg" />
        {:else}
          <span class="tp-post-glyph">{theme.glyph}</span>
        {/if}
        <div class="tp-head-titles">
          <div class="tp-eyebrow">{theme.tag}</div>
          <h1 class="tp-head-name">{postName}</h1>
          <div class="tp-head-sub">
            {#if leader}<strong>{leader.name}</strong>{#if leaderProf}, <span class="tp-prof">{leaderProf.name}</span>{/if}'s party of {partyCount}{/if}
          </div>
        </div>
      </div>
      <div class="tp-head-r">
        <span class="tp-eyebrow">Purse</span>
        <span class="tp-cash">${gameState.cash}</span>
      </div>
    </header>

    <p class="tp-blurb">{postBlurb}</p>

    <!-- ===== PreferencesBanner ===== -->
    {#if barterEnabled && ((here?.barterPreferred ?? []).length > 0 || hasRefuses)}
      <div class="tp-banner">
        <div class="tp-banner-pref">
          <span class="tp-chip tp-chip-prefers">★ Prefers</span>
          <span class="tp-banner-text">{prefersText}</span>
          {#if (here?.barterPreferred ?? []).length > 0}
            <span class="tp-banner-bonus">+15% rate</span>
          {/if}
        </div>
        {#if hasRefuses}
          <div class="tp-banner-pref">
            <span class="tp-chip tp-chip-refused">⊘ Refuses</span>
            <span class="tp-banner-text">{refusesText}</span>
            <span class="tp-banner-penalty">−40% rate</span>
          </div>
        {/if}
      </div>
    {/if}

    <div class="tp-deal">
      <!-- ===== Sticky summary ===== -->
      <header class="tp-summary">
        <div class="tp-mode-toggle-row">
          <div class="tp-mode-toggle" role="tablist" aria-label="Trade mode">
            <button
              type="button" role="tab" aria-selected={mode === 'cash'}
              class="tp-mode-tab" class:tp-mode-tab-active={mode === 'cash'}
              onclick={() => setMode('cash')}
            >Cash</button>
            {#if barterEnabled}
              <button
                type="button" role="tab" aria-selected={mode === 'barter'}
                class="tp-mode-tab" class:tp-mode-tab-active={mode === 'barter'}
                onclick={() => setMode('barter')}
              >Barter</button>
            {/if}
          </div>
          <span class="tp-mode-hint">
            {#if mode === 'barter'}
              Trade goods for goods. Add cash on top to balance an offer.
            {:else}
              Pay {postName} in cash.{#if buysCash} Use the give column to sell items back.{/if}
            {/if}
          </span>
        </div>

        {#if mode === 'barter'}
          <div class="tp-summary-row">
            <span class="tp-summary-label">You give</span>
            <span class="tp-summary-goods">{money(giveValue)}<span class="tp-summary-sub">goods</span></span>
            <span class="tp-summary-plus">+</span>
            <div class="tp-summary-cash">
              <span class="tp-summary-cash-label">cash</span>
              <span class="tp-summary-cash-val">{money(cashOffer)}</span>
              <div class="tp-cash-chips">
                <button
                  type="button" class="tp-cash-chip tp-cash-chip-neg"
                  onclick={clearCash} disabled={cashOffer === 0} title="Clear cash"
                >×</button>
                {#each cashChips as amt}
                  <button
                    type="button" class="tp-cash-chip"
                    disabled={cashOffer >= gameState.cash}
                    onclick={() => addCash(amt)}
                  >+{amt < 1 ? `${amt * 100}¢` : `$${amt}`}</button>
                {/each}
                {#if cashGapEven > 0 && cashGapEven <= gameState.cash && Math.abs(cashOffer - cashGapEven) > 0.01}
                  <button
                    type="button" class="tp-cash-chip tp-cash-chip-suggest"
                    onclick={evenCash} title="Top up cash to balance the trade"
                  >Even ${Math.ceil(cashGapEven)}</button>
                {/if}
              </div>
            </div>
            <span class="tp-summary-eq">=</span>
            <span class="tp-summary-total tp-total-accent">{money(giveTotal)}</span>
          </div>

          <div class="tp-summary-row">
            <span class="tp-summary-label">You get</span>
            <span class="tp-summary-goods">{money(getValue)}<span class="tp-summary-sub">goods</span></span>
            <span class="tp-summary-spacer"></span>
            <span class="tp-summary-spacer"></span>
            <span class="tp-summary-eq">=</span>
            <span class="tp-summary-total tp-total-accent">{money(getValue)}</span>
          </div>

          <div class="tp-summary-balance">
            {#if showRate}
              <div class="tp-scale tp-scale-{scaleTone}">
                <div class="tp-scale-track">
                  <div
                    class="tp-scale-fair"
                    style="left: {scalePct(BARTER_RATE_FLOOR)}%; width: {scalePct(BARTER_RATE_CEIL) - scalePct(BARTER_RATE_FLOOR)}%;"
                  ></div>
                  {#each scaleTicks as t}
                    <div class="tp-scale-tick" style="left: {scalePct(t)}%;">
                      <div class="tp-scale-tick-line"></div>
                      <div class="tp-scale-tick-label">{t.toFixed(2)}</div>
                    </div>
                  {/each}
                  <div class="tp-scale-notch" style="left: {scalePct(rate)}%;">
                    <div class="tp-scale-notch-val">{rate.toFixed(2)}×</div>
                  </div>
                </div>
                <div class="tp-scale-legend">Fair: 0.50 – 1.05</div>
              </div>
            {/if}
          </div>

          {#if tooThin || overpaying}
            <div class="tp-alert" class:tp-alert-bad={tooThin} class:tp-alert-warn={overpaying}>
              {#if tooThin}
                <strong>Trader refuses.</strong>
                {#if cashGapToFair > 0 && cashGapToFair <= gameState.cash}
                  Add <strong class="tp-accent">${Math.ceil(cashGapToFair)}</strong> cash or more goods.
                {:else}
                  Not enough cash to balance — give more goods.
                {/if}
              {:else}
                You're overpaying — trim cash or take more from the post.
              {/if}
            </div>
          {/if}
        {:else}
          <div class="tp-summary-cashrow">
            <div class="tp-summary-cashpair">
              <span class="tp-summary-label">Sell</span>
              <span class="tp-summary-goods tp-cash-credit">+{money(giveValue)}</span>
            </div>
            <div class="tp-summary-cashpair">
              <span class="tp-summary-label">Buy</span>
              <span class="tp-summary-goods tp-cash-debit">−{money(getValue)}</span>
            </div>
            <span class="tp-summary-eq">=</span>
            <div class="tp-summary-cashpair">
              <span class="tp-summary-label">Net</span>
              <span
                class="tp-summary-total"
                class:tp-total-danger={overBudget}
                class:tp-total-good={netCash < 0}
                class:tp-total-accent={netCash > 0 && !overBudget}
              >
                {netCash >= 0 ? money(netCash) : `+${money(-netCash)}`}
              </span>
              <span class="tp-summary-sub">
                {overBudget ? 'over budget' : netCash > 0 ? 'you pay' : netCash < 0 ? 'you receive' : '—'}
              </span>
            </div>
          </div>
        {/if}
      </header>

      <!-- ===== Two parallel item columns ===== -->
      <div class="tp-cols">
        {#if mode === 'cash' && !buysCash}
          <section class="tp-col tp-col-disabled">
            <header class="tp-col-head">
              <div class="tp-eyebrow">You give from</div>
              <div class="tp-col-title">Your wagon</div>
              <div class="tp-col-sub">sell for cash</div>
            </header>
            <p class="tp-pile-empty">
              This post trades in goods, not coin — switch to Barter to offer items.
            </p>
          </section>
        {:else}
          <TradeItemColumn
            title="Your wagon"
            subtitle={mode === 'barter' ? 'give in trade' : 'sell for cash'}
            side="give"
            groups={giveGroups}
            have={giveHave}
            maxFor={giveMax}
            perUnit={givePerUnit}
            perUnitKind={mode === 'barter' ? 'credit' : 'cash'}
            bind:values={give}
            {preferredSet}
            {refusedSet}
            barter={mode === 'barter'}
            emptyNote={mode === 'barter' ? 'Nothing here the trader will take.' : 'Nothing to sell.'}
          />
        {/if}

        <TradeItemColumn
          title={postName}
          subtitle={mode === 'barter' ? 'take from stock' : 'buy with cash'}
          side="get"
          groups={getGroups}
          have={getHave}
          maxFor={getMax}
          perUnit={getPerUnit}
          perUnitKind="cash"
          bind:values={get}
          {preferredSet}
          {refusedSet}
          barter={mode === 'barter'}
          emptyNote="No stock here right now."
        />
      </div>
    </div>

    <!-- ===== Footer ===== -->
    <footer class="tp-totals" class:tp-totals-bad={mode === 'cash' ? overBudget : tooThin}>
      <form method="POST" action="?/settleTrade&slot={qp}" class="tp-form">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="cashOffer" value={mode === 'barter' ? Math.round(cashOffer) : 0} />
        {#each getLines as [id, q] (id)}
          <input type="hidden" name="get_{id}" value={q} />
        {/each}
        {#each giveLines as [id, q] (id)}
          <input type="hidden" name="give_{id}" value={q} />
        {/each}
        <button type="button" class="tp-btn tp-btn-cancel" onclick={onclose}>Cancel</button>
        <button type="submit" class="tp-btn tp-btn-confirm" disabled={!canConfirm}>
          Confirm trade
        </button>
        {#if mode === 'cash' && overBudget}
          <span class="tp-foot-warn">Can't afford this — trim the list.</span>
        {:else if mode === 'barter' && tooThin}
          <span class="tp-foot-warn">Offer too thin — add cash or goods.</span>
        {/if}
      </form>
    </footer>
  </div>
</div>

<style>
  .trade-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(42, 29, 12, 0.80);
    z-index: 100;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
  }
  .trade-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    width: 100%;
    height: 100vh;
    padding: 0.6em;
    overflow: hidden;
    background: var(--of-paper);
    color: var(--of-ink);
  }

  /* ----- PostHeader ----- */
  .tp-head {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 1em;
    padding: 0.6em 0.9em;
    background: var(--of-paper-soft);
    border: 3px solid var(--post-accent);
    border-radius: 3px;
  }
  .tp-head-l { display: flex; align-items: center; gap: 0.8em; min-width: 0; }
  .tp-post-glyph { font-size: 2.4em; line-height: 1; }
  .tp-head-titles { display: flex; flex-direction: column; gap: 0.1em; min-width: 0; }
  .tp-eyebrow {
    font-size: 0.65em;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--post-accent);
    font-weight: 700;
  }
  .tp-head-name {
    margin: 0;
    color: var(--of-ink);
    font-size: 1.4em;
    line-height: 1.05;
    letter-spacing: 0.02em;
  }
  .tp-head-sub { font-size: 0.85em; color: var(--of-ink-soft); }
  .tp-prof { color: var(--post-accent); font-weight: 700; }
  .tp-head-r {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: 0.1em;
    white-space: nowrap;
  }
  .tp-cash {
    font-size: 1.5em;
    font-weight: 700;
    color: var(--of-ink);
    font-variant-numeric: tabular-nums;
  }
  .tp-blurb {
    margin: 0;
    padding: 0 0.3em;
    font-size: 0.86em;
    font-style: italic;
    color: var(--of-ink-soft);
    line-height: 1.4;
  }

  /* ----- PreferencesBanner ----- */
  .tp-banner {
    background: var(--of-paper-soft);
    border: 2px solid var(--of-rule);
    border-radius: 3px;
    padding: 0.6em 0.8em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .tp-banner-pref {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-size: 0.85em;
    flex-wrap: wrap;
  }
  .tp-banner-text { color: var(--of-ink); flex: 1; line-height: 1.4; }
  .tp-banner-bonus { font-size: 0.7em; letter-spacing: 0.06em; color: var(--of-good); font-weight: 700; }
  .tp-banner-penalty { font-size: 0.7em; letter-spacing: 0.06em; color: var(--of-bad); font-weight: 700; }
  .tp-chip {
    display: inline-block;
    padding: 0.15em 0.45em;
    font-size: 0.65em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
    border-radius: 2px;
    border: 1px solid;
    white-space: nowrap;
  }
  .tp-chip-prefers {
    color: var(--of-good);
    background: rgba(72, 108, 42, 0.15);
    border-color: rgba(72, 108, 42, 0.5);
  }
  .tp-chip-refused {
    color: var(--of-bad);
    background: rgba(138, 28, 12, 0.12);
    border-color: rgba(138, 28, 12, 0.5);
  }

  /* ----- Deal scroll area ----- */
  .tp-deal {
    display: flex;
    flex-direction: column;
    gap: 0.7em;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.2em;
  }

  /* ----- Sticky summary ----- */
  .tp-summary {
    position: sticky;
    top: -0.2em;
    z-index: 5;
    background: var(--of-paper-soft);
    border: 3px solid var(--post-accent);
    border-radius: 3px;
    padding: 0.7em 1em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    box-shadow: 0 6px 14px rgba(42, 29, 12, 0.35);
  }
  .tp-mode-toggle-row { display: flex; align-items: center; gap: 0.9em; flex-wrap: wrap; }
  .tp-mode-toggle {
    display: inline-flex;
    background: var(--of-paper-deep);
    border: 2px solid var(--of-rule);
    border-radius: 3px;
    padding: 2px;
    gap: 2px;
  }
  .tp-mode-tab {
    padding: 0.35em 1.1em;
    background: transparent;
    color: var(--of-ink-soft);
    border: 2px solid transparent;
    border-radius: 2px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.1em;
    font-size: 0.78em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .tp-mode-tab:hover:not(.tp-mode-tab-active) {
    color: var(--of-ink);
    background: var(--of-paper);
  }
  .tp-mode-tab-active {
    color: var(--of-paper-soft);
    background: var(--post-accent);
    border-color: var(--post-accent);
  }
  .tp-mode-hint {
    flex: 1;
    font-style: italic;
    font-size: 0.82em;
    color: var(--of-ink-soft);
    line-height: 1.4;
    min-width: 12em;
  }

  /* Cash-mode summary */
  .tp-summary-cashrow {
    display: flex;
    align-items: baseline;
    gap: 1.4em;
    flex-wrap: wrap;
  }
  .tp-summary-cashpair { display: flex; align-items: baseline; gap: 0.6em; }
  .tp-cash-credit { color: var(--of-good); }
  .tp-cash-debit { color: var(--of-rust); }

  /* Barter-mode summary rows */
  .tp-summary-row {
    display: grid;
    grid-template-columns: 6em minmax(7em, 9em) 0.8em minmax(0, 1fr) 0.8em 6em;
    align-items: center;
    gap: 0.6em;
    font-variant-numeric: tabular-nums;
  }
  .tp-summary-label {
    font-size: 0.72em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
    font-weight: 700;
  }
  .tp-summary-goods { font-size: 1em; font-weight: 700; color: var(--of-ink); }
  .tp-summary-sub {
    font-size: 0.68em;
    letter-spacing: 0.08em;
    color: var(--of-ink-soft);
    font-weight: 700;
    text-transform: uppercase;
    margin-left: 0.3em;
  }
  .tp-summary-plus, .tp-summary-eq { text-align: center; color: var(--of-ink-soft); font-weight: 700; }
  .tp-summary-spacer { display: block; }
  .tp-summary-cash {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    gap: 0.6em;
    background: rgba(148, 52, 14, 0.05);
    border: 1px dashed var(--of-rule);
    border-radius: 3px;
    padding: 0.25em 0.6em;
  }
  .tp-summary-cash-label {
    font-size: 0.68em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
    font-weight: 700;
  }
  .tp-summary-cash-val {
    font-size: 0.95em;
    color: var(--of-ink);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 3.5em;
  }
  .tp-cash-chips {
    display: flex;
    align-items: center;
    gap: 0.25em;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .tp-cash-chip {
    background: var(--of-paper-deep);
    color: var(--of-ink);
    border: 1px solid var(--of-rule);
    border-radius: 2px;
    padding: 0.25em 0.55em;
    font-size: 0.78em;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .tp-cash-chip:hover:not(:disabled) {
    border-color: var(--of-rust);
    color: var(--of-rust);
    background: var(--of-paper);
  }
  .tp-cash-chip:disabled { opacity: 0.35; cursor: not-allowed; }
  .tp-cash-chip-neg {
    color: var(--of-ink-soft);
    width: 1.6em;
    padding: 0.25em 0;
    text-align: center;
    font-size: 0.9em;
    font-weight: 400;
  }
  .tp-cash-chip-neg:hover:not(:disabled) {
    color: var(--of-bad);
    border-color: var(--of-bad);
    background: rgba(138, 28, 12, 0.08);
  }
  .tp-cash-chip-suggest {
    border-width: 2px;
    border-color: var(--post-accent);
    color: var(--post-accent);
  }
  .tp-summary-total { font-size: 1.3em; font-weight: 700; text-align: right; color: var(--of-ink); }
  .tp-total-accent { color: var(--post-accent); }
  .tp-total-good { color: var(--of-good); }
  .tp-total-danger { color: var(--of-bad); }

  .tp-summary-balance {
    display: flex;
    align-items: center;
    gap: 0.8em;
    padding-top: 0.4em;
    border-top: 1px dashed var(--of-rule);
  }

  /* ----- RateScale ----- */
  .tp-scale {
    flex: 1;
    padding: 0.4em 0.25em;
  }
  .tp-scale-track {
    position: relative;
    height: 2.4em;
    margin: 0.4em 1.1em 1.2em;
  }
  .tp-scale-track::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 50%;
    height: 4px;
    background: var(--of-paper-deep);
    border: 1px solid var(--of-rule);
    border-radius: 2px;
    transform: translateY(-50%);
  }
  .tp-scale-fair {
    position: absolute;
    top: 50%;
    height: 12px;
    background: rgba(72, 108, 42, 0.25);
    border: 1px solid rgba(72, 108, 42, 0.5);
    border-radius: 2px;
    transform: translateY(-50%);
    z-index: 1;
  }
  .tp-scale-tick { position: absolute; top: 0; bottom: 0; z-index: 2; transform: translateX(-50%); }
  .tp-scale-tick-line { width: 1px; height: 1em; background: var(--of-rule); margin: 0.7em auto 0; }
  .tp-scale-tick-label {
    margin-top: 0.25em;
    text-align: center;
    font-size: 0.65em;
    color: var(--of-ink-soft);
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
  }
  .tp-scale-notch {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 26px;
    border-radius: 2px;
    border: 2px solid var(--of-ink);
    background: var(--post-accent);
    transform: translate(-50%, -50%);
    z-index: 3;
  }
  .tp-scale-notch-val {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translate(-50%, -0.4em);
    background: var(--of-paper-deep);
    border: 2px solid var(--post-accent);
    padding: 0.1em 0.4em;
    border-radius: 3px;
    color: var(--of-ink);
    font-weight: 700;
    font-size: 0.78em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tp-scale-legend {
    text-align: center;
    font-size: 0.65em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--of-good);
    font-weight: 700;
  }
  .tp-scale-bad .tp-scale-notch-val { border-color: var(--of-bad); color: var(--of-bad); }
  .tp-scale-bad .tp-scale-notch { background: var(--of-bad); }
  .tp-scale-bad .tp-scale-legend { color: var(--of-bad); }

  /* ----- Alert ----- */
  .tp-alert {
    margin-top: 0.2em;
    padding: 0.4em 0.7em;
    border-radius: 2px;
    border: 1px solid;
    font-style: italic;
    font-size: 0.85em;
    line-height: 1.4;
  }
  .tp-alert strong { font-style: normal; font-weight: 700; }
  .tp-alert-bad {
    background: rgba(138, 28, 12, 0.08);
    border-color: rgba(138, 28, 12, 0.55);
    color: var(--of-ink);
  }
  .tp-alert-bad > strong:first-child { color: var(--of-bad); }
  .tp-alert-warn {
    background: rgba(168, 106, 24, 0.1);
    border-color: rgba(168, 106, 24, 0.5);
    color: var(--of-ink);
  }
  .tp-accent { color: var(--post-accent); }

  /* ----- Two columns ----- */
  .tp-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7em;
    align-items: flex-start;
  }
  .tp-col-disabled {
    background: var(--of-paper-soft);
    border: 2px solid var(--of-rule);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .tp-col-disabled .tp-col-head {
    padding: 0.7em 1em;
    background: var(--of-paper-deep);
    border-bottom: 3px solid var(--of-rule);
  }
  .tp-col-disabled .tp-col-title {
    color: var(--of-ink-soft);
    font-size: 1.15em;
    font-weight: 700;
    margin-top: 0.15em;
  }
  .tp-col-disabled .tp-col-sub {
    font-size: 0.78em; color: var(--of-ink-soft); font-style: italic; margin-top: 0.15em;
  }
  .tp-pile-empty { margin: 1em; color: var(--of-ink-soft); font-style: italic; font-size: 0.9em; }

  /* ----- Footer ----- */
  .tp-totals {
    background: var(--of-paper-soft);
    border: 3px solid var(--post-accent);
    border-radius: 3px;
    padding: 0.6em 0.9em;
    transition: border-color 0.15s;
  }
  .tp-totals-bad { border-color: var(--of-bad); }
  .tp-form { display: flex; align-items: center; gap: 0.8em; flex-wrap: wrap; }
  .tp-btn {
    font-size: 1em;
    padding: 0.6em 1.3em;
    font-weight: 700;
    cursor: pointer;
    border-radius: 3px;
  }
  .tp-btn-confirm {
    background: var(--post-accent);
    color: var(--of-paper-soft);
    border: 2px solid var(--of-rust-dark);
  }
  .tp-btn-confirm:hover:not(:disabled) { filter: brightness(1.1); }
  .tp-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  .tp-btn-cancel {
    color: var(--of-ink-soft);
    background: var(--of-paper);
    border: 2px solid var(--of-ink-soft);
  }
  .tp-foot-warn { color: var(--of-bad); font-size: 0.85em; font-style: italic; }

  @media (max-width: 900px) {
    .tp-cols { grid-template-columns: 1fr; }
    .tp-summary-row {
      grid-template-columns: 5em 1fr;
      gap: 0.3em 0.6em;
    }
    .tp-summary-plus, .tp-summary-eq, .tp-summary-spacer { display: none; }
    .tp-summary-cash { grid-column: 1 / -1; }
    .tp-summary-total { grid-column: 1 / -1; text-align: left; }
  }
</style>
