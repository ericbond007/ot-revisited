<script lang="ts">
  // LandmarkIcon — 24×24 watercolor pin glyph for any landmark in
  // LANDMARKS. Replaces the existing emoji pin on the trail map +
  // modal headers (LandmarkPin, LandmarkStage, FordModal, TradeModal,
  // TownStage hero).
  //
  // Pattern: per-id Svelte component dispatch via REGISTRY. Svelte 5
  // runes port of the handoff bundle's LandmarkIcon.svelte. Each
  // component is a `<g>`-only SVG fragment; this file owns the outer
  // <svg> + viewBox + size scaling + the unknown-id fallback.
  //
  // FOUNDATION COMMIT — only 5 of 40 landmarks are ported (the three
  // worked-port templates plus the two fresh glyphs added in matching
  // vocabulary). Unmapped ids fall through to the "?" placeholder.
  // The mechanical 35-icon bulk port lands as a separate task.
  import type { Component } from 'svelte';
  import type { LandmarkIconId } from './landmark-icon-tokens';

  import ChimneyRock     from './chimney_rock.svelte';
  import FortLaramie     from './fort_laramie.svelte';
  import KansasRiver     from './kansas_river.svelte';
  import WhitmanMission  from './whitman_mission.svelte';
  import BarlowRoad      from './barlow_road.svelte';

  // Partial registry — extend as bulk port lands. `Partial<>` so
  // unmapped ids return undefined and trigger the fallback.
  const REGISTRY: Partial<Record<LandmarkIconId, Component>> = {
    chimney_rock:    ChimneyRock,
    fort_laramie:    FortLaramie,
    kansas_river:    KansasRiver,
    whitman_mission: WhitmanMission,
    barlow_road:     BarlowRoad
  };

  let { id, size = 24, title, className = '' }: {
    id: LandmarkIconId | string;
    size?: number;
    title?: string;
    className?: string;
  } = $props();

  const Art = $derived(REGISTRY[id as LandmarkIconId]);
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class={className}
  aria-hidden={title ? undefined : true}
  role={title ? 'img' : undefined}
  style="display: block;"
>
  {#if title}<title>{title}</title>{/if}
  {#if Art}
    <Art />
  {:else}
    <!-- Fallback for unknown / unported ids — neutral parchment dot
         with a "?" so missing-icon states are obvious in dev. -->
    <circle cx="12" cy="12" r="10" fill="#e8d9b8" stroke="#2a1a08" stroke-width="0.8" />
    <text x="12" y="16" font-size="10" font-family="Georgia, serif"
          text-anchor="middle" fill="#2a1a08">?</text>
  {/if}
</svg>

<script lang="ts" module>
  /** Returns true when LandmarkIcon has bespoke art for the given id.
   *  Call sites use this to decide whether to render the icon vs.
   *  fall back to the legacy emoji glyph. */
  export function hasLandmarkIcon(id: string): boolean {
    return REGISTRY_KEYS.has(id);
  }

  // Mirrors the keys of REGISTRY above. Keep in sync when porting.
  const REGISTRY_KEYS = new Set<string>([
    'chimney_rock',
    'fort_laramie',
    'kansas_river',
    'whitman_mission',
    'barlow_road'
  ]);
</script>
