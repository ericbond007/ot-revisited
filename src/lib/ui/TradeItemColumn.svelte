<script lang="ts">
  // Unified trade basket — one item column (give OR get). Ported from the
  // handoff's `ItemColumn` widget. Rows show the item, qty available, the
  // per-unit value at this post (barter-credit on the give side in barter
  // mode, cash price otherwise), and a NumberStepper bounded by source qty.
  // The stepper value is the number moved (0..have); the chip shows the
  // source pile AFTER the move, with a +N/−N bubble for the flow direction.
  import { ITEMS, type ItemCategory } from '$lib/game/content/items';
  import { ICON } from '$lib/data/icon-dictionary';
  import ItemTooltip from './ItemTooltip.svelte';
  import NumberStepper from './NumberStepper.svelte';

  type Group = { cat: ItemCategory; ids: string[] };

  let {
    title,
    subtitle,
    side,
    groups,
    have,
    maxFor,
    perUnit,
    perUnitKind,
    values = $bindable(),
    preferredSet,
    refusedSet,
    barter,
    emptyNote
  }: {
    title: string;
    subtitle: string;
    side: 'give' | 'get';
    groups: Group[];
    /** owned (give) or in-stock (get) count for an id */
    have: (id: string) => number;
    /** stepper max for an id (post-remaining for get; owned for give) */
    maxFor: (id: string) => number;
    /** per-unit value at this post for an id */
    perUnit: (id: string) => number;
    /** label after the per-unit value: 'credit' | 'cash' */
    perUnitKind: 'credit' | 'cash';
    values: Record<string, number>;
    preferredSet: Set<string>;
    refusedSet: Set<string>;
    /** whether barter give-side chips (★+15% / ⊘−40%) apply */
    barter: boolean;
    emptyNote: string;
  } = $props();

  const CATEGORY_LABEL: Record<ItemCategory, string> = {
    food: 'Food', feed: 'Feed', medicine: 'Medicine', weapon: 'Weapons', ammo: 'Ammunition',
    tool: 'Tools', wagon_part: 'Wagon parts', livestock: 'Livestock',
    clothing: 'Clothing', comfort: 'Comfort', native_trade: 'Trade goods'
  };
  const CATEGORY_ICON = ICON.inventory_categories;
  const itemIcons = ICON.inventory_items as Record<string, string>;

  const showChips = $derived(barter && side === 'give');
  const money = (n: number) => `$${n.toFixed(2)}`;
</script>

