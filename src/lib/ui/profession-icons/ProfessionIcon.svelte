<script lang="ts">
  // ProfessionIcon — 24-px (default) watercolor glyph for any of the
  // 13 professions. Replaces `ICON.professions.X` emoji in rendered UI.
  // Optional `badge` prop wraps the bespoke art in a HybridBadge frame
  // (warm/cool/gold tone) — used at the PartyPanel avatar corner and
  // anywhere a circular profession chip is wanted. When badge is null
  // (default), the bare silhouette renders directly.
  //
  // Pattern: per-id Svelte component dispatch, mirroring LandmarkIcon
  // and StatIcon. The HybridBadge component is shared with
  // landmark-icons (one instance, two callers).
  //
  // All 13 profession icon ports are landed.
  import type { Component } from 'svelte';
  import type { ProfessionIconKind, ProfessionIconBadge } from './profession-icon-tokens';
  import HybridBadge from '$lib/ui/landmark-icons/_badge.svelte';

  import Banker       from './banker.svelte';
  import Blacksmith   from './blacksmith.svelte';
  import Carpenter    from './carpenter.svelte';
  import Doctor       from './doctor.svelte';
  import Farmer       from './farmer.svelte';
  import Gunsmith     from './gunsmith.svelte';
  import Hunter       from './hunter.svelte';
  import IndianTrader from './indian_trader.svelte';
  import Merchant     from './merchant.svelte';
  import Preacher     from './preacher.svelte';
  import Scout        from './scout.svelte';
  import Teamster     from './teamster.svelte';
  import Whore        from './whore.svelte';

  const REGISTRY: Partial<Record<ProfessionIconKind, Component>> = {
    banker:        Banker,
    blacksmith:    Blacksmith,
    carpenter:     Carpenter,
    doctor:        Doctor,
    farmer:        Farmer,
    gunsmith:      Gunsmith,
    hunter:        Hunter,
    indian_trader: IndianTrader,
    merchant:      Merchant,
    preacher:      Preacher,
    scout:         Scout,
    teamster:      Teamster,
    whore:         Whore
  };

  let { id, size = 24, badge = null, title, className = '' }: {
    id: ProfessionIconKind | string;
    size?: number;
    badge?: ProfessionIconBadge;
    title?: string;
    className?: string;
  } = $props();

  const Glyph = $derived(REGISTRY[id as ProfessionIconKind]);
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
    {#if badge}
      <HybridBadge id={`pi-${id}`} tone={badge}>
        {#snippet children()}<Glyph />{/snippet}
      </HybridBadge>
    {:else}
      <Glyph />
    {/if}
  {:else}
    <!-- Fallback for unmapped ids — neutral parchment dot with "?". -->
    <circle cx="12" cy="12" r="10" fill="#e8d9b8" stroke="#2a1a08" stroke-width="0.8" />
    <text x="12" y="16" font-size="10" font-family="Georgia, serif"
          text-anchor="middle" fill="#2a1a08">?</text>
  {/if}
</svg>

<script lang="ts" module>
  /** Returns true when ProfessionIcon has bespoke art for the given id.
   *  Call sites use this to fall back to the legacy emoji glyph for
   *  any id that hasn't been ported. */
  export function hasProfessionIcon(id: string): boolean {
    return REGISTRY_KEYS.has(id);
  }

  // Mirrors the keys of REGISTRY above. Keep in sync when porting.
  const REGISTRY_KEYS = new Set<string>([
    'banker',
    'blacksmith',
    'carpenter',
    'doctor',
    'farmer',
    'gunsmith',
    'hunter',
    'indian_trader',
    'merchant',
    'preacher',
    'scout',
    'teamster',
    'whore'
  ]);
</script>
