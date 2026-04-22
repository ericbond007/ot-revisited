<script lang="ts">
  import { ITEMS } from '$lib/game/content/items';

  let {
    id,
    children
  }: {
    id: string;
    children: import('svelte').Snippet;
  } = $props();

  const item = $derived(ITEMS[id]);
</script>

<span class="tt-wrap">
  {@render children()}

  {#if item}
    <span class="tt-card" role="tooltip">
      <span class="tt-name">{item.name}</span>
      <span class="tt-category">{item.category.replace(/_/g, ' ')}</span>
      {#if item.description}
        <span class="tt-desc">{item.description}</span>
      {/if}
      {#if item.weightLbPerUnit > 0}
        <span class="tt-meta">{item.weightLbPerUnit} lb each</span>
      {/if}
    </span>
  {/if}
</span>

<style>
  .tt-wrap {
    position: relative;
    display: inline-block;
    cursor: help;
    border-bottom: 1px dotted var(--c-rust);
  }

  .tt-card {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    z-index: 50;
    min-width: 220px;
    max-width: 280px;
    padding: 0.7em 0.9em;
    background: var(--c-parchment);
    color: var(--c-ink);
    border: 2px solid var(--c-rust);
    border-radius: 3px;
    font-family: var(--f-mono);
    font-size: 0.85em;
    line-height: 1.4;
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    opacity: 0;
    visibility: hidden;
    transform: translateY(4px);
    transition: opacity 0.15s, visibility 0.15s, transform 0.15s;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .tt-card::after {
    /* Little triangle pointer */
    content: '';
    position: absolute;
    top: 100%;
    left: 1.2em;
    width: 0;
    height: 0;
    border: 6px solid transparent;
    border-top-color: var(--c-rust);
  }

  .tt-wrap:hover .tt-card,
  .tt-wrap:focus-within .tt-card {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .tt-name {
    font-weight: 700;
    color: var(--c-rust-dark);
    font-size: 1.05em;
  }
  .tt-category {
    font-size: 0.7em;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--c-wood);
  }
  .tt-desc {
    color: var(--c-ink);
  }
  .tt-meta {
    font-size: 0.75em;
    color: var(--c-wood);
    font-style: italic;
  }
</style>
