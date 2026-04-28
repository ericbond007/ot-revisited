<!--
  LandmarkIcon.svelte — Svelte port of the React dispatcher.

  Renders one of 38 bespoke watercolor landmark icons inside a 24×24 viewBox.
  Stop landmarks (forts, fords, arrival landmarks) render with a circular
  hybrid badge; pass-by landmarks render as bare silhouettes.

  Usage:
    <LandmarkIcon id="chimney_rock" size={32} />
    <LandmarkIcon id={landmark.id} size={28} />

  Each icon is an inline <g>…</g>. To keep this single file readable, the
  art for each landmark lives in a separate `landmark-art/<id>.svelte.js`
  module that exports an SvelteComponent of just the inner SVG fragment.
  This file is the dispatcher only.
-->

<script>
  import Hollenberg          from "./landmark-art/hollenberg_ranch.svelte";
  import FortKearny          from "./landmark-art/fort_kearny.svelte";
  import Robidoux            from "./landmark-art/robidoux_post.svelte";
  import FortLaramie         from "./landmark-art/fort_laramie.svelte";
  import FortBridger         from "./landmark-art/fort_bridger.svelte";
  import FortHall            from "./landmark-art/fort_hall.svelte";
  import FortBoise           from "./landmark-art/fort_boise.svelte";
  import FortWallaWalla      from "./landmark-art/fort_walla_walla.svelte";
  import TheDalles           from "./landmark-art/the_dalles.svelte";
  import KansasRiver         from "./landmark-art/kansas_river.svelte";
  import BigBlueRiver        from "./landmark-art/big_blue_river.svelte";
  import NorthPlatteEast     from "./landmark-art/north_platte_east.svelte";
  import NorthPlatteWest     from "./landmark-art/north_platte_west.svelte";
  import SweetwaterFord      from "./landmark-art/sweetwater_1.svelte";
  import GreenRiver          from "./landmark-art/green_river.svelte";
  import BearRiver           from "./landmark-art/bear_river.svelte";
  import ThreeIsland         from "./landmark-art/three_island_crossing.svelte";
  import AlcoveSpring        from "./landmark-art/alcove_spring.svelte";
  import AshHollow           from "./landmark-art/ash_hollow.svelte";
  import ChimneyRock         from "./landmark-art/chimney_rock.svelte";
  import ScottsBluff         from "./landmark-art/scotts_bluff.svelte";
  import RegisterCliff       from "./landmark-art/register_cliff.svelte";
  import IndependenceRock    from "./landmark-art/independence_rock.svelte";
  import DevilsGate          from "./landmark-art/devils_gate.svelte";
  import SouthPass           from "./landmark-art/south_pass.svelte";
  import PacificSprings      from "./landmark-art/pacific_springs.svelte";
  import SodaSprings         from "./landmark-art/soda_springs.svelte";
  import LaurelHill          from "./landmark-art/laurel_hill.svelte";
  import CourthouseJail      from "./landmark-art/courthouse_jail_rocks.svelte";
  import GuernseyRuts        from "./landmark-art/guernsey_ruts.svelte";
  import WillowSprings       from "./landmark-art/willow_springs.svelte";
  import IceSlough           from "./landmark-art/ice_slough.svelte";
  import PartingOfTheWays    from "./landmark-art/parting_of_the_ways.svelte";
  import FarewellBend        from "./landmark-art/farewell_bend.svelte";
  import BlueMountains       from "./landmark-art/blue_mountains.svelte";
  import GrandeRonde         from "./landmark-art/grande_ronde_valley.svelte";
  import IndependenceMO      from "./landmark-art/independence_mo.svelte";
  import OregonCity          from "./landmark-art/oregon_city.svelte";

  /** @type {string} landmark id from landmarks.ts */
  export let id;
  /** @type {number} */
  export let size = 24;
  export let className = "";

  const REGISTRY = {
    hollenberg_ranch:      Hollenberg,
    fort_kearny:           FortKearny,
    robidoux_post:         Robidoux,
    fort_laramie:          FortLaramie,
    fort_bridger:          FortBridger,
    fort_hall:             FortHall,
    fort_boise:            FortBoise,
    fort_walla_walla:      FortWallaWalla,
    the_dalles:            TheDalles,
    kansas_river:          KansasRiver,
    big_blue_river:        BigBlueRiver,
    north_platte_east:     NorthPlatteEast,
    north_platte_west:     NorthPlatteWest,
    sweetwater_1:          SweetwaterFord,
    green_river:           GreenRiver,
    bear_river:            BearRiver,
    three_island_crossing: ThreeIsland,
    alcove_spring:         AlcoveSpring,
    ash_hollow:            AshHollow,
    chimney_rock:          ChimneyRock,
    scotts_bluff:          ScottsBluff,
    register_cliff:        RegisterCliff,
    independence_rock:     IndependenceRock,
    devils_gate:           DevilsGate,
    south_pass:            SouthPass,
    pacific_springs:       PacificSprings,
    soda_springs:          SodaSprings,
    laurel_hill:           LaurelHill,
    courthouse_jail_rocks: CourthouseJail,
    guernsey_ruts:         GuernseyRuts,
    willow_springs:        WillowSprings,
    ice_slough:            IceSlough,
    parting_of_the_ways:   PartingOfTheWays,
    farewell_bend:         FarewellBend,
    blue_mountains:        BlueMountains,
    grande_ronde_valley:   GrandeRonde,
    independence_mo:       IndependenceMO,
    oregon_city:           OregonCity,
  };

  $: Art = REGISTRY[id];
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class={className}
  aria-hidden="true"
  style="display: block;"
>
  {#if Art}
    <svelte:component this={Art} />
  {:else}
    <!-- fallback for unknown id -->
    <circle cx="12" cy="12" r="10" fill="#e8d9b8" stroke="#2a1a08" stroke-width="0.8" />
    <text x="12" y="16" font-size="10" font-family="Georgia, serif" text-anchor="middle" fill="#2a1a08">?</text>
  {/if}
</svg>
