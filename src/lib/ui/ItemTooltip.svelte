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

  // Hover-intent: require a short pause before showing so casual mouse travel
  // across rows doesn't flash tooltips everywhere.
  const HOVER_DELAY_MS = 500;
  let shown = $state(false);
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  function onEnter() {
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => { shown = true; }, HOVER_DELAY_MS);
  }
  function onLeave() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    shown = false;
  }
  function onFocusIn() {
    // Keyboard focus shows the tooltip immediately (accessibility).
    shown = true;
  }
</script>

<span
  class="tt-wrap"
  role="button"
  tabindex="0"
  onpointerenter={onEnter}
  onpointerleave={onLeave}
  onfocusin={onFocusIn}
  onfocusout={onLeave}
>
  {@render children()}

  {#if item && shown}
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
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    animation: tt-fade-in 0.18s ease-out;
  }
  @keyframes tt-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
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
