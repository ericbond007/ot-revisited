<script lang="ts" generics="T extends string">
  import { enhance } from '$app/forms';
  import StatIcon from './stat-icons/StatIcon.svelte';
  import type { StatIconKind } from './stat-icons/stat-icon-tokens';

  interface Option {
    value: T;
    label: string;
    sublabel?: string;
    icon?: string;
  }

  let {
    icon,
    kind,
    label,
    name,
    action,
    current,
    options,
    align = 'left'
  }: {
    /** Emoji glyph fallback. Used when `kind` isn't supplied. */
    icon?: string;
    /** Watercolor SVG kind from the stat-icons module. Takes precedence
     *  over `icon` when both are passed — the SVG is the rendered form,
     *  emoji stays the textual fallback for log/toast/copy contexts. */
    kind?: StatIconKind;
    label: string;
    name: string;
    action: string;
    current: T;
    options: Option[];
    // Pop anchor — set 'right' for stats near the viewport's right edge so
    // the popover doesn't clip off-screen.
    align?: 'left' | 'right';
  } = $props();

  let open = $state(false);
  let root: HTMLSpanElement | undefined;

  function toggle() { open = !open; }

  function onWindowClick(e: MouseEvent) {
    if (!open) return;
    if (root && !root.contains(e.target as Node)) open = false;
  }
  $effect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('click', onWindowClick);
    return () => window.removeEventListener('click', onWindowClick);
  });
</script>

<span class="stat-picker" bind:this={root}>
  <button type="button" class="stat-btn" onclick={toggle} title="Change {label.toLowerCase()}">
    {#if kind}
      <StatIcon {kind} size={14} className="stat-svg" />
    {:else}
      <span class="stat-icon">{icon}</span>
    {/if}
    <span class="stat-label">{label}</span>
    <span class="stat-val capitalize">{current}</span>
    <span class="caret">{open ? '▾' : '▸'}</span>
  </button>

  {#if open}
    <div class="pop" class:align-right={align === 'right'}>
      <div class="pop-head">SET {label}</div>
      <div class="pop-cards">
        {#each options as opt}
          {@const selected = opt.value === current}
          <form method="POST" {action} use:enhance={() => {
            return async ({ update }) => {
              await update();
              open = false;
            };
          }}>
            <input type="hidden" {name} value={opt.value} />
            <button
              type="submit"
              class="card"
              class:selected
              disabled={selected}
              title={opt.sublabel ?? ''}
            >
              {#if opt.icon}<span class="card-icon">{opt.icon}</span>{/if}
              <span class="card-body">
                <span class="card-label">{opt.label}</span>
                {#if opt.sublabel}<span class="card-sub">{opt.sublabel}</span>{/if}
              </span>
            </button>
          </form>
        {/each}
      </div>
    </div>
  {/if}
</span>

<style>
  .stat-picker {
    position: relative;
    display: inline-block;
  }
  .stat-btn {
    /* Flatten default button chrome so it looks like the other header stats */
    display: inline-flex;
    align-items: baseline;
    gap: 0.35em;
    padding: 0.2em 0.5em;
    background: transparent;
    color: var(--c-tan);
    border: 1px solid transparent;
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.95em;
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .stat-btn:hover:not(:disabled) {
    background: var(--c-bg-raised);
    border-color: var(--c-wood);
  }

  .stat-icon { font-size: 1.1em; line-height: 1; }
  .stat-label {
    font-size: 0.7em;
    letter-spacing: 0.12em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .stat-val {
    color: var(--c-tan-bright);
    font-weight: 700;
  }
  .capitalize { text-transform: capitalize; }
  .caret {
    color: var(--c-wood);
    font-size: 0.7em;
    margin-left: 0.1em;
  }

  .pop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 60;
    min-width: 260px;
    padding: 0.6em 0.7em;
    background: var(--c-panel);
    border: 2px solid var(--c-rust);
    border-radius: 4px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
  }
  .pop.align-right {
    left: auto;
    right: 0;
  }
  .pop-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
    margin-bottom: 0.4em;
  }
  .pop-cards {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .pop-cards form { margin: 0; }

  .card {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.4em 0.6em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    font-size: 0.85em;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .card:hover:not(:disabled):not(.selected) {
    background: var(--c-panel);
    border-color: var(--c-rust);
  }
  .card.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
    border-color: var(--c-ink);
    cursor: default;
  }
  .card:disabled.selected { opacity: 1; }
  .card-icon {
    font-size: 1.3em;
    line-height: 1;
  }
  .card-body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1em;
    min-width: 0;
  }
  .card-label { font-size: 0.95em; }
  .card-sub {
    font-size: 0.75em;
    font-weight: normal;
    color: var(--c-wood);
    letter-spacing: normal;
  }
  .card.selected .card-sub { color: var(--c-tan); }
</style>