<section class="tp-col">
  <header class="tp-col-head">
    <div class="tp-eyebrow">{side === 'give' ? 'You give from' : 'You get from'}</div>
    <div class="tp-col-title">{title}</div>
    <div class="tp-col-sub">{subtitle}</div>
  </header>
  <div class="tp-col-body">
    {#if groups.length === 0}
      <p class="tp-pile-empty">{emptyNote}</p>
    {/if}
    {#each groups as g}
      <div class="tp-col-group">
        <div class="tp-col-cat">
          <span class="cat-icon">{CATEGORY_ICON[g.cat]}</span>{CATEGORY_LABEL[g.cat]}
        </div>
        <div class="tp-col-rows">
          {#each g.ids as id (id)}
            {@const meta = ITEMS[id]}
            {@const h = have(id)}
            {@const mx = maxFor(id)}
            {@const v = values[id] ?? 0}
            {@const isPref = preferredSet.has(id)}
            {@const isRef = refusedSet.has(id)}
            {@const icon = itemIcons[id]}
            <div
              class="tp-col-row"
              class:tp-col-row-active={v > 0}
              class:tp-col-row-refused={showChips && isRef}
            >
              <span class="tp-col-icon">{icon ?? ''}</span>
              <div class="tp-col-rowtext">
                <div class="tp-col-rowname">
                  <ItemTooltip {id}>
                    {#snippet children()}
                      <span class="rowname-text">{meta?.name ?? id}</span>
                    {/snippet}
                  </ItemTooltip>
                  {#if showChips && isPref}
                    <span class="tp-chip tp-chip-prefers" title="Post pays +15% in barter">★ +15%</span>
                  {/if}
                  {#if showChips && isRef}
                    <span class="tp-chip tp-chip-refused" title="Post pays −40% in barter">⊘ −40%</span>
                  {/if}
                </div>
                <div class="tp-col-rowsub">
                  <span class="tp-col-have">{h} {side === 'give' ? 'in wagon' : 'in stock'}</span>
                  <span class="tp-col-perunit">
                    {money(perUnit(id))}<span class="tp-col-perunit-sub">/{perUnitKind}</span>
                  </span>
                </div>
              </div>
              <NumberStepper
                bind:value={() => values[id] ?? 0, (nv) => (values[id] = nv)}
                min={0}
                max={mx}
                hideValue
                displayValue={h - v}
                addedValue={v > 0 ? (side === 'give' ? -v : v) : undefined}
                ariaLabel="{meta?.name ?? id}: quantity to {side === 'give' ? 'give' : 'get'}"
              />
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
  .tp-col {
    background: var(--of-paper-soft);
    border: 2px solid var(--of-rule);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .tp-col-head {
    padding: 0.7em 1em;
    background: var(--of-paper-deep);
    border-bottom: 3px solid var(--post-accent);
  }
  .tp-eyebrow {
    font-size: 0.65em;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
    font-weight: 700;
  }
  .tp-col-title {
    color: var(--of-ink);
    font-size: 1.15em;
    letter-spacing: 0.03em;
    line-height: 1.1;
    margin-top: 0.15em;
    font-weight: 700;
  }
  .tp-col-sub {
    font-size: 0.78em;
    color: var(--of-ink-soft);
    font-style: italic;
    margin-top: 0.15em;
  }
  .tp-col-body { padding: 0.25em 0; }
  .tp-col-group { margin-bottom: 0.25em; }
  .tp-col-cat {
    font-size: 0.7em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--of-ink-soft);
    font-weight: 700;
    padding: 0.4em 1em 0.15em;
    border-bottom: 1px solid var(--of-rule-soft);
    display: flex;
    align-items: center;
    gap: 0.4em;
  }
  .cat-icon { font-size: 1.2em; line-height: 1; }
  .tp-col-rows { display: flex; flex-direction: column; }
  .tp-col-row {
    display: grid;
    grid-template-columns: 1.8em minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.7em;
    padding: 0.45em 1em;
    border-bottom: 1px solid var(--of-rule-soft);
    transition: background 0.12s;
  }
  .tp-col-row:last-child { border-bottom: 0; }
  .tp-col-row:nth-child(odd) { background: rgba(74, 46, 21, 0.05); }
  .tp-col-row:hover { background: rgba(148, 52, 14, 0.08); }
  .tp-col-row-active {
    background: rgba(148, 52, 14, 0.16) !important;
    box-shadow: inset 3px 0 0 0 var(--post-accent);
  }
  .tp-col-row-refused { opacity: 0.72; }
  .tp-col-icon { font-size: 1.2em; line-height: 1; text-align: center; }
  .tp-col-rowtext { display: flex; flex-direction: column; gap: 0.15em; min-width: 0; }
  .tp-col-rowname {
    color: var(--of-ink);
    font-weight: 700;
    font-size: 0.92em;
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex-wrap: wrap;
  }
  .rowname-text { color: var(--of-ink); }
  .tp-col-rowsub {
    display: flex;
    gap: 0.7em;
    font-size: 0.78em;
    font-variant-numeric: tabular-nums;
  }
  .tp-col-have { color: var(--of-ink-soft); font-style: italic; }
  .tp-col-perunit { color: var(--of-ink); }
  .tp-col-perunit-sub {
    font-size: 0.8em;
    letter-spacing: 0.08em;
    color: var(--of-ink-soft);
    text-transform: uppercase;
    margin-left: 0.15em;
  }
  .tp-chip {
    display: inline-block;
    padding: 0.12em 0.4em;
    font-size: 0.62em;
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
  .tp-pile-empty {
    margin: 1em;
    color: var(--of-ink-soft);
    font-style: italic;
    font-size: 0.9em;
  }
</style>
