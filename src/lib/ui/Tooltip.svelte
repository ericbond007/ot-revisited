<script lang="ts">
  // Themed parchment tooltip — shared foundation for ItemTooltip and any other
  // game-data hover. Hover-intent delay + middle-click pin match ItemTooltip's
  // behavior so the feel is consistent across the app.

  let {
    title,
    subtitle,
    description,
    meta,
    disabled = false,
    children
  }: {
    title: string;
    subtitle?: string;
    description?: string;
    meta?: string;
    disabled?: boolean;
    children: import('svelte').Snippet;
  } = $props();

  const HOVER_DELAY_MS = 250;
  let hovered = $state(false);
  let pinned = $state(false);
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  const shown = $derived(!disabled && (pinned || hovered));

  function onEnter() {
    if (disabled || pinned) return;
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => { hovered = true; }, HOVER_DELAY_MS);
  }
  function onLeave() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    hovered = false;
  }
  function onFocusIn() {
    if (!disabled) hovered = true;
  }
  function onAuxClick(e: MouseEvent) {
    if (disabled || e.button !== 1) return;
    e.preventDefault();
    pinned = !pinned;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    hovered = false;
  }
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

  {#if shown}
    <span class="tt-card" class:pinned role="tooltip">
      <span class="tt-title">{title}</span>
      {#if subtitle}
        <span class="tt-subtitle">{subtitle}</span>
      {/if}
      {#if description}
        <span class="tt-desc">{description}</span>
      {/if}
      {#if meta}
        <span class="tt-meta">{meta}</span>
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
  }
  .tt-wrap.pinned { cursor: default; }

  .tt-card {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    z-index: 50;
    min-width: 220px;
    max-width: 300px;
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
  .tt-card.pinned::after { border-top-color: var(--c-rust-dark); }

  .tt-title {
    font-weight: 700;
    color: var(--c-rust-dark);
    font-size: 1.05em;
  }
  .tt-subtitle {
    font-size: 0.7em;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--c-wood);
  }
  .tt-desc { color: var(--c-ink); }
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
