<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { foodConsumedToday } from '$lib/game/systems/consumption';
  import { warmthFor } from '$lib/game/systems/warmth';
  import { canBoilWater } from '$lib/game/systems/water-purity';
  let { state, onopen }: { state: GameState; onopen?: () => void } = $props();

  const CATEGORY_ORDER: ItemCategory[] = [
    'food',
    'feed',
    'medicine',
    'tool',
    'wagon_part',
    'weapon',
    'ammo',
    'clothing',
    'livestock',
    'comfort',
    'native_trade'
  ];
  const CATEGORY_LABEL: Record<ItemCategory, string> = {
    food: 'Food',
    feed: 'Feed',
    medicine: 'Medicine',
    weapon: 'Weapons',
    ammo: 'Ammo',
    tool: 'Tools',
    wagon_part: 'Parts',
    livestock: 'Livestock',
    clothing: 'Clothing',
    comfort: 'Comfort',
    native_trade: 'Trade'
  };
  const CATEGORY_ICON: Record<ItemCategory, string> = {
    food: '🍖',
    feed: '🌾',
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

  type Entry = { id: string; name: string; qty: number; weight: number };
  type Group = { cat: ItemCategory; entries: Entry[] };

  const groups = $derived.by<Group[]>(() => {
    const byCat: Partial<Record<ItemCategory, Entry[]>> = {};
    for (const [id, qty] of Object.entries(state.inventory)) {
      if (!qty || qty <= 0) continue;
      const meta = ITEMS[id];
      if (!meta) continue;
      (byCat[meta.category] ??= []).push({
        id,
        name: meta.name,
        qty,
        weight: meta.weightLbPerUnit * qty
      });
    }
    return CATEGORY_ORDER
      .filter((c) => byCat[c] && byCat[c]!.length > 0)
      .map((c) => ({
        cat: c,
        entries: byCat[c]!.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
      }));
  });

  // Food summary — pulls the one stat the player cares about most to the
  // top of the panel so they don't have to scan the Food group to answer
  // "how much food do we have?".
  const foodGroup = $derived(groups.find((g) => g.cat === 'food'));
  // Exclude coffee/tea/sugar from the days-remaining calc — they're
  // not calorie staples (coffee/tea are brewed via applyHotDrinks,
  // sugar is a small bonus that doesn't fill bellies).
  const foodLb = $derived(foodGroup
    ? foodGroup.entries.reduce(
        (s, e) => s + (typeof ITEMS[e.id]?.foodDrawOrder === 'number' ? e.weight : 0),
        0
      )
    : 0);
  const dailyFoodLb = $derived(foodConsumedToday(state));
  const foodDays = $derived(dailyFoodLb > 0 ? Math.floor(foodLb / dailyFoodLb) : 0);
  const foodColor = $derived(
    foodDays >= 30 ? '#8bb96a' :
    foodDays >= 14 ? '#f5c96a' :
    foodDays >= 7  ? '#c96a2a' : '#e85a4a'
  );

  // Warmth — aggregate clothing score (0-100). Each item warms one
  // body, so a party of N needs N of each warmth item to max it out.
  const warmth = $derived(warmthFor(state));
  const aliveCount = $derived(state.party.filter((m) => !m.dead).length);
  const warmthColor = $derived(
    warmth >= 75 ? '#8bb96a' :
    warmth >= 50 ? '#f5c96a' :
    warmth >= 25 ? '#c96a2a' : '#e85a4a'
  );
  const warmthTip = $derived(
    `Warmth: ${warmth}/100. Each item warms one body — for a party of ${aliveCount}, ` +
    `buy ${aliveCount} coats, ${aliveCount} blankets, etc. ` +
    `Mitigates cold-water ford chill and cold-camp HP loss when no fire. ` +
    `Coat / blanket / buffalo robe = 25 each. Boots = 15. Moccasins = 10.`
  );

  // Water — clean + dirty. Pre-germ-theory parties (1848-1853 with no
  // doctor) don't perceive the distinction; we collapse to total water
  // for them. Once knowledge is unlocked, the breakdown shows.
  const knowsBoiling = $derived(canBoilWater(state));
  const dirtyGal = $derived(state.resources.dirtyWater ?? 0);
  const totalGal = $derived(state.resources.water + dirtyGal);

  const totalWeight = $derived(
    Math.round(groups.reduce((s, g) => s + g.entries.reduce((a, e) => a + e.weight, 0), 0))
  );
  const capacity = $derived(state.wagon.carryCapacity);
  const weightPct = $derived(Math.min(100, Math.round((totalWeight / capacity) * 100)));
  const weightColor = $derived(
    weightPct < 70 ? '#8bb96a' :
    weightPct < 90 ? '#f5c96a' :
    weightPct < 100 ? '#c96a2a' : '#e85a4a'
  );
</script>

<button type="button" class="panel inventory-panel" onclick={onopen} title="Click for full inventory">
  <div class="ip-head">
    <h4>INVENTORY</h4>
    <span class="expand-hint">▸</span>
  </div>

  <div class="stats">
    <span class="cash">💵 ${state.cash}</span>
    {#if knowsBoiling && dirtyGal > 0}
      <span class="water" title="Clean / dirty / capacity. Boil dirty before drinking.">
        💧 {state.resources.water}<span class="water-dirty">+{dirtyGal}</span>/{state.resources.waterCap} gal
      </span>
    {:else}
      <span class="water">💧 {totalGal}/{state.resources.waterCap} gal</span>
    {/if}
  </div>

  <!-- At-a-glance food summary. Days remaining is the number the player
       actually uses to make decisions; lb is included for the math-minded. -->
  <div class="food-summary" title="{Math.round(foodLb)} lb of food / {dailyFoodLb} lb per day">
    <span class="food-icon">🍖</span>
    <span class="food-days" style="color: {foodColor};">
      <strong>{foodDays}</strong>
      <span class="food-unit">days</span>
    </span>
    <span class="food-lb">{Math.round(foodLb)} lb</span>
  </div>

  <div class="weight-row">
    <span class="weight-label">Weight</span>
    <div class="weight-bar">
      <div class="weight-fill" style="width: {weightPct}%; background: {weightColor};"></div>
    </div>
    <span class="weight-num" style="color: {weightColor};">{totalWeight}/{capacity}</span>
  </div>

  <div class="weight-row" title={warmthTip}>
    <span class="weight-label">🧥 Warmth</span>
    <div class="weight-bar">
      <div class="weight-fill" style="width: {warmth}%; background: {warmthColor};"></div>
    </div>
    <span class="weight-num" style="color: {warmthColor};">{warmth}/100</span>
  </div>

  <!-- Category-grouped items. Short enough per-group that the panel is
       scannable at a glance; full detail lives in the modal. -->
  <div class="groups">
    {#each groups as g}
      <div class="group">
        <div class="group-head">
          <span class="group-icon">{CATEGORY_ICON[g.cat]}</span>
          <span class="group-label">{CATEGORY_LABEL[g.cat]}</span>
          <span class="group-count">{g.entries.length}</span>
        </div>
        <div class="group-rows">
          {#each g.entries as e}
            <div class="row">
              <span class="row-name">{e.name}</span>
              <span class="row-qty">×{e.qty}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
    {#if groups.length === 0}
      <div class="empty">(empty)</div>
    {/if}
  </div>
</button>

<style>
  .inventory-panel {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    padding: 0.7em 0.9em;
    background: var(--c-panel);
    border: 2px solid var(--c-wood);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--c-tan);
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .inventory-panel:hover:not(:disabled) {
    background: var(--c-panel);
    border-color: var(--c-rust);
    box-shadow: 0 0 0 1px var(--c-rust) inset;
  }

  .ip-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .ip-head h4 {
    color: var(--c-rust);
    margin: 0;
    font-size: 0.75em;
    letter-spacing: 0.15em;
  }
  .expand-hint {
    color: var(--c-wood);
    font-size: 0.85em;
    opacity: 0.6;
  }
  .inventory-panel:hover .expand-hint {
    color: var(--c-rust);
    opacity: 1;
  }

  .stats {
    display: flex;
    gap: 0.8em;
    font-size: 0.82em;
    color: var(--c-tan-bright);
  }
  .cash { font-weight: 700; }
  .water { color: var(--c-tan); }
  .water-dirty { color: #c96a2a; font-weight: 700; }

  /* Food summary — the at-a-glance "how long will we last?" chip. */
  .food-summary {
    display: flex;
    align-items: baseline;
    gap: 0.5em;
    padding: 0.3em 0.5em;
    background: var(--c-bg-raised);
    border: 1px solid rgba(138, 90, 42, 0.35);
    border-radius: 3px;
  }
  .food-icon { font-size: 1.1em; line-height: 1; }
  .food-days { display: inline-flex; align-items: baseline; gap: 0.2em; }
  .food-days strong {
    font-weight: 700;
    font-size: 1.25em;
  }
  .food-unit {
    font-size: 0.78em;
    color: var(--c-tan);
  }
  .food-lb {
    margin-left: auto;
    font-size: 0.78em;
    color: var(--c-wood);
    font-style: italic;
  }

  .weight-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.5em;
    align-items: center;
    font-size: 0.8em;
  }
  .weight-label { color: var(--c-wood); }
  .weight-bar {
    height: 0.6em;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .weight-fill {
    height: 100%;
    transition: width 0.4s, background 0.4s;
  }
  .weight-num {
    font-weight: 700;
    font-size: 0.9em;
    min-width: 4em;
    text-align: right;
  }

  /* Grouped item list. Category heads break the panel into scannable
     chunks; without them the list is a 20-row alphabetical wall. */
  .groups {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    margin-top: 0.2em;
  }
  .group-head {
    display: flex;
    align-items: baseline;
    gap: 0.35em;
    padding: 0.1em 0.15em 0.15em 0.15em;
    border-bottom: 1px solid rgba(138, 90, 42, 0.35);
  }
  .group-icon { font-size: 0.95em; line-height: 1; }
  .group-label {
    font-size: 0.7em;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--c-rust);
    text-transform: uppercase;
  }
  .group-count {
    margin-left: auto;
    font-size: 0.72em;
    color: var(--c-wood);
    font-style: italic;
  }
  .group-rows {
    display: flex;
    flex-direction: column;
    gap: 0.05em;
    padding: 0.1em 0.15em;
  }
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
  }
  .row-name { color: var(--c-tan); }
  .row-qty { color: var(--c-rust); font-weight: 700; }
  .empty {
    color: var(--c-wood);
    font-style: italic;
    font-size: 0.85em;
    padding: 0.3em 0;
  }
</style>
