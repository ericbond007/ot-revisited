<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { PRICES } from '$lib/game/content/prices';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { getLandmark, type PostKind } from '$lib/game/content/landmarks';
  import { getProfession } from '$lib/game/content/professions';
  import { getWagon } from '$lib/game/content/wagons';
  import { postRemainingQty } from '$lib/game/systems/post-stock';
  import { ICON } from '$lib/data/icon-dictionary';
  import { POST_THEME } from '$lib/data/post-theme';
  import ItemTooltip from './ItemTooltip.svelte';
  import NumberStepper from './NumberStepper.svelte';
  import LandmarkIcon, { hasLandmarkIcon } from '$lib/ui/landmark-icons/LandmarkIcon.svelte';

  let { state: gameState, slot, onclose }: {
    state: GameState;
    slot: string;
    onclose: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // Landmark context — drives per-post flavor + stock.
  const hereId = $derived(gameState.location.atLandmarkId);
  const here = $derived(hereId ? getLandmark(hereId) : null);
  const postName = $derived(here?.name ?? 'Trading Post');
  const postKind = $derived<PostKind>(here?.postKind ?? 'frontier');
  const postBlurb = $derived(here?.blurb ?? 'A post on the trail.');
  // Defaults to true — only explicit false-flagged posts (U.S. Army, a
  // hostile native post, etc.) refuse to buy goods from the party.
  const buysFromEmigrants = $derived(here?.buysFromEmigrants !== false);
  // Per-post category exclusions (#204) — road ranches don't buy
  // fur-trade specialty (raw hides, robes, beads). Used in canSell.
  const excludedCats = $derived(new Set(here?.excludeBuyCategories ?? []));

  // Fallback stock for any trading_post without its own declared stock list.
  const FALLBACK_STOCK = [
    'flour', 'beans', 'bacon', 'gunpowder', 'lead_balls', 'percussion_caps', 'bandages', 'quinine',
    'coat', 'blanket', 'ox_shoes', 'rope'
  ];

  const theme = $derived(POST_THEME[postKind]);

  // Merchant / Banker buy discount + sell bonus (matches trade.ts).
  const hasMerchant = $derived(gameState.party.some((m) => !m.dead && m.profession === 'merchant'));
  const hasBanker = $derived(gameState.party.some((m) => !m.dead && m.profession === 'banker'));
  const buyMult = $derived(1 - (hasMerchant ? 0.15 : 0) - (hasBanker ? 0.10 : 0));
  const sellMult = $derived(1 + (hasMerchant ? 0.20 : 0) + (hasBanker ? 0.10 : 0));

  // Post stock (what the player can BUY here).
  // svelte-ignore state_referenced_locally
  const initialStock = (hereId ? getLandmark(hereId).stock : null) ?? FALLBACK_STOCK;
  // svelte-ignore state_referenced_locally
  const initialStockFiltered = initialStock.filter((id) => PRICES[id] && ITEMS[id]);
  const stockIds = $derived(
    (here?.stock ?? FALLBACK_STOCK).filter((id) => PRICES[id] && ITEMS[id])
  );

  // Items the player currently owns (and can sell).
  // svelte-ignore state_referenced_locally
  const initialOwnedIds = Object.entries(gameState.inventory)
    .filter(([id, qty]) => qty > 0 && PRICES[id])
    .map(([id]) => id);
  const ownedIds = $derived(
    Object.entries(gameState.inventory)
      .filter(([id, qty]) => qty > 0 && PRICES[id] && ITEMS[id])
      .map(([id]) => id)
  );

  // Unified item list = union of stock + owned. Each row can buy, sell, or
  // both (rendered as two sub-rows on the same line).
  // svelte-ignore state_referenced_locally
  const allIdsInitial = Array.from(new Set([...initialStockFiltered, ...initialOwnedIds]))
    .filter((id) => ITEMS[id] && PRICES[id]);
  const allIds = $derived(
    Array.from(new Set([...stockIds, ...ownedIds])).filter((id) => ITEMS[id] && PRICES[id])
  );

  // #1134 — Signed per-item state. Positive = buying that many; negative =
  // selling that many; 0 = no trade. Replaces the prior pair of buyQty /
  // sellQty state objects + their two stacked steppers per row. Buy and
  // sell are derived for the totals/weight math via Math.max(0, ±v).
  let tradeQty = $state<Record<string, number>>(
    Object.fromEntries(allIdsInitial.map((id) => [id, 0]))
  );
  // Keep qty dict in sync with derived lists — stock / inventory can shift
  // mid-modal (shouldn't, but be defensive; NumberStepper bindings break on
  // undefined keys).
  $effect(() => {
    for (const id of allIds) {
      if (tradeQty[id] === undefined) tradeQty[id] = 0;
    }
  });
  // Derived buy/sell views for downstream math (totals, weight, live panel).
  const buyQty = $derived(
    Object.fromEntries(
      Object.entries(tradeQty).map(([id, v]) => [id, Math.max(0, v)])
    )
  );
  const sellQty = $derived(
    Object.fromEntries(
      Object.entries(tradeQty).map(([id, v]) => [id, Math.max(0, -v)])
    )
  );

  // Group ids by item category so the list reads like a store shelf rather
  // than a flat alphabetical dump.
  const CATEGORY_ORDER: ItemCategory[] = [
    'food', 'feed', 'medicine', 'tool', 'wagon_part', 'weapon', 'ammo',
    'clothing', 'livestock', 'comfort', 'native_trade'
  ];
  const CATEGORY_LABEL: Record<ItemCategory, string> = {
    food: 'Food', feed: 'Feed', medicine: 'Medicine', weapon: 'Weapons', ammo: 'Ammunition',
    tool: 'Tools', wagon_part: 'Wagon parts', livestock: 'Livestock',
    clothing: 'Clothing', comfort: 'Comfort', native_trade: 'Trade goods'
  };
  const CATEGORY_ICON = ICON.inventory_categories;

  type Group = { cat: ItemCategory; ids: string[] };
  const groups = $derived.by<Group[]>(() => {
    const byCat: Partial<Record<ItemCategory, string[]>> = {};
    for (const id of allIds) {
      const meta = ITEMS[id];
      if (!meta) continue;
      (byCat[meta.category] ??= []).push(id);
    }
    return CATEGORY_ORDER
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => ({ cat: c, ids: byCat[c]!.sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name)) }));
  });

  // Totals — driven by raw buyQty/sellQty but applying the same multipliers
  // trade.ts uses on the server.
  const buyTotal = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (PRICES[id]?.buy ?? 0) * buyMult, 0)
  );
  const sellTotal = $derived(
    Object.entries(sellQty).reduce((s, [id, q]) => s + q * (PRICES[id]?.sell ?? 0) * sellMult, 0)
  );
  const netCost = $derived(buyTotal - sellTotal);
  const canAfford = $derived(Math.ceil(netCost) <= gameState.cash);
  const afterCash = $derived(gameState.cash - netCost);

  // Weight preview — change in wagon weight after the trade resolves.
  const currentWeight = $derived(
    Object.entries(gameState.inventory).reduce(
      (s, [id, q]) => s + (q || 0) * (ITEMS[id]?.weightLbPerUnit ?? 0), 0
    )
  );
  const weightDelta = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (ITEMS[id]?.weightLbPerUnit ?? 0), 0)
    - Object.entries(sellQty).reduce((s, [id, q]) => s + q * (ITEMS[id]?.weightLbPerUnit ?? 0), 0)
  );
  const afterWeight = $derived(currentWeight + weightDelta);
  const capacity = $derived(gameState.wagon.carryCapacity);
  const weightPct = $derived(Math.round((afterWeight / capacity) * 100));

  // Chicken coop cap per wagon model. The BUY stepper for chickens
  // clamps at (cap - currently-owned + selling) so the player can't
  // overstuff the coop. The server-side trade() re-checks this.
  const chickenCap = $derived(getWagon(gameState.wagon.model).chickenCap);
  const chickensOwned = $derived(gameState.inventory.chicken ?? 0);
  const chickensSelling = $derived(sellQty.chicken ?? 0);
  const chickenRoom = $derived(
    Math.max(0, chickenCap - chickensOwned + chickensSelling)
  );
  const weightColor = $derived(
    weightPct >= 100 ? '#e85a4a' :
    weightPct >= 90  ? '#c96a2a' :
    weightPct >= 70  ? '#f5c96a' : '#8bb96a'
  );

  // Live "what you'll have after" panel data — starter (current) + buys - sells.
  type LiveEntry = { id: string; name: string; current: number; delta: number; after: number };
  type LiveGroup = { cat: ItemCategory; entries: LiveEntry[] };
  const liveGroups = $derived.by<LiveGroup[]>(() => {
    const byCat: Partial<Record<ItemCategory, LiveEntry[]>> = {};
    const ids = new Set<string>([
      ...Object.keys(gameState.inventory),
      ...Object.keys(buyQty),
      ...Object.keys(sellQty)
    ]);
    for (const id of ids) {
      const meta = ITEMS[id];
      if (!meta) continue;
      const current = gameState.inventory[id] ?? 0;
      const delta = (buyQty[id] ?? 0) - (sellQty[id] ?? 0);
      const after = current + delta;
      if (after <= 0 && delta === 0) continue;
      (byCat[meta.category] ??= []).push({ id, name: meta.name, current, delta, after });
    }
    return CATEGORY_ORDER
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => ({ cat: c, entries: byCat[c]!.sort((a, b) => a.name.localeCompare(b.name)) }));
  });

  // Leader name + profession chip for the header.
  const leader = $derived(gameState.party[0]);
  const leaderProf = $derived(leader?.profession ? getProfession(leader.profession) : null);
