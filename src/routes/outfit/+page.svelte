<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { PRICES } from '$lib/game/content/prices';
  import NumberStepper from '$lib/ui/NumberStepper.svelte';
  import ItemTooltip from '$lib/ui/ItemTooltip.svelte';
  import WagonPicker from '$lib/ui/WagonPicker.svelte';
  import { getProfession } from '$lib/game/content/professions';
  import { getWagon, type WagonModel, type WagonModelId } from '$lib/game/content/wagons';

  let { data, form }: {
    data: {
      slot: string;
      state: GameState;
      buyables: string[];
      wagons: Record<WagonModelId, WagonModel>;
      defaultWagon: WagonModelId;
      oxPrice: number;
      maxExtraOxen: number;
    };
    form?: { error?: string } | null;
  } = $props();
  const gs = $derived(data.state);

  // Profession bonuses apply at Independence too — Banker/Merchant discount
  // the shopkeeper's quote. Mirror the math in trade.ts exactly.
  const hasMerchant = $derived(gs.party.some((m) => !m.dead && m.profession === 'merchant'));
  const hasBanker = $derived(gs.party.some((m) => !m.dead && m.profession === 'banker'));
  const buyMult = $derived(1 - (hasMerchant ? 0.15 : 0) - (hasBanker ? 0.10 : 0));

  // Pre-populate qty=0 for every buyable so NumberStepper bindings always have
  // a defined starting value. Initial capture is intentional — data.buyables
  // is static per-page-load.
  // svelte-ignore state_referenced_locally
  let buyQty = $state<Record<string, number>>(
    Object.fromEntries(data.buyables.filter((id) => PRICES[id] && ITEMS[id]).map((id) => [id, 0]))
  );

  // Wagon + oxen selections.
  // svelte-ignore state_referenced_locally
  let selectedWagon = $state<WagonModelId>(gs.wagon.model);
  let extraOxen = $state(0);

  const defaultWagonPrice = $derived(data.wagons[data.defaultWagon].price);
  const selectedWagonModel = $derived(getWagon(selectedWagon));
  const wagonCashDiff = $derived(getWagon(gs.wagon.model).price - selectedWagonModel.price);

  const suppliesCost = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (PRICES[id]?.buy ?? 0) * buyMult, 0)
  );
  const oxenCost = $derived(extraOxen * data.oxPrice);
  const totalCost = $derived(suppliesCost + oxenCost - wagonCashDiff);
  const canAfford = $derived(Math.ceil(totalCost) <= gs.cash);

  // Weight of supplies being bought (independent of starter inventory weight,
  // which is already packed). Shown against the selected wagon's cap so the
  // player sees the headroom.
  const suppliesWeight = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (ITEMS[id]?.weightLbPerUnit ?? 0), 0)
  );
  const starterWeight = $derived(
    Object.entries(gs.inventory).reduce(
      (s, [id, q]) => s + (q || 0) * (ITEMS[id]?.weightLbPerUnit ?? 0),
      0
    )
  );
  const totalWeight = $derived(starterWeight + suppliesWeight);
  const capacity = $derived(selectedWagonModel.carryCapacity);
  const weightPct = $derived(Math.round((totalWeight / capacity) * 100));
  const weightColor = $derived(
    weightPct >= 100 ? '#e85a4a' :
    weightPct >= 80  ? '#c96a2a' :
    weightPct >= 60  ? '#f5c96a' : '#8bb96a'
  );

  // Oxen / team factor readout.
  const startingOxenCount = $derived(gs.oxen.length);
  const totalOxen = $derived(startingOxenCount + extraOxen);
  const teamStatus = $derived.by<{ tone: 'ok' | 'warn' | 'bad'; text: string }>(() => {
    const m = selectedWagonModel;
    if (totalOxen < m.minTeam) {
      return {
        tone: 'bad',
        text: `${m.name} needs at least ${m.minTeam} oxen to pull. You have ${totalOxen}.`
      };
    }
    if (totalOxen < m.optimalTeam) {
      const pct = Math.round((totalOxen / m.optimalTeam) * 100);
      return {
        tone: 'warn',
        text: `${m.name} is designed for ${m.optimalTeam} oxen — with ${totalOxen}, you'll travel at ${pct}% of this wagon's speed.`
      };
    }
    if (totalOxen === m.optimalTeam) {
      return { tone: 'ok', text: `Team at full strength (${totalOxen} oxen).` };
    }
    return {
      tone: 'ok',
      text: `${totalOxen} oxen — ${totalOxen - m.optimalTeam} spare${totalOxen - m.optimalTeam === 1 ? '' : 's'} for insurance.`
    };
  });
  const canDepart = $derived(canAfford && teamStatus.tone !== 'bad');

  // Current starter-kit inventory — read-only summary of what the party
  // already has from their profession gear. Grouped by category so the
  // player can scan "what food / medicine / tools do I already have?"
  // without reading every row.
  type StarterGroup = {
    cat: ItemCategory;
    entries: Array<{ id: string; qty: number; name: string; weight: number }>;
    totalWeight: number;
  };
  const starterGroups = $derived.by<StarterGroup[]>(() => {
    const order: ItemCategory[] = [
      'food', 'medicine', 'tool', 'wagon_part', 'weapon', 'ammo', 'clothing', 'livestock', 'comfort', 'native_trade'
    ];
    const byCat: Partial<Record<ItemCategory, StarterGroup['entries']>> = {};
    for (const [id, qty] of Object.entries(gs.inventory)) {
      if (!qty || qty <= 0) continue;
      const meta = ITEMS[id];
      if (!meta) continue;
      (byCat[meta.category] ??= []).push({
        id,
        qty,
        name: meta.name,
        weight: meta.weightLbPerUnit * qty
      });
    }
    return order
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => {
        const entries = byCat[c]!.sort((a, b) => a.name.localeCompare(b.name));
        const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
        return { cat: c, entries, totalWeight };
      });
  });
  const starterItemCount = $derived(
    starterGroups.reduce((s, g) => s + g.entries.length, 0)
  );
  const starterTotalWeight = $derived(
    starterGroups.reduce((s, g) => s + g.totalWeight, 0)
  );

  // Group buyables by category — we render categories as collapsible sections
  // so the list isn't a wall of rows.
  type Group = { cat: ItemCategory; ids: string[] };
  const groups = $derived.by<Group[]>(() => {
    const byCat: Partial<Record<ItemCategory, string[]>> = {};
    for (const id of data.buyables) {
      const meta = ITEMS[id];
      if (!meta || !PRICES[id]) continue;
      (byCat[meta.category] ??= []).push(id);
    }
    const order: ItemCategory[] = [
      'food', 'medicine', 'tool', 'wagon_part', 'clothing', 'weapon', 'ammo', 'livestock', 'comfort', 'native_trade'
    ];
    return order
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => ({ cat: c, ids: byCat[c]! }));
  });

  const CATEGORY_LABEL: Record<ItemCategory, string> = {
    food: 'Food',
    medicine: 'Medicine',
    weapon: 'Weapons',
    ammo: 'Ammunition',
    tool: 'Tools',
    wagon_part: 'Wagon parts',
    livestock: 'Livestock',
    clothing: 'Clothing',
    comfort: 'Comfort',
    native_trade: 'Trade goods'
  };
  const CATEGORY_ICON: Record<ItemCategory, string> = {
    food: '🍖',
    medicine: '💊',
    weapon: '🔫',
    ammo: '🎯',
    tool: '🔨',
    wagon_part: '🛠️',
    livestock: '🐂',
    clothing: '🧥',
    comfort: '🎁',
    native_trade: '🪶'
  };

  // Default-open sections: essentials only. Everything else is collapsed
  // so the page reads quickly on first load. Clicking a header toggles.
  const DEFAULT_OPEN: ItemCategory[] = ['food', 'medicine', 'tool'];
  let openCats = $state<Record<ItemCategory, boolean>>(
    {
      food: true, medicine: true, weapon: false, ammo: false, tool: true,
      wagon_part: false, livestock: false, clothing: false, comfort: false, native_trade: false
    }
  );
  function toggleCat(c: ItemCategory) {
    openCats[c] = !openCats[c];
  }

  // Subtotal per group — helps the player see where the spend is going
  // without expanding every category.
  function groupSubtotal(ids: string[]): number {
    return ids.reduce((s, id) => s + (buyQty[id] ?? 0) * (PRICES[id]?.buy ?? 0) * buyMult, 0);
  }
  function groupQtyCount(ids: string[]): number {
    return ids.reduce((n, id) => n + (buyQty[id] ?? 0), 0);
  }

  const leader = $derived(gs.party[0]);
