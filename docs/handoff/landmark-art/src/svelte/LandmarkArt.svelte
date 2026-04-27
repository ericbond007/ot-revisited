<!--
  LandmarkArt.svelte — index component.
  ─────────────────────────────────────
  Picks the right landmark by id and renders it inside a LandmarkArtFrame.
  This is the only component the rest of the app should mount; the 18 art
  components are implementation detail.

      <LandmarkArt id="chimney-rock" />
      <LandmarkArt id="whitman-mission" abandoned />   <!-- post-1847 -->

  Wire it into the existing flow:
    • LandmarkModal.svelte   → header art panel
    • TrailMapSnippet.svelte → tooltip thumbnail on hover
    • CampStage.svelte       → backdrop when camped at a fort

  Keep `id` matching the canonical LANDMARKS[].id string so a single source
  of truth drives both map position and which artwork to render.
-->
<script lang="ts">
  import LandmarkArtFrame from './LandmarkArtFrame.svelte';
  import type { LandmarkId, LandmarkTone } from './landmark-art-tokens';

  // Port these one by one from src/*-art.jsx; this index just dispatches.
  import IndependenceArt      from './IndependenceArt.svelte';
  import KansasRiverArt       from './KansasRiverArt.svelte';
  import BigBlueArt           from './BigBlueArt.svelte';
  import FortKearnyArt        from './FortKearnyArt.svelte';
  import CourthouseJailArt    from './CourthouseJailArt.svelte';
  import ChimneyRockArt       from './ChimneyRockArt.svelte';
  import ScottsBluffArt       from './ScottsBluffArt.svelte';
  import FortLaramieArt       from './FortLaramieArt.svelte';
  import IndependenceRockArt  from './IndependenceRockArt.svelte';
  import DevilsGateArt        from './DevilsGateArt.svelte';
  import SouthPassArt         from './SouthPassArt.svelte';
  import FortBridgerArt       from './FortBridgerArt.svelte';
  import SodaSpringsArt       from './SodaSpringsArt.svelte';
  import FortHallArt          from './FortHallArt.svelte';
  import ThreeIslandArt       from './ThreeIslandArt.svelte';
  import WhitmanMissionArt    from './WhitmanMissionArt.svelte';
  import TheDallesArt         from './TheDallesArt.svelte';
  import BarlowRoadArt        from './BarlowRoadArt.svelte';

  const REGISTRY = {
    'independence':       { Art: IndependenceArt,     tone: 'warm' as LandmarkTone },
    'kansas-river':       { Art: KansasRiverArt,      tone: 'warm' as LandmarkTone },
    'big-blue':           { Art: BigBlueArt,          tone: 'warm' as LandmarkTone },
    'fort-kearny':        { Art: FortKearnyArt,       tone: 'warm' as LandmarkTone },
    'courthouse-jail':    { Art: CourthouseJailArt,   tone: 'warm' as LandmarkTone },
    'chimney-rock':       { Art: ChimneyRockArt,      tone: 'warm' as LandmarkTone },
    'scotts-bluff':       { Art: ScottsBluffArt,      tone: 'warm' as LandmarkTone },
    'fort-laramie':       { Art: FortLaramieArt,      tone: 'warm' as LandmarkTone },
    'independence-rock':  { Art: IndependenceRockArt, tone: 'warm' as LandmarkTone },
    'devils-gate':        { Art: DevilsGateArt,       tone: 'warm' as LandmarkTone },
    'south-pass':         { Art: SouthPassArt,        tone: 'cool' as LandmarkTone },
    'fort-bridger':       { Art: FortBridgerArt,      tone: 'warm' as LandmarkTone },
    'soda-springs':       { Art: SodaSpringsArt,      tone: 'cool' as LandmarkTone },
    'fort-hall':          { Art: FortHallArt,         tone: 'cool' as LandmarkTone },
    'three-island':       { Art: ThreeIslandArt,      tone: 'warm' as LandmarkTone },
    'whitman-mission':    { Art: WhitmanMissionArt,   tone: 'warm' as LandmarkTone },
    'the-dalles':         { Art: TheDallesArt,        tone: 'cool' as LandmarkTone },
    'barlow-road':        { Art: BarlowRoadArt,       tone: 'gold' as LandmarkTone },
  } as const;

  interface Props {
    id: LandmarkId;
    /** Override the registry's default tone if a panel demands it. */
    tone?: LandmarkTone;
    /** Desaturated/dimmed for ruined or post-massacre states. */
    abandoned?: boolean;
  }

  let { id, tone, abandoned = false }: Props = $props();

  const entry = $derived(REGISTRY[id]);
  const resolvedTone = $derived(tone ?? entry.tone);
  // Filter ids must be unique per mounted instance; SVG <defs> are global.
  const filterId = $derived(`lmk-${id}-${Math.random().toString(36).slice(2, 7)}`);
</script>

{#if entry}
  <LandmarkArtFrame tone={resolvedTone} {filterId} {abandoned}>
    <entry.Art />
  </LandmarkArtFrame>
{/if}
