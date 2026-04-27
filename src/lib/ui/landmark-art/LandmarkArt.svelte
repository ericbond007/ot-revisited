<!--
  LandmarkArt.svelte — index component.

  Picks the right landmark by id and renders it inside a LandmarkArtFrame.
  This is the only component the rest of the app should mount; the per-
  landmark art components are implementation detail.

  Usage:
      LandmarkArt id="chimney_rock"
      LandmarkArt id="whitman_mission" abandoned    (post-1847 ruin)

  The `id` prop is a plain `string` so call sites can pass `landmark.id`
  directly. If the id has no registered art, the component renders
  nothing — the caller can use `hasLandmarkArt(id)` to decide whether to
  show the placeholder chrome instead.

  Imports for not-yet-ported landmarks are commented out. Uncomment as
  each *.svelte file lands. Order mirrors trail mileage.
-->
<script lang="ts" module>
  import type { Component } from 'svelte';
  import type { LandmarkId, LandmarkTone } from './landmark-art-tokens';

  import IndependenceArt from './IndependenceArt.svelte';
  import KansasRiverArt from './KansasRiverArt.svelte';
  import BigBlueArt from './BigBlueArt.svelte';
  import FortKearnyArt from './FortKearnyArt.svelte';
  import CourthouseJailArt from './CourthouseJailArt.svelte';
  import ChimneyRockArt from './ChimneyRockArt.svelte';
  import ScottsBluffArt from './ScottsBluffArt.svelte';
  import FortLaramieArt from './FortLaramieArt.svelte';
  import IndependenceRockArt from './IndependenceRockArt.svelte';
  import DevilsGateArt from './DevilsGateArt.svelte';
  import SouthPassArt from './SouthPassArt.svelte';
  import FortBridgerArt from './FortBridgerArt.svelte';
  import SodaSpringsArt from './SodaSpringsArt.svelte';
  import FortHallArt from './FortHallArt.svelte';
  import ThreeIslandArt from './ThreeIslandArt.svelte';
  import WhitmanMissionArt from './WhitmanMissionArt.svelte';
  import TheDallesArt from './TheDallesArt.svelte';
  import BarlowRoadArt from './BarlowRoadArt.svelte';

  interface RegistryEntry {
    Art: Component;
    tone: LandmarkTone;
  }

  /** id → art-component dispatch. Add a row when a new landmark ports.
   *  Keys must match `LANDMARKS[].id` from
   *  src/lib/game/content/landmarks.ts. */
  const REGISTRY: Partial<Record<LandmarkId, RegistryEntry>> = {
    independence: { Art: IndependenceArt, tone: 'warm' },
    kansas_river: { Art: KansasRiverArt, tone: 'warm' },
    big_blue_river: { Art: BigBlueArt, tone: 'warm' },
    ft_kearny: { Art: FortKearnyArt, tone: 'warm' },
    courthouse_rock: { Art: CourthouseJailArt, tone: 'warm' },
    chimney_rock: { Art: ChimneyRockArt, tone: 'warm' },
    scotts_bluff: { Art: ScottsBluffArt, tone: 'warm' },
    ft_laramie: { Art: FortLaramieArt, tone: 'warm' },
    independence_rock: { Art: IndependenceRockArt, tone: 'warm' },
    devils_gate: { Art: DevilsGateArt, tone: 'warm' },
    south_pass: { Art: SouthPassArt, tone: 'cool' },
    ft_bridger: { Art: FortBridgerArt, tone: 'warm' },
    soda_springs: { Art: SodaSpringsArt, tone: 'cool' },
    ft_hall: { Art: FortHallArt, tone: 'cool' },
    snake_three_island: { Art: ThreeIslandArt, tone: 'warm' },
    whitman_mission: { Art: WhitmanMissionArt, tone: 'warm' },
    the_dalles: { Art: TheDallesArt, tone: 'cool' },
    barlow_road: { Art: BarlowRoadArt, tone: 'gold' }
  };

  /** True if this id has a ported art component. Call sites
   *  (LandmarkStage, TownStage, TrailMapSnippet tooltip, etc.) can use
   *  this to decide between rendering art and showing placeholder
   *  chrome. */
  export function hasLandmarkArt(id: string): boolean {
    return id in REGISTRY;
  }
</script>

<script lang="ts">
  import LandmarkArtFrame from './LandmarkArtFrame.svelte';

  interface Props {
    /** Landmark id from `LANDMARKS[].id`. Plain string so call sites can
     *  pass `landmark.id` without casting; unregistered ids no-op. */
    id: string;
    /** Override the registry's default tone if a panel demands it. */
    tone?: LandmarkTone;
    /** Desaturated/dimmed for ruined or post-massacre states (e.g.
     *  Whitman Mission post-1847). */
    abandoned?: boolean;
  }

  let { id, tone, abandoned = false }: Props = $props();

  const entry = $derived(REGISTRY[id as LandmarkId]);
  const resolvedTone = $derived(tone ?? entry?.tone ?? 'warm');
  // Filter ids must be unique per mounted instance; SVG <defs> are
  // global. Use a per-instance random suffix.
  const filterId = $derived(`lmk-${id}-${Math.random().toString(36).slice(2, 7)}`);
</script>

{#if entry}
  <LandmarkArtFrame tone={resolvedTone} {filterId} {abandoned}>
    <entry.Art />
  </LandmarkArtFrame>
{/if}
