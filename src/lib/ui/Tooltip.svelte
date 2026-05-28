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
  // #1133 — flip threshold: when the trigger's top is within this many
  // pixels of the viewport top, the tooltip renders below the trigger
  // instead of above. Matches the rendered card max-height ballpark
  // (title + subtitle + 3-4 lines of description + meta + padding).
  const FLIP_THRESHOLD_PX = 200;

  let hovered = $state(false);
  let pinned = $state(false);
  let placement = $state<'top' | 'bottom'>('top');
  let wrapEl = $state<HTMLElement | null>(null);
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  const shown = $derived(!disabled && (pinned || hovered));

  // When the tooltip is about to show (or pin), measure available
  // headroom and flip placement when the trigger sits in the top band
  // of the viewport. Without this, the top row of a profession picker
  // (or any grid hugging the top of the screen) renders the tooltip
  // off-canvas where it gets clipped (#1133).
  $effect(() => {
    if (!shown || !wrapEl) return;
    const rect = wrapEl.getBoundingClientRect();
    placement = rect.top < FLIP_THRESHOLD_PX ? 'bottom' : 'top';
  });

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
  bind:this={wrapEl}
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
    <span class="tt-card" class:pinned class:below={placement === 'bottom'} role="tooltip">
      <span class="tt-title">{title}</span>
      {#if subtitle}
        <span class="tt-subtitle ds-eyebrow">{subtitle}</span>
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
    padding: var(--of-s-2) var(--of-s-3);
    background: var(--of-paper-soft);
    color: var(--of-ink);
    border: 1px solid var(--of-ink-soft);
    border-radius: var(--of-r-sm);
    font-family: var(--of-body);
    font-size: 0.85em;
    line-height: 1.4;
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    box-shadow:
      inset 0 0 14px rgba(94, 60, 24, 0.08),
      0 4px 12px rgba(74, 46, 21, 0.32);
    pointer-events: none;
    opacity: 1;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .tt-card.pinned {
    border-color: var(--of-rust-dark);
    box-shadow:
      inset 0 0 14px rgba(94, 60, 24, 0.10),
      0 4px 14px rgba(74, 46, 21, 0.40),
      0 0 0 1px var(--of-rust-dark);
  }
  .tt-card::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 1.2em;
    width: 0;
    height: 0;
    border: 6px solid transparent;
    border-top-color: var(--of-ink-soft);
  }
  .tt-card.pinned::after { border-top-color: var(--of-rust-dark); }

  /* #1133 — flip placement: render below the trigger when there's no
   *  headroom (top row of a profession picker, sticky-header context,
   *  etc.). Arrow points up instead of down. */
  .tt-card.below {
    bottom: auto;
    top: calc(100% + 6px);
  }
  .tt-card.below::after {
    top: auto;
    bottom: 100%;
    border-top-color: transparent;
    border-bottom-color: var(--of-ink-soft);
  }
  .tt-card.below.pinned::after {
    border-bottom-color: var(--of-rust-dark);
  }

  .tt-title {
    font-weight: 700;
    color: var(--of-rust-dark);
    font-family: var(--of-sc);
    font-size: 1.05em;
  }
  /* .tt-subtitle inherits ds-eyebrow; no local override needed. */
  .tt-desc { color: var(--of-ink); font-family: var(--of-body); }
  .tt-meta {
    font-size: 0.75em;
    color: var(--of-ink-soft);
    font-style: italic;
  }
  .tt-pin-hint {
    font-size: 0.7em;
    color: var(--of-ink-faded);
    font-style: italic;
    margin-top: 0.2em;
  }
</style>