</script>

<div class="trade-backdrop" onclick={onclose} role="presentation">
  <div class="trade-wrap post-{postKind}" onclick={(e) => e.stopPropagation()} role="presentation"
       style="--post-accent: {theme.accent};">

    <!-- Left rail: post flavor + live inventory + profession discount -->
    <aside class="side-rail">
      <section class="panel post-panel">
        <div class="post-head">
          {#if hereId && hasLandmarkIcon(hereId)}
            <LandmarkIcon id={hereId} size={48} className="post-glyph-svg" />
          {:else}
            <span class="post-glyph">{theme.glyph}</span>
          {/if}
          <div class="post-titles">
            <span class="post-tag">{theme.tag}</span>
            <h2 class="post-name">{postName}</h2>
          </div>
        </div>
        <p class="post-blurb">{postBlurb}</p>
        {#if !buysFromEmigrants}
          <div class="post-notice">Quartermaster — sells only, won't buy from you.</div>
        {/if}
      </section>

      <section class="panel live-inv-panel">
        <div class="panel-head">
          WHAT YOU'LL HAVE
          <span class="hint">after trade</span>
        </div>
        {#if liveGroups.length === 0}
          <p class="empty">Nothing yet.</p>
        {:else}
          <div class="live-groups">
            {#each liveGroups as g}
              <div class="live-group">
                <div class="live-group-head">
                  <span class="live-group-icon">{CATEGORY_ICON[g.cat]}</span>
                  <span class="live-group-label">{CATEGORY_LABEL[g.cat]}</span>
                </div>
                <div class="live-rows">
                  {#each g.entries as e}
                    <div class="live-row" class:sold-out={e.after === 0}>
                      <span class="live-name">{e.name}</span>
                      <span class="live-qty">
                        <strong>{e.after}</strong>
                        {#if e.delta > 0}<span class="live-delta add">+{e.delta}</span>
                        {:else if e.delta < 0}<span class="live-delta sub">{e.delta}</span>{/if}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      {#if hasMerchant || hasBanker}
        <section class="panel discount-panel">
          <div class="panel-head">PROFESSION BONUS</div>
          <p>
            {hasMerchant && hasBanker
              ? 'Merchant + Banker are haggling — both buy and sell are favorable.'
              : hasMerchant
                ? 'Merchant is haggling — −15% buy, +20% sell.'
                : 'Banker is bankrolling — −10% buy, +10% sell.'}
          </p>
        </section>
      {/if}
    </aside>

    <!-- Main column -->
    <div class="main-col">
      <!-- Header panel -->
      <header class="trade-head panel">
        <h1>{postName}</h1>
        <p class="lede">
          {#if leader}<strong>{leader.name}</strong>{#if leaderProf}, <span class="lede-prof">{leaderProf.name}</span>{/if} at the counter. {/if}
          Pick what to take, what to leave.
        </p>
      </header>

      <!-- Sticky totals bar -->
      <div class="totals-bar panel" class:overdraw={!canAfford}>
        <div class="total-cell">
          <span class="total-label">CASH</span>
          <span class="total-val cash">${gameState.cash}</span>
        </div>
        <div class="total-cell">
          <span class="total-label">BUY</span>
          <span class="total-val spend">${buyTotal.toFixed(2)}</span>
        </div>
        <div class="total-cell">
          <span class="total-label">SELL</span>
          <span class="total-val revenue">${sellTotal.toFixed(2)}</span>
        </div>
        <div class="total-cell">
          <span class="total-label">NET</span>
          <span class="total-val net" class:positive={netCost < 0}>
            {netCost >= 0 ? '−' : '+'}${Math.abs(netCost).toFixed(2)}
          </span>
        </div>
        <div class="total-cell">
          <span class="total-label">AFTER</span>
          <span class="total-val" class:danger={!canAfford}>
            ${afterCash.toFixed(2)}
          </span>
        </div>
        <div class="total-cell">
          <span class="total-label">WEIGHT</span>
          <span class="total-val small" style="color: {weightColor};">
            {Math.round(afterWeight)}/{capacity.toLocaleString()} · {weightPct}%
          </span>
        </div>
      </div>

      <form method="POST" action="?/trade&slot={qp}" class="trade-form">
        <div class="scroll-area">
          {#each groups as g}
            <section class="group">
              <div class="group-head">
                <span class="group-icon">{CATEGORY_ICON[g.cat]}</span>
                <span class="group-label">{CATEGORY_LABEL[g.cat]}</span>
              </div>
              <div class="item-grid">
                {#each g.ids as id}
                  {@const owned = gameState.inventory[id] ?? 0}
                  {@const inStock = stockIds.includes(id)}
                  {@const buying = buyQty[id] ?? 0}
                  {@const selling = sellQty[id] ?? 0}
                  {@const afterOwned = owned + buying - selling}
                  {@const isBulkCat = g.cat === 'food' || g.cat === 'ammo' || g.cat === 'feed'}
                  {@const canSell = buysFromEmigrants && owned > 0 && !excludedCats.has(ITEMS[id].category)}
                  {@const stockLeft = inStock && here ? postRemainingQty(gameState, here, id) : 0}
                  {@const perItemIcon = (ICON.inventory_items as Record<string, string>)[id]}
                  <div class="item-row" class:out-of-stock={!inStock && owned === 0}>
                    <div class="item-label">
                      <ItemTooltip {id}>
                        {#snippet children()}
                          <span class="item-name">
                            {#if perItemIcon}<span class="item-icon">{perItemIcon}</span>{/if}{ITEMS[id].name}
                          </span>
                        {/snippet}
                      </ItemTooltip>
                      <div class="price-row">
                        {#if inStock}
                          <span class="price buy-price">
                            buy ${(PRICES[id].buy * buyMult).toFixed(2)}
                          </span>
                          <span class="price stock-left" class:low={stockLeft <= 3} class:out={stockLeft === 0}>
                            {stockLeft === 0 ? 'out of stock' : `${stockLeft} left`}
                          </span>
                        {/if}
                        {#if canSell}
                          <span class="price sell-price">
                            sell ${(PRICES[id].sell * sellMult).toFixed(2)}
                          </span>
                        {:else if owned > 0}
                          <span class="price sell-price disabled">
                            won't buy (have {owned})
                          </span>
                        {/if}
                      </div>
                    </div>
                    <div class="item-controls">
                      {#if inStock || canSell}
                        {@const wagonCap = id === 'chicken' ? chickenRoom : (isBulkCat ? 999 : 99)}
                        {@const buyMax = inStock ? Math.min(wagonCap, stockLeft) : 0}
                        {@const sellMax = canSell ? owned : 0}
                        {@const v = tradeQty[id] ?? 0}
                        <div class="control-col">
                          <span class="control-tag" class:buy={v > 0} class:sell={v < 0}>
                            {v > 0 ? 'BUY' : v < 0 ? 'SELL' : (buyMax > 0 && sellMax > 0 ? 'TRADE' : buyMax > 0 ? 'BUY' : 'SELL')}
                          </span>
                          <NumberStepper
                            bind:value={tradeQty[id]}
                            min={-sellMax}
                            max={buyMax}
                            bulkSteps={isBulkCat && buyMax >= 10 ? [10, 50] : []}
                            ariaLabel="{ITEMS[id].name}: negative sells, positive buys"
                            hideValue
                            displayValue={afterOwned}
                            addedValue={v !== 0 ? v : undefined}
                          />
                          {#if id === 'chicken' && chickenRoom === 0 && v >= 0}
                            <span class="coop-full">coop full</span>
                          {/if}
                          <!-- #1134 — server reads buy_/sell_ prefixed form
                               fields; emit both, derived from signed value. -->
                          <input type="hidden" name="buy_{id}" value={Math.max(0, v)} />
                          <input type="hidden" name="sell_{id}" value={Math.max(0, -v)} />
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {/each}
        </div>

        <!-- Action bar -->
        <div class="action-bar panel">
          <button type="submit" class="confirm" disabled={!canAfford}>
            Confirm Trade
          </button>
          <button type="button" class="cancel" onclick={onclose}>Cancel</button>
          {#if !canAfford}
            <span class="warning">Can't afford this — trim the list.</span>
          {/if}
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  /* Full-viewport backdrop. The post-themed accent drives border + header
     tinting so each post feels distinct without a full theme rewrite. */
  .trade-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.92);
    z-index: 100;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
  }

  .trade-wrap {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 0.6em;
    width: 100%;
    height: 100vh;
    padding: 0.6em;
    overflow: hidden;
  }

  .side-rail {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.2em;
  }
  .main-col {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    min-height: 0;
    min-width: 0;
  }

  /* Post flavor panel — themed per post kind via --post-accent. */
  .post-panel {
    padding: 0.9em 1em;
    border-color: var(--post-accent);
    border-width: 3px;
  }
  .post-head {
    display: flex;
    align-items: center;
    gap: 0.7em;
    margin-bottom: 0.6em;
  }
  .post-glyph {
    font-size: 2.2em;
    line-height: 1;
  }
  .post-titles {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    min-width: 0;
  }
  .post-tag {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
    color: var(--post-accent);
    text-transform: uppercase;
  }
  .post-name {
    margin: 0;
    font-size: 1.25em;
    color: var(--c-tan-bright);
    line-height: 1.1;
  }
  .post-blurb {
    margin: 0;
    color: var(--c-tan);
    font-size: 0.9em;
    font-style: italic;
    line-height: 1.5;
  }
  .post-notice {
    margin-top: 0.7em;
    padding: 0.3em 0.5em;
    font-size: 0.75em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--c-tan-bright);
    background: rgba(0, 0, 0, 0.25);
    border-left: 3px solid var(--post-accent);
    border-radius: 0 2px 2px 0;
  }

  /* Live inventory — mirrors the outfit screen's sidebar. */
  .live-inv-panel { padding: 0.7em 0.9em; }
  .live-inv-panel .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5em;
  }
  .live-inv-panel .hint {
    font-size: 0.7em;
    color: var(--c-wood);
    font-style: italic;
    font-weight: normal;
    letter-spacing: normal;
  }
  .live-groups { display: flex; flex-direction: column; gap: 0.5em; }
  .live-group-head {
    display: flex;
    align-items: baseline;
    gap: 0.35em;
    padding-bottom: 0.15em;
    border-bottom: 1px solid rgba(138, 90, 42, 0.3);
    margin-bottom: 0.15em;
  }
  .live-group-icon { font-size: 1em; line-height: 1; }
  .live-group-label {
    font-size: 0.72em;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: var(--post-accent);
    text-transform: uppercase;
  }
  .live-rows { display: flex; flex-direction: column; }
  .live-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.15em 0.2em;
    font-size: 0.85em;
  }
  .live-row:nth-child(odd) { background: rgba(138, 90, 42, 0.06); }
  .live-row.sold-out { opacity: 0.45; text-decoration: line-through; }
  .live-name { color: var(--c-tan); }
  .live-qty { display: inline-flex; align-items: baseline; gap: 0.3em; }
  .live-qty strong {
    color: var(--post-accent);
    font-weight: 700;
    font-size: 1.05em;
  }
  .live-delta {
    font-size: 0.72em;
    font-weight: 700;
    padding: 0.1em 0.35em;
    border-radius: 2px;
  }
  .live-delta.add {
    color: #8bb96a;
    background: rgba(139, 185, 106, 0.15);
  }
  .live-delta.sub {
    color: #e85a4a;
    background: rgba(232, 90, 74, 0.15);
  }

  .discount-panel { padding: 0.7em 0.9em; }
  .discount-panel p {
    margin: 0;
    font-size: 0.85em;
    color: var(--c-tan);
    line-height: 1.4;
  }

  .panel-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
    margin-bottom: 0.4em;
  }

  /* Header of the main column */
  .trade-head {
    padding: 0.6em 0.9em;
    display: flex;
    align-items: baseline;
    gap: 0.9em;
    flex-wrap: wrap;
    border-color: var(--post-accent);
    border-width: 3px;
  }
  .trade-head h1 {
    margin: 0;
    color: var(--post-accent);
    letter-spacing: 0.05em;
    font-size: 1.3em;
  }
  .lede {
    margin: 0;
    color: var(--c-wood);
    font-size: 0.88em;
    font-style: italic;
  }
  .lede-prof { color: var(--post-accent); font-style: normal; font-weight: 700; }

  /* Sticky totals bar */
  .totals-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 0.5em 1em;
    padding: 0.7em 0.9em;
    transition: border-color 0.15s;
  }
  .totals-bar.overdraw { border-color: #e85a4a; }
  .total-cell { display: flex; flex-direction: column; gap: 0.1em; }
  .total-label {
    font-size: 0.65em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .total-val { font-weight: 700; font-size: 1.05em; color: var(--c-tan-bright); }
  .total-val.small { font-size: 0.85em; }
  .total-val.spend { color: #c96a2a; }
  .total-val.revenue { color: #8bb96a; }
  .total-val.net { color: #c96a2a; }
  .total-val.net.positive { color: #8bb96a; }
  .total-val.danger { color: #e85a4a; }

  /* Scrollable item list */
  .trade-form {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    flex: 1;
    min-height: 0;
  }
  .scroll-area {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 0.3em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .group {
    background: var(--c-panel);
    border: 2px solid var(--c-border);
    border-radius: 4px;
  }
  .group-head {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.55em 0.8em;
    background: var(--c-panel);
    border-bottom: 1px solid var(--post-accent);
    color: var(--c-tan);
    letter-spacing: 0.04em;
    font-weight: 700;
    font-size: 0.95em;
  }
  .group-icon { font-size: 1.2em; line-height: 1; }

  .item-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 0;
    padding: 0 0.4em 0.5em 0.4em;
  }
  .item-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.6em;
    padding: 0.45em 0.6em;
    border-bottom: 1px solid rgba(138, 90, 42, 0.25);
    min-width: 0;
  }
  .item-row:nth-child(odd) { background: rgba(138, 90, 42, 0.12); }
  .item-row:last-child { border-bottom: 0; }
  .item-row:hover { background: rgba(201, 106, 42, 0.14); }
  .item-row.out-of-stock { opacity: 0.5; }

  .item-label { display: flex; flex-direction: column; gap: 0.15em; min-width: 0; }
  .item-name { font-size: 0.95em; }
  .price-row {
    display: flex;
    gap: 0.6em;
    flex-wrap: wrap;
    font-size: 0.76em;
  }
  .price { color: var(--c-wood); }
  .buy-price::before { content: ''; }
  .sell-price { color: #8bb96a; }
  .stock-left {
    font-size: 0.85em;
    color: var(--c-tan);
    font-style: italic;
  }
  .stock-left.low { color: #c96a2a; font-weight: 700; }
  .stock-left.out { color: #e85a4a; font-weight: 700; font-style: normal; }
  .sell-price.disabled {
    color: var(--c-wood);
    text-decoration: line-through;
    opacity: 0.7;
  }

  /* Stepper cluster — when both BUY and SELL are possible, render them
     side-by-side with a small tag above each so they're easy to tell apart. */
  .item-controls {
    display: inline-flex;
    align-items: flex-end;
    gap: 0.8em;
  }
  .control-col {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15em;
  }
  .control-tag {
    font-size: 0.6em;
    letter-spacing: 0.15em;
    font-weight: 700;
    padding: 0.1em 0.4em;
    border-radius: 2px;
  }
  .control-tag.buy {
    color: var(--c-tan-bright);
    background: var(--post-accent);
  }
  .control-tag.sell {
    color: #8bb96a;
    background: rgba(139, 185, 106, 0.18);
    border: 1px solid rgba(139, 185, 106, 0.4);
  }
  .coop-full {
    font-size: 0.68em;
    letter-spacing: 0.08em;
    color: #e85a4a;
    font-style: italic;
    margin-top: 0.2em;
  }

  /* Action bar — pinned at the bottom of main-col */
  .action-bar {
    display: flex;
    gap: 0.8em;
    align-items: center;
    flex-wrap: wrap;
    padding: 0.7em 0.9em;
    border-color: var(--post-accent);
  }
  .confirm {
    font-size: 1.05em;
    padding: 0.7em 1.4em;
    background: var(--post-accent);
    color: var(--c-tan-bright);
  }
  .confirm:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  .cancel {
    color: var(--c-wood);
    background: var(--c-bg-raised);
    border: 2px solid var(--c-wood);
  }
  .warning {
    color: #e85a4a;
    font-size: 0.9em;
    font-style: italic;
  }

  .empty {
    color: var(--c-wood);
    font-style: italic;
    margin: 0.3em 0;
  }

  @media (max-width: 900px) {
    .trade-wrap {
      grid-template-columns: 1fr;
      height: auto;
      overflow: auto;
    }
    .side-rail { overflow-y: visible; }
    .scroll-area { overflow-y: visible; }
  }
</style>
