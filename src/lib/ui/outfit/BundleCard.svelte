<script lang="ts">
  import type { Bundle } from '$lib/game/content/bundles';
  import { ITEMS } from '$lib/game/content/items';

  let {
    bundle,
    cost,
    applied = false,
    onapply
  }: {
    bundle: Bundle;
    /** Pre-computed a-la-carte cost (page applies merchant/banker discount). */
    cost: number;
    applied?: boolean;
    onapply: (b: Bundle) => void;
  } = $props();

  let expanded = $state(false);
  const entries = $derived(Object.entries(bundle.kit));
  const itemCount = $derived(entries.length);
  function money(n: number): string {
    return '$' + (Math.round(n * 100) / 100).toFixed(2);
  }
</script>

<div class="bundle-card bundle-{bundle.tone}" class:expanded class:applied>
  <button class="bundle-summary" onclick={() => (expanded = !expanded)} type="button">
    <span class="bundle-icon">{bundle.icon}</span>
    <span class="bundle-titles">
      <span class="bundle-name">{bundle.name}</span>
      <span class="ds-eyebrow bundle-sub">{bundle.sub}</span>
    </span>
    <span class="bundle-meta">
      <span class="bundle-itemcount">{itemCount} items</span>
      <span class="bundle-cost">{money(cost)}</span>
    </span>
    <span class="bundle-chevron">{expanded ? '▾' : '▸'}</span>
  </button>

  {#if expanded}
    <div class="bundle-expand">
      <p class="bundle-blurb">{bundle.blurb}</p>
      <div class="bundle-items">
        {#each entries as [id, qty] (id)}
          <span class="bundle-item">
            <span class="bundle-item-name">{ITEMS[id]?.name ?? id}</span>
            <span class="bundle-item-qty">x{qty}</span>
          </span>
        {/each}
      </div>
      <button
        class="ds-btn bundle-add"
        class:applied
        type="button"
        onclick={() => onapply(bundle)}
      >
        {applied ? 'Add again' : 'Add to outfit'}
      </button>
    </div>
  {/if}
</div>

<style>
  .bundle-card {
    background: var(--of-paper);
    border: 1.5px solid var(--of-rule);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.12s;
  }
  .bundle-card:hover { border-color: var(--of-ink-soft); }
  .bundle-card.expanded { border-color: var(--of-rust); border-width: 2px; }
  .bundle-card.applied { background: color-mix(in srgb, var(--of-good) 6%, var(--of-paper)); border-color: var(--of-good); }
  .bundle-summary {
    display: grid;
    grid-template-columns: 22px 1fr auto auto;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
    color: var(--of-ink);
    font-family: var(--of-body);
  }
  .bundle-icon { font-size: 17px; line-height: 1; text-align: center; }
  .bundle-titles { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .bundle-name { font-family: var(--of-display); font-size: 15px; color: var(--of-ink); letter-spacing: 0.02em; line-height: 1.1; }
  .bundle-sub { font-size: var(--of-fs-label); font-style: italic; }
  .bundle-meta { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
  .bundle-itemcount { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--of-ink-soft); opacity: 0.7; font-weight: 700; }
  .bundle-cost { font-family: var(--of-mono); font-size: 13px; color: var(--of-rust); font-weight: 700; font-variant-numeric: tabular-nums; }
  .bundle-chevron { color: var(--of-ink-soft); font-size: 12px; width: 14px; text-align: center; }
  .bundle-expand { padding: 4px 12px 12px; border-top: 1px dashed var(--of-rule); background: var(--of-paper-soft); display: flex; flex-direction: column; gap: 8px; }
  .bundle-blurb { margin: 6px 0 0; font-family: var(--of-body); font-style: italic; font-size: 12px; color: var(--of-ink); line-height: 1.5; }
  .bundle-items { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; padding: 6px 0; border-top: 1px dashed var(--of-rule); border-bottom: 1px dashed var(--of-rule); }
  .bundle-item { display: flex; justify-content: space-between; gap: 6px; font-size: 11px; color: var(--of-ink); padding: 2px 0; font-variant-numeric: tabular-nums; }
  .bundle-item-qty { color: var(--of-rust); font-weight: 700; }
  .bundle-add { margin-top: 4px; align-self: flex-start; }
  .bundle-add.applied { background: var(--of-paper); color: var(--of-good); border-color: var(--of-good); }
</style>
