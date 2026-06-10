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

  import AlcoveSpring        from './alcove_spring.svelte';
  import AshHollow           from './ash_hollow.svelte';
  import BarlowRoad          from './barlow_road.svelte';
  import BearRiver           from './bear_river.svelte';
  import BigBlueRiver        from './big_blue_river.svelte';
  import BlueMountains       from './blue_mountains.svelte';
  import ChimneyRock         from './chimney_rock.svelte';
  import CourthouseRock     from './courthouse_rock.svelte';
  import DevilsGate          from './devils_gate.svelte';
  import FarewellBend        from './farewell_bend.svelte';
  import FortBoise           from './ft_boise.svelte';
  import FortBridger         from './ft_bridger.svelte';
  import FortHall            from './ft_hall.svelte';
  import FortKearny          from './ft_kearny.svelte';
  import FortLaramie         from './ft_laramie.svelte';
  import FortWallaWalla      from './ft_walla_walla.svelte';
  import GrandeRonde         from './grande_ronde.svelte';
  import GreenRiver          from './green_river.svelte';
  import GuernseyRuts        from './guernsey_ruts.svelte';
  import HollenbergRanch     from './hollenberg_ranch.svelte';
  import NativeCamp          from './native_camp.svelte';
  import IceSlough           from './ice_slough.svelte';
  import IndependenceMo      from './independence_mo.svelte';
  import IndependenceRock    from './independence_rock.svelte';
  import KansasRiver         from './kansas_river.svelte';
  import LaurelHill          from './laurel_hill.svelte';
  import NorthPlatte1        from './north_platte_1.svelte';
  import NorthPlatte2        from './north_platte_2.svelte';
  import OregonCity          from './oregon_city.svelte';
  import PacificSprings      from './pacific_springs.svelte';
  import PartingOfWays       from './parting_of_ways.svelte';
  import RegisterCliff       from './register_cliff.svelte';
  import RobidouxPost        from './robidoux_post.svelte';
  import ScottsBluff         from './scotts_bluff.svelte';
  import SodaSprings         from './soda_springs.svelte';
  import SouthPass           from './south_pass.svelte';
  import Sweetwater1         from './sweetwater_1.svelte';
  import TheDalles           from './the_dalles.svelte';
  import SnakeThreeIsland    from './snake_three_island.svelte';
  import WhitmanMission      from './whitman_mission.svelte';
  import WillowSprings       from './willow_springs.svelte';

  // Full registry — all 40 landmark ids mapped. `Partial<>` preserved
  // so the type stays compatible if future ids are added before porting.
  const REGISTRY: Partial<Record<LandmarkIconId, Component>> = {
    alcove_spring:          AlcoveSpring,
    ash_hollow:             AshHollow,
    barlow_road:            BarlowRoad,
    bear_river:             BearRiver,
    big_blue_river:         BigBlueRiver,
    blue_mountains:         BlueMountains,
    chimney_rock:           ChimneyRock,
    courthouse_rock:        CourthouseRock,
    devils_gate:            DevilsGate,
    farewell_bend:          FarewellBend,
    ft_boise:               FortBoise,
    ft_bridger:             FortBridger,
    ft_hall:                FortHall,
    ft_kearny:              FortKearny,
    ft_laramie:             FortLaramie,
    ft_walla_walla:         FortWallaWalla,
    grande_ronde:           GrandeRonde,
    green_river:            GreenRiver,
    guernsey_ruts:          GuernseyRuts,
    hollenberg_ranch:       HollenbergRanch,
    cheyenne_camp:          NativeCamp,
    shoshone_camp:          NativeCamp,
    ice_slough:             IceSlough,
    independence_mo:        IndependenceMo,
    independence_rock:      IndependenceRock,
    kansas_river:           KansasRiver,
    laurel_hill:            LaurelHill,
    north_platte_1:         NorthPlatte1,
    north_platte_2:         NorthPlatte2,
    oregon_city:            OregonCity,
    pacific_springs:        PacificSprings,
    parting_of_ways:        PartingOfWays,
    register_cliff:         RegisterCliff,
    robidoux_post:          RobidouxPost,
    scotts_bluff:           ScottsBluff,
    soda_springs:           SodaSprings,
    south_pass:             SouthPass,
    sweetwater_1:           Sweetwater1,
    the_dalles:             TheDalles,
    snake_three_island:     SnakeThreeIsland,
    whitman_mission:        WhitmanMission,
    willow_springs:         WillowSprings,
  };

  let { id, size = 24, title, className = '', inline = false }: {
    id: LandmarkIconId | string;
    size?: number;
    title?: string;
    className?: string;
    /** When true, render bare `<g>` content scaled+centered at the
     *  parent SVG's origin — for embedding inside another `<svg>`
     *  (e.g. trail-map pins). When false (default), render an outer
     *  `<svg viewBox="0 0 24 24">` for HTML mounting (modal headers,
     *  the dev specimen). */
    inline?: boolean;
  } = $props();

  const Art = $derived(REGISTRY[id as LandmarkIconId]);
  // Inline mode: scale 24-unit art down to `size`, then translate so
  // the visual center sits at the parent group's origin (0,0).
  // SVG transforms apply right-to-left, so this reads:
  //   scale(size/24) → 24×24 becomes size×size with origin at (0,0)
  //   translate(-size/2, -size/2) → shift so center is at (0,0)
  const inlineXf = $derived(`translate(${-size / 2}, ${-size / 2}) scale(${size / 24})`);