</script>

<div class="outfit-wrap">
  <header class="outfit-head panel">
    <h1>Outfit the Wagon</h1>
    <p class="lede">
      Last chance to stock up at <strong>Independence, Missouri</strong> — anything left
      over becomes your travel cash.
    </p>
  </header>

  <!-- Totals bar (fixed, above the scroll) -->
  <div class="totals-bar panel" class:overdraw={!canAfford}>
    <div class="total-cell">
      <span class="total-label">CASH</span>
      <span class="total-val cash">${gs.cash}</span>
    </div>
    <div class="total-cell">
      <span class="total-label">SPEND</span>
      <span class="total-val spend">{totalCost >= 0 ? '−' : '+'}${Math.abs(totalCost).toFixed(2)}</span>
    </div>
    <div class="total-cell">
      <span class="total-label">AFTER</span>
      <span class="total-val after" class:danger={!canAfford}>
        ${(gs.cash - totalCost).toFixed(2)}
      </span>
    </div>
    <div class="total-cell">
      <span class="total-label">WEIGHT</span>
      <span class="total-val small" style="color: {weightColor};">
        {Math.round(totalWeight)} / {capacity.toLocaleString()} lb · {weightPct}%
      </span>
    </div>
    {#if hasMerchant || hasBanker}
      <div class="total-cell">
        <span class="total-label">DISCOUNT</span>
        <span class="total-val small">
          {hasMerchant && hasBanker ? 'Merchant+Banker' : hasMerchant ? 'Merchant' : 'Banker'} · ×{buyMult.toFixed(2)}
        </span>
      </div>
    {/if}
  </div>

  {#if form?.error}
    <div class="panel form-error">{form.error}</div>
  {/if}

  <form method="POST" action="?/outfit&slot={encodeURIComponent(data.slot)}" class="outfit-form">

    <div class="scroll-area">

      <!-- Party -->
      <section class="party-preview panel">
        <div class="panel-head">PARTY</div>
        <div class="party-list">
          {#each gs.party as m}
            {@const prof = m.profession ? getProfession(m.profession) : null}
            <div class="party-row">
              <strong>{m.name}</strong>
              {#if prof}<span class="prof">({prof.name})</span>{/if}
            </div>
          {/each}
        </div>
      </section>

      <!-- Starter kit — read-only summary of what the party already has -->
      <section class="starter panel">
    <div class="panel-head">
      YOUR STARTER KIT
      <span class="hint">
        from profession gear · {starterItemCount} item{starterItemCount === 1 ? '' : 's'} ·
        {Math.round(starterTotalWeight)} lb
      </span>
    </div>
    {#if starterGroups.length === 0}
      <p class="empty">No starting supplies.</p>
    {:else}
      <div class="starter-categories">
        {#each starterGroups as g}
          <div class="starter-group">
            <div class="starter-group-head">
              <span class="starter-group-icon">{CATEGORY_ICON[g.cat]}</span>
              <span class="starter-group-label">{CATEGORY_LABEL[g.cat]}</span>
              <span class="starter-group-wt">{Math.round(g.totalWeight)} lb</span>
            </div>
            <div class="starter-rows">
              {#each g.entries as e}
                <div class="starter-row">
                  <ItemTooltip id={e.id}>
                    {#snippet children()}
                      <span class="starter-name">{e.name}</span>
                    {/snippet}
                  </ItemTooltip>
                  <span class="starter-qty">×<strong>{e.qty}</strong></span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

      <!-- Wagon picker -->
      <section class="wagon-section panel">
        <div class="panel-head">
          CHOOSE YOUR WAGON
          <span class="hint">Prairie schooner is pre-paid. Light refunds. Heavy costs extra.</span>
        </div>
        <WagonPicker
          models={data.wagons}
          bind:value={selectedWagon}
          defaultPrice={defaultWagonPrice}
        />
      </section>

      <!-- Oxen -->
      <section class="oxen-section panel">
        <div class="panel-head">
          OXEN
          <span class="hint">${data.oxPrice} each at Independence. Extras are insurance.</span>
        </div>
        <div class="oxen-row">
          <div class="oxen-counts">
            <span class="oxen-glyph">🐂</span>
            <span class="oxen-have">Starter: <strong>{startingOxenCount}</strong></span>
            <span class="oxen-plus">+</span>
            <NumberStepper
              name="extraOxen"
              bind:value={extraOxen}
              min={0}
              max={data.maxExtraOxen}
              ariaLabel="Extra oxen to buy"
            />
            <span class="oxen-total">= <strong>{totalOxen}</strong> oxen</span>
          </div>
          <div class="team-status tone-{teamStatus.tone}">{teamStatus.text}</div>
        </div>
      </section>

      <!-- Supplies -->
      <section class="buy-head">
        <h2>Add supplies</h2>
        <p class="hint">Tap a category to expand. Food, Medicine, and Tools are open by default.</p>
      </section>

      {#each groups as g}
        {@const qtyInGroup = groupQtyCount(g.ids)}
        {@const subtotal = groupSubtotal(g.ids)}
        {@const isOpen = openCats[g.cat]}
        <section class="group" class:open={isOpen}>
          <button type="button" class="group-head" onclick={() => toggleCat(g.cat)}>
            <span class="group-icon">{CATEGORY_ICON[g.cat]}</span>
            <span class="group-label">{CATEGORY_LABEL[g.cat]}</span>
            {#if qtyInGroup > 0}
              <span class="group-count">+{qtyInGroup} items · ${subtotal.toFixed(2)}</span>
            {/if}
            <span class="group-chev">{isOpen ? '▾' : '▸'}</span>
          </button>
          {#if isOpen}
            <div class="item-grid">
              {#each g.ids as id}
                {@const price = PRICES[id].buy * buyMult}
                {@const owned = gs.inventory[id] ?? 0}
                <div class="item-row">
                  <div class="item-label">
                    <div class="item-name-row">
                      <ItemTooltip {id}>
                        {#snippet children()}
                          <span class="item-name">{ITEMS[id].name}</span>
                        {/snippet}
                      </ItemTooltip>
                      {#if owned > 0}
                        <span class="owned-tag" title="Already in your starter kit">has {owned}</span>
                      {/if}
                    </div>
                    <span class="item-price">${price.toFixed(2)} ea</span>
                  </div>
                  <NumberStepper
                    name="buy_{id}"
                    bind:value={buyQty[id]}
                    min={0}
                    max={99}
                    ariaLabel="Buy {ITEMS[id].name}"
                  />
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/each}

    </div><!-- /.scroll-area -->

    <!-- Fixed action bar at the bottom -->
    <div class="action-bar panel">
      <button type="submit" class="depart" disabled={!canDepart}>
        {leader ? `Begin ${leader.name}'s Journey` : 'Begin Journey'}
      </button>
      <a href="/" class="back">Cancel</a>
      {#if !canAfford}
        <span class="warning">Can't afford this — trim the list.</span>
      {/if}
    </div>
  </form>
</div>

<style>
  /* Lock the page to the viewport so the outfit screen reads like the play
     screen — totals + actions always visible, only the content area scrolls.
     Falls back to regular document flow on narrow screens (<= 900px) where
     the sticky actions bar would crowd the content too much. */
  .outfit-wrap {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0.6em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    height: 100vh;
    overflow: hidden;
  }

  .outfit-form {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    flex: 1;
    min-height: 0;
  }
  .scroll-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.3em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .action-bar {
    display: flex;
    gap: 0.8em;
    align-items: center;
    flex-wrap: wrap;
    padding: 0.7em 0.9em;
    border-color: var(--c-rust);
  }

  @media (max-width: 900px) {
    .outfit-wrap {
      height: auto;
      overflow: visible;
      padding: 1em;
    }
    .scroll-area {
      overflow-y: visible;
    }
  }

  .outfit-head {
    padding: 0.6em 0.9em;
    display: flex;
    align-items: baseline;
    gap: 0.9em;
    flex-wrap: wrap;
  }
  .outfit-head h1 {
    margin: 0;
    color: var(--c-rust);
    letter-spacing: 0.05em;
    font-size: 1.3em;
  }
  .lede {
    margin: 0;
    color: var(--c-wood);
    font-size: 0.88em;
    font-style: italic;
  }
  .hint {
    color: var(--c-wood);
    font-size: 0.82em;
    font-style: italic;
    font-weight: normal;
    letter-spacing: normal;
    margin-left: 0.4em;
  }

  /* Panels share a consistent head style */
  .panel-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
    margin-bottom: 0.4em;
  }
  .party-preview { padding: 0.7em 0.9em; }
  .party-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2em 1em;
    font-size: 0.95em;
  }
  .party-row { display: inline-flex; gap: 0.3em; align-items: baseline; }
  .prof { color: var(--c-wood); font-size: 0.85em; }

  /* Starter kit — grouped by category so quantities are easy to scan */
  .starter { padding: 0.8em 1em; }
  .starter-categories {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 0.9em 1.2em;
  }
  .starter-group {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
  }
  .starter-group-head {
    display: flex;
    align-items: baseline;
    gap: 0.4em;
    padding: 0.15em 0;
    border-bottom: 2px solid var(--c-wood);
    margin-bottom: 0.25em;
  }
  .starter-group-icon { font-size: 1.1em; line-height: 1; }
  .starter-group-label {
    font-size: 0.8em;
    letter-spacing: 0.12em;
    font-weight: 700;
    color: var(--c-rust);
    text-transform: uppercase;
  }
  .starter-group-wt {
    margin-left: auto;
    font-size: 0.75em;
    color: var(--c-wood);
    font-style: italic;
  }
  .starter-rows {
    display: flex;
    flex-direction: column;
  }
  .starter-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.28em 0.4em;
    font-size: 1em;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.18);
  }
  .starter-row:nth-child(odd) { background: rgba(138, 90, 42, 0.06); }
  .starter-row:last-child { border-bottom: 0; }
  .starter-name { color: var(--c-tan); }
  .starter-qty {
    color: var(--c-wood);
    font-size: 0.9em;
  }
  .starter-qty strong {
    color: var(--c-rust);
    font-weight: 700;
    font-size: 1.15em;
    margin-left: 0.1em;
  }
  .empty {
    color: var(--c-wood);
    font-style: italic;
    margin: 0.3em 0;
  }

  /* Totals — sticky bar at the top of the flow */
  .totals-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5em 1em;
    padding: 0.7em 0.9em;
    transition: border-color 0.15s;
    position: sticky;
    top: 0.3em;
    z-index: 5;
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
  .total-val.cash { color: var(--c-tan-bright); }
  .total-val.spend { color: #c96a2a; }
  .total-val.danger { color: #e85a4a; }

  .form-error {
    padding: 0.7em 0.9em;
    border-color: #e85a4a;
    color: #e85a4a;
    font-weight: 700;
  }

  /* Wagon + oxen sections */
  .wagon-section, .oxen-section {
    padding: 0.7em 0.9em;
  }
  .wagon-section .panel-head, .oxen-section .panel-head {
    margin-bottom: 0.5em;
  }

  .oxen-row {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }
  .oxen-counts {
    display: flex;
    align-items: center;
    gap: 0.5em;
    flex-wrap: wrap;
  }
  .oxen-glyph { font-size: 1.4em; line-height: 1; }
  .oxen-have, .oxen-total, .oxen-plus {
    font-size: 0.95em;
    color: var(--c-tan);
  }
  .oxen-have strong, .oxen-total strong {
    color: var(--c-tan-bright);
  }
  .oxen-plus { color: var(--c-wood); font-weight: 700; }

  .team-status {
    padding: 0.4em 0.6em;
    border-radius: 3px;
    font-size: 0.88em;
    font-style: italic;
    line-height: 1.3;
  }
  .team-status.tone-ok {
    background: rgba(139, 185, 106, 0.15);
    color: var(--c-tan);
    border-left: 3px solid #8bb96a;
  }
  .team-status.tone-warn {
    background: rgba(245, 201, 106, 0.15);
    color: var(--c-tan);
    border-left: 3px solid #f5c96a;
  }
  .team-status.tone-bad {
    background: rgba(232, 90, 74, 0.15);
    color: #f1a398;
    border-left: 3px solid #e85a4a;
    font-weight: 700;
    font-style: normal;
  }

  /* Buy sections */
  .buy-head { margin-top: 0.5em; }
  .buy-head h2 {
    margin: 0;
    color: var(--c-rust);
    font-size: 1.1em;
    letter-spacing: 0.05em;
  }
  .buy-head .hint { display: block; margin: 0.2em 0 0 0; }

  .group {
    /* Override default button chrome — use panel styling inside */
    background: var(--c-panel);
    border: 2px solid var(--c-border);
    border-radius: 4px;
  }
  .group.open {
    border-color: var(--c-wood);
  }
  .group-head {
    /* Override default button chrome */
    display: flex;
    align-items: center;
    gap: 0.5em;
    width: 100%;
    padding: 0.5em 0.8em;
    background: transparent;
    border: 0;
    cursor: pointer;
    font-family: inherit;
    color: var(--c-tan);
    text-align: left;
    letter-spacing: 0.04em;
    text-transform: none;
    font-weight: 700;
    font-size: 0.95em;
  }
  .group-head:hover { color: var(--c-tan-bright); }
  .group-icon { font-size: 1.2em; line-height: 1; }
  .group-label { flex: 1; }
  .group-count {
    font-size: 0.8em;
    color: var(--c-rust);
    font-weight: 700;
    margin-right: 0.4em;
  }
  .group-chev {
    color: var(--c-wood);
    font-size: 0.85em;
  }

  .item-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0;
    padding: 0 0.4em 0.5em 0.4em;
  }
  .item-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.5em;
    padding: 0.3em 0.5em;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.18);
  }
  .item-row:nth-child(odd) { background: rgba(138, 90, 42, 0.06); }
  .item-row:last-child { border-bottom: 0; }
  .item-label { display: flex; flex-direction: column; gap: 0.1em; min-width: 0; }
  .item-name-row {
    display: flex;
    align-items: baseline;
    gap: 0.4em;
    flex-wrap: wrap;
  }
  .item-name { font-size: 0.95em; }
  .item-price { font-size: 0.76em; color: var(--c-wood); }
  .owned-tag {
    font-size: 0.7em;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: var(--c-rust);
    background: rgba(201, 106, 42, 0.12);
    padding: 0.1em 0.4em;
    border-radius: 2px;
    text-transform: uppercase;
  }

  .depart {
    font-size: 1.05em;
    padding: 0.7em 1.4em;
  }
  .back {
    color: var(--c-wood);
    text-decoration: underline;
  }
  .warning {
    color: #e85a4a;
    font-size: 0.9em;
    font-style: italic;
  }
</style>
