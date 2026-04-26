<script lang="ts">
  // Composed terrain layers: Far + Mid + GroundBand + Near.
  //
  // Layer order (back → front, matching README.md): far parallax →
  // ground gradient → near parallax. Mid sits between far and the
  // ground band. Wagon + landmarks render OVER this in the parent
  // composer (Phase 6); this component owns only terrain.
  //
  // Caller supplies `scrollX` (driven by the scene tick) and the
  // scene constants (`horizonY`, `groundY`, `w`, `h`). All movement
  // derives from `scrollX` — no CSS animations.
  import type { Terrain } from '$lib/game/types';
  import { HORIZON_Y, GROUND_Y, SCENE_W, SCENE_H } from './terrain-tokens';
  import FarLayer from './FarLayer.svelte';
  import MidLayer from './MidLayer.svelte';
  import NearLayer from './NearLayer.svelte';
  import GroundBand from './GroundBand.svelte';

  interface Props {
    terrain: Terrain;
    scrollX: number;
    horizonY?: number;
    groundY?: number;
    w?: number;
    h?: number;
    /** Unique-ish prefix for the GroundBand gradient ids. Pass when
     *  multiple ParallaxBands render on one page. */
    idPrefix?: string;
  }

  let {
    terrain,
    scrollX,
    horizonY = HORIZON_Y,
    groundY = GROUND_Y,
    w = SCENE_W,
    h = SCENE_H,
    idPrefix = 'pb'
  }: Props = $props();

  const groundH = $derived(h - groundY);
</script>

<g>
  <FarLayer {terrain} {scrollX} {horizonY} />
  <MidLayer {terrain} {scrollX} {horizonY} {groundY} />
  <GroundBand {terrain} {groundY} h={groundH} {w} {idPrefix} />
  <NearLayer {terrain} {scrollX} {groundY} />
</g>
