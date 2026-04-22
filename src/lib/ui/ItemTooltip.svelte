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

  const HOVER_DELAY_MS = 500;
  let hovered = $state(false);
  let pinned = $state(false);
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  const shown = $derived(pinned || hovered);

  function onEnter() {
    if (pinned) return;
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => { hovered = true; }, HOVER_DELAY_MS);
  }
  function onLeave() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    hovered = false;
  }
  function onFocusIn() {
    hovered = true;
  }
  function onAuxClick(e: MouseEvent) {
    // button === 1 is middle mouse. Toggle pinned state.
    if (e.button !== 1) return;
    e.preventDefault();
    pinned = !pinned;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    hovered = false;
  }
  // Suppress the default middle-click autoscroll cursor while the user is pinning.
  function onMouseDown(e: MouseEvent) {
    if (e.button === 1) e.preventDefault();
  }
</script>

<span
  class="tt-wrap"
  class:pinned
  role="button"
  tabindex="0"
  onpointerenter={onEnter}
  onpointerleave={onLeave}
  onfocusin={onFocusIn}
  onfocusout={onLeave}
  onauxclick={onAuxClick}
  onmousedown={onMouseDown}
>
  {@render children()}

  {#if item && shown}
    <span class="tt-card" class:pinned role="tooltip">
      <span class="tt-name">{item.name}</span>
      <span class="tt-category">{item.category.replace(/_/g, ' ')}</span>
      {#if item.description}
        <span class="tt-desc">{item.description}</span>
      {/if}
      {#if item.weightLbPerUnit > 0}
        <span class="tt-meta">{item.weightLbPerUnit} lb each</span>
      {/if}
      {#if pinned}
        <span class="tt-pin-hint">pinned — middle-click to release</span>
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
  .tt-wrap.pinned {
    border-bottom-color: var(--c-rust-dark);
    border-bottom-style: solid;
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
    opacity: 1;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .tt-card.pinned {
    border-color: var(--c-rust-dark);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--c-rust-dark);
  }
  .tt-card::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 1.2em;
    width: 0;
    height: 0;
    border: 6px solid transparent;
    border-top-color: var(--c-rust);
  }
  .tt-card.pinned::after {
    border-top-color: var(--c-rust-dark);
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
  .tt-pin-hint {
    font-size: 0.7em;
    color: var(--c-wood);
    font-style: italic;
    margin-top: 0.2em;
  }
</style>
