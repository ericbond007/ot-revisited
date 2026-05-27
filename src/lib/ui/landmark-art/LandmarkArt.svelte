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
  import LoneElmCampgroundArt from './LoneElmCampgroundArt.svelte';
  import KansasRiverArt from './KansasRiverArt.svelte';
  import VieuxCrossingArt from './VieuxCrossingArt.svelte';
  import AlcoveSpringArt from './AlcoveSpringArt.svelte';
  import BigBlueArt from './BigBlueArt.svelte';
  import HollenbergRanchArt from './HollenbergRanchArt.svelte';
  import RockCreekStationArt from './RockCreekStationArt.svelte';
  import FortKearnyArt from './FortKearnyArt.svelte';
  import WindlassHillArt from './WindlassHillArt.svelte';
  import AshHollowArt from './AshHollowArt.svelte';
  import RachelPattisonGraveArt from './RachelPattisonGraveArt.svelte';
  import NorthPlatteEastArt from './NorthPlatteEastArt.svelte';
  import CourthouseJailArt from './CourthouseJailArt.svelte';
  import ChimneyRockArt from './ChimneyRockArt.svelte';
  import ScottsBluffArt from './ScottsBluffArt.svelte';
  import RobidouxPostArt from './RobidouxPostArt.svelte';
  import FortLaramieArt from './FortLaramieArt.svelte';
  import RegisterCliffArt from './RegisterCliffArt.svelte';
  import GuernseyRutsArt from './GuernseyRutsArt.svelte';
  import FortCasparArt from './FortCasparArt.svelte';
  import MartinsCoveArt from './MartinsCoveArt.svelte';
  import NorthPlatteWestArt from './NorthPlatteWestArt.svelte';
  import WillowSpringsArt from './WillowSpringsArt.svelte';
  import IndependenceRockArt from './IndependenceRockArt.svelte';
  import DevilsGateArt from './DevilsGateArt.svelte';
  import SweetwaterFordArt from './SweetwaterFordArt.svelte';
  import IceSloughArt from './IceSloughArt.svelte';
  import SouthPassArt from './SouthPassArt.svelte';
  import PacificSpringsArt from './PacificSpringsArt.svelte';
  import PartingOfWaysArt from './PartingOfWaysArt.svelte';
  import GreenRiverArt from './GreenRiverArt.svelte';
  import BigHillArt from './BigHillArt.svelte';
  import FortBridgerArt from './FortBridgerArt.svelte';
  import BearRiverArt from './BearRiverArt.svelte';
  import SodaSpringsArt from './SodaSpringsArt.svelte';
  import FortHallArt from './FortHallArt.svelte';
  import ThreeIslandArt from './ThreeIslandArt.svelte';
  import FortBoiseArt from './FortBoiseArt.svelte';
  import BurntRiverCanyonArt from './BurntRiverCanyonArt.svelte';
  import FlagstaffHillArt from './FlagstaffHillArt.svelte';
  import FarewellBendArt from './FarewellBendArt.svelte';
  import BlueMountainsArt from './BlueMountainsArt.svelte';
  import GrandeRondeArt from './GrandeRondeArt.svelte';
  import FortWallaWallaArt from './FortWallaWallaArt.svelte';
  import WhitmanMissionArt from './WhitmanMissionArt.svelte';
  import TheDallesArt from './TheDallesArt.svelte';
  import BarlowRoadArt from './BarlowRoadArt.svelte';
  import OregonCityArt from './OregonCityArt.svelte';

  interface RegistryEntry {
    Art: Component;
    tone: LandmarkTone;
  }

  /** id → art-component dispatch. Add a row when a new landmark ports.
   *  Keys must match `LANDMARKS[].id` from
   *  src/lib/game/content/landmarks.ts. */
  const REGISTRY: Partial<Record<LandmarkId, RegistryEntry>> = {
    independence_mo: { Art: IndependenceArt, tone: 'warm' },
    lone_elm_campground: { Art: LoneElmCampgroundArt, tone: 'warm' },
    kansas_river: { Art: KansasRiverArt, tone: 'warm' },
    vieux_crossing: { Art: VieuxCrossingArt, tone: 'warm' },
    alcove_spring: { Art: AlcoveSpringArt, tone: 'warm' },
    big_blue_river: { Art: BigBlueArt, tone: 'warm' },
    hollenberg_ranch: { Art: HollenbergRanchArt, tone: 'warm' },
    rock_creek_station: { Art: RockCreekStationArt, tone: 'warm' },
    ft_kearny: { Art: FortKearnyArt, tone: 'warm' },
    windlass_hill: { Art: WindlassHillArt, tone: 'warm' },
    ash_hollow: { Art: AshHollowArt, tone: 'warm' },
    rachel_pattison_grave: { Art: RachelPattisonGraveArt, tone: 'warm' },
    // The new bundle ships these as `north-platte-east` and `north-platte-west`;
    // we map to our existing `north_platte_1` (mile 545) and `_2` (mile 875).
    north_platte_1: { Art: NorthPlatteEastArt, tone: 'warm' },
    courthouse_rock: { Art: CourthouseJailArt, tone: 'warm' },
    chimney_rock: { Art: ChimneyRockArt, tone: 'warm' },
    scotts_bluff: { Art: ScottsBluffArt, tone: 'warm' },
    robidoux_post: { Art: RobidouxPostArt, tone: 'warm' },
    ft_laramie: { Art: FortLaramieArt, tone: 'warm' },
    register_cliff: { Art: RegisterCliffArt, tone: 'warm' },
    guernsey_ruts: { Art: GuernseyRutsArt, tone: 'warm' },
    ft_caspar: { Art: FortCasparArt, tone: 'warm' },
    martins_cove: { Art: MartinsCoveArt, tone: 'warm' },
    north_platte_2: { Art: NorthPlatteWestArt, tone: 'warm' },
    willow_springs: { Art: WillowSpringsArt, tone: 'warm' },
    independence_rock: { Art: IndependenceRockArt, tone: 'warm' },
    devils_gate: { Art: DevilsGateArt, tone: 'warm' },
    // Bundle ships as `sweetwater-ford` → our `sweetwater_1` (mile 932).
    sweetwater_1: { Art: SweetwaterFordArt, tone: 'cool' },
    ice_slough: { Art: IceSloughArt, tone: 'cool' },
    south_pass: { Art: SouthPassArt, tone: 'cool' },
    pacific_springs: { Art: PacificSpringsArt, tone: 'cool' },
    parting_of_ways: { Art: PartingOfWaysArt, tone: 'warm' },
    green_river: { Art: GreenRiverArt, tone: 'warm' },
    big_hill: { Art: BigHillArt, tone: 'warm' },
    ft_bridger: { Art: FortBridgerArt, tone: 'warm' },
    bear_river: { Art: BearRiverArt, tone: 'cool' },
    soda_springs: { Art: SodaSpringsArt, tone: 'cool' },
    ft_hall: { Art: FortHallArt, tone: 'cool' },
    snake_three_island: { Art: ThreeIslandArt, tone: 'warm' },
    ft_boise: { Art: FortBoiseArt, tone: 'cool' },
    burnt_river_canyon: { Art: BurntRiverCanyonArt, tone: 'warm' },
    flagstaff_hill: { Art: FlagstaffHillArt, tone: 'warm' },
    farewell_bend: { Art: FarewellBendArt, tone: 'warm' },
    blue_mountains: { Art: BlueMountainsArt, tone: 'gold' },
    grande_ronde: { Art: GrandeRondeArt, tone: 'warm' },
    ft_walla_walla: { Art: FortWallaWallaArt, tone: 'cool' },
    whitman_mission: { Art: WhitmanMissionArt, tone: 'warm' },
    the_dalles: { Art: TheDallesArt, tone: 'cool' },
    barlow_road: { Art: BarlowRoadArt, tone: 'gold' },
    oregon_city: { Art: OregonCityArt, tone: 'gold' }
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
