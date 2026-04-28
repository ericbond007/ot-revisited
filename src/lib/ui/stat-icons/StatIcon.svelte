<script lang="ts">
  // StatIcon — 16-px (default) watercolor glyph for any of the 10
  // top-bar stats. Replaces the `ICON.stats.X` emoji in rendered UI;
  // the emoji map stays in icon-dictionary.ts for textual contexts
  // (event log, toasts, copy-paste).
  //
  // Pattern: per-kind Svelte component dispatch, mirroring
  // LandmarkIcon. Each kind component is a `<g>`-only SVG fragment;
  // this file owns the outer `<svg viewBox="0 0 24 24">` + size +
  // title + the unknown-kind fallback.
  //
  // FOUNDATION COMMIT — only 5 of 10 ports are landed (3 worked-port
  // templates from the bundle plus 2 fresh glyphs in matching
  // vocabulary for `leg` and `weather` which the bundle pre-dates).
  // The mechanical 5-icon bulk port lands as a follow-up.
  import type { Component } from 'svelte';
  import type { StatIconKind } from './stat-icon-tokens';

  import Cash    from './cash.svelte';
  import Date    from './date.svelte';
  import Day     from './day.svelte';
  import Health  from './health.svelte';
  import Leg     from './leg.svelte';
  import Morale  from './morale.svelte';
  import Pace    from './pace.svelte';
  import Rations from './rations.svelte';
  import Water   from './water.svelte';
  import Weather from './weather.svelte';

  const REGISTRY: Partial<Record<StatIconKind, Component>> = {
    cash:    Cash,
    date:    Date,
    day:     Day,
    health:  Health,
    leg:     Leg,
    morale:  Morale,
    pace:    Pace,
    rations: Rations,
    water:   Water,
    weather: Weather
  };

  let { kind, size = 16, title, className = '' }: {
    kind: StatIconKind | string;
    size?: number;
    title?: string;
    className?: string;
  } = $props();

  const Glyph = $derived(REGISTRY[kind as StatIconKind]);
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class={className}
  aria-hidden={title ? undefined : true}
  role={title ? 'img' : undefined}
  style="display: inline-block; vertical-align: middle;"
>
  {#if title}<title>{title}</title>{/if}
  {#if Glyph}
    <Glyph />
  {:else}
    <!-- Fallback for unmapped kinds — neutral parchment dot with "?". -->
    <circle cx="12" cy="12" r="10" fill="#e8d9b8" stroke="#2a1a08" stroke-width="0.8" />
    <text x="12" y="16" font-size="10" font-family="Georgia, serif"
          text-anchor="middle" fill="#2a1a08">?</text>
  {/if}
</svg>

<script lang="ts" module>
  /** Returns true when StatIcon has bespoke art for the given kind.
   *  Call sites use this to fall back to the legacy emoji glyph for
   *  any kind that hasn't been ported. */
  export function hasStatIcon(kind: string): boolean {
    return REGISTRY_KEYS.has(kind);
  }

  // Mirrors the keys of REGISTRY above. Keep in sync when porting.
  const REGISTRY_KEYS = new Set<string>([
    'cash',
    'date',
    'day',
    'health',
    'leg',
    'morale',
    'pace',
    'rations',
    'water',
    'weather'
  ]);
</script>
