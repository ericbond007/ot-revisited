<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { PRICES } from '$lib/game/content/prices';
  import NumberStepper from '$lib/ui/NumberStepper.svelte';
  import ItemTooltip from '$lib/ui/ItemTooltip.svelte';
  import { getProfession } from '$lib/game/content/professions';

  let { data }: { data: { slot: string; state: GameState; buyables: string[] } } = $props();
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

  const totalCost = $derived(
    Object.entries(buyQty).reduce((s, [id, q]) => s + q * (PRICES[id]?.buy ?? 0) * buyMult, 0)
  );
  const canAfford = $derived(Math.ceil(totalCost) <= gs.cash);

  // Current starter-kit inventory — read-only summary of what the party
  // already has from their profession gear.
  const starterEntries = $derived(
    Object.entries(gs.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        id,
        qty,
        name: ITEMS[id]?.name ?? id,
        category: ITEMS[id]?.category ?? 'other' as ItemCategory
      }))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
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
  <header class="outfit-head">
    <h1>Outfit the Wagon</h1>
    <p class="lede">
      Last chance to stock up before leaving <strong>Independence, Missouri</strong>.
      Your starter kit is packed — add to it below. Anything left over becomes your travel cash.
    </p>
  </header>

  <!-- Sticky totals bar -->
  <div class="totals-bar panel" class:overdraw={!canAfford}>
    <div class="total-cell">
      <span class="total-label">CASH</span>
      <span class="total-val cash">${gs.cash}</span>
    </div>
    <div class="total-cell">
      <span class="total-label">SPEND</span>
      <span class="total-val spend">−${totalCost.toFixed(2)}</span>
    </div>
    <div class="total-cell">
      <span class="total-label">AFTER</span>
      <span class="total-val after" class:danger={!canAfford}>
        ${(gs.cash - totalCost).toFixed(2)}
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
    <div class="panel-head">YOUR STARTER KIT <span class="hint">from profession gear · read-only</span></div>
    {#if starterEntries.length === 0}
      <p class="empty">No starting supplies.</p>
    {:else}
      <div class="starter-grid">
        {#each starterEntries as e}
          <div class="starter-row">
            <ItemTooltip id={e.id}>
              {#snippet children()}
                <span class="starter-name">{e.name}</span>
              {/snippet}
            </ItemTooltip>
            <span class="starter-qty">×{e.qty}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Buy more — collapsible categories -->
  <form method="POST" action="?/outfit&slot={encodeURIComponent(data.slot)}">
    <section class="buy-head">
      <h2>Add more supplies</h2>
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

    <div class="actions">
      <button type="submit" class="depart" disabled={!canAfford}>
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
  .outfit-wrap {
    max-width: 900px;
    margin: 0 auto;
    padding: 1.2em 1.2em 3em 1.2em;
    display: flex;
    flex-direction: column;
    gap: 0.8em;
  }

  .outfit-head h1 {
    margin: 0 0 0.2em 0;
    color: var(--c-rust);
    letter-spacing: 0.05em;
  }
  .lede {
    margin: 0;
    color: var(--c-wood);
    font-size: 0.95em;
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

  /* Starter kit — compact read-only chip grid */
  .starter { padding: 0.7em 0.9em; }
  .starter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 0;
  }
  .starter-row {
    display: flex;
    justify-content: space-between;
    padding: 0.25em 0.5em;
    font-size: 0.9em;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.18);
  }
  .starter-row:nth-child(odd) { background: rgba(138, 90, 42, 0.06); }
  .starter-row:last-child { border-bottom: 0; }
  .starter-name { color: var(--c-tan); }
  .starter-qty { color: var(--c-rust); font-weight: 700; }
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

  .actions {
    display: flex;
    gap: 0.8em;
    margin-top: 1em;
    align-items: center;
    flex-wrap: wrap;
  }
  .depart {
    font-size: 1.05em;
    padding: 0.8em 1.5em;
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