</script>

{#if inline}
  {#if Art}
    <g transform={inlineXf}>
      {#if title}<title>{title}</title>{/if}
      <Art />
    </g>
  {:else}
    <g transform={inlineXf}>
      {#if title}<title>{title}</title>{/if}
      <circle cx="12" cy="12" r="10" fill="#e8d9b8" stroke="#2a1a08" stroke-width="0.8" />
      <text x="12" y="16" font-size="10" font-family="Georgia, serif"
            text-anchor="middle" fill="#2a1a08">?</text>
    </g>
  {/if}
{:else}
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
{/if}

<script lang="ts" module>
  /** Returns true when LandmarkIcon has bespoke art for the given id.
   *  Call sites use this to decide whether to render the icon vs.
   *  fall back to the legacy emoji glyph. */
  export function hasLandmarkIcon(id: string): boolean {
    return REGISTRY_KEYS.has(id);
  }

  // Mirrors the keys of REGISTRY above. Keep in sync when porting.
  const REGISTRY_KEYS = new Set<string>([
    'alcove_spring',
    'ash_hollow',
    'barlow_road',
    'bear_river',
    'big_blue_river',
    'blue_mountains',
    'chimney_rock',
    'courthouse_rock',
    'devils_gate',
    'farewell_bend',
    'ft_boise',
    'ft_bridger',
    'ft_hall',
    'ft_kearny',
    'ft_laramie',
    'ft_walla_walla',
    'grande_ronde',
    'green_river',
    'guernsey_ruts',
    'hollenberg_ranch',
    'cheyenne_camp',
    'shoshone_camp',
    'ice_slough',
    'independence_mo',

    'independence_rock',
    'kansas_river',
    'laurel_hill',
    'north_platte_1',
    'north_platte_2',
    'oregon_city',
    'pacific_springs',
    'parting_of_ways',
    'register_cliff',
    'robidoux_post',
    'scotts_bluff',
    'soda_springs',
    'south_pass',
    'sweetwater_1',
    'the_dalles',
    'snake_three_island',
    'whitman_mission',
    'willow_springs',
    // #242-#253 historical-landmark batch — registered here so the
    // canonical → registry coverage test stays green. Bespoke SVG
    // icons for each are a Phase-2 design follow-up; until then they
    // render the dispatcher placeholder (parchment dot with a "?").
    'lone_elm_campground',
    'vieux_crossing',
    'rock_creek_station',
    'windlass_hill',
    'rachel_pattison_grave',
    'ft_caspar',
    'martins_cove',
    'big_hill',
    'massacre_rocks',
    'salmon_falls',
    'burnt_river_canyon',
    'flagstaff_hill',
    // #1281 — new point-access landmarks (Snake ×2, Columbia plateau ×4).
    // No bespoke SVG icons yet — Icons/Backgrounds follow-up ticket pending.
    'american_falls',
    'rock_creek_snake',
    'umatilla_river',
    'willow_creek_or',
    'john_day_river',
    'deschutes_river',
  ]);
</script>
