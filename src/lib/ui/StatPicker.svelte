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
      <div class="pop-head ds-eyebrow">SET {label}</div>
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
    color: var(--of-ink);
    border: 1px solid transparent;
    border-radius: var(--of-r-sm);
    font-family: var(--of-body);
    font-size: 0.95em;
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .stat-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--of-paper-deep) 25%, transparent);
    border-color: var(--of-rule);
  }

  .stat-icon { font-size: 1.1em; line-height: 1; }
  .stat-label {
    font-size: 0.7em;
    letter-spacing: 0.12em;
    color: var(--of-ink-soft);
    font-family: var(--of-sc);
    font-weight: 400;
  }
  .stat-val {
    color: var(--of-ink);
    font-weight: 700;
    font-family: var(--of-body);
  }
  .capitalize { text-transform: capitalize; }
  .caret {
    color: var(--of-ink-soft);
    font-size: 0.7em;
    margin-left: 0.1em;
  }

  .pop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 60;
    min-width: 260px;
    padding: var(--of-s-2) var(--of-s-3);
    background: var(--of-paper-soft);
    border: 3px double var(--of-ink-soft);
    border-radius: var(--of-r-xs);
    box-shadow:
      inset 0 0 16px rgba(94, 60, 24, 0.08),
      0 6px 18px rgba(74, 46, 21, 0.35);
  }
  .pop.align-right {
    left: auto;
    right: 0;
  }
  .pop-head {
    margin-bottom: var(--of-s-2);
  }
  .pop-cards {
    display: flex;
    flex-direction: column;
    gap: var(--of-s-1);
  }
  .pop-cards form { margin: 0; }

  .card {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.4em 0.6em;
    background: var(--of-paper);
    color: var(--of-ink);
    border: 2px solid var(--of-rule);
    border-radius: var(--of-r-xs);
    font-family: var(--of-body);
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
    background: var(--of-paper-soft);
    border-color: var(--of-ink-soft);
  }
  .card.selected {
    background: var(--of-rust);
    color: var(--of-paper-soft);
    border-color: var(--of-rust-dark);
    box-shadow: var(--of-btn-emboss-active);
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
    color: var(--of-ink-soft);
    font-family: var(--of-sc);
    letter-spacing: normal;
  }
  .card.selected .card-sub { color: var(--of-paper); }
</style>
