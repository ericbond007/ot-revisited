<script lang="ts">
  // Sky gradient definition — emits a <linearGradient> element with
  // the three-stop palette for the given (terrain, timeOfDay). Caller
  // provides the `id` and references it via fill="url(#<id>)" on a
  // <rect>. Lives inside <defs> in the parent <svg>.
  import type { Terrain } from '$lib/game/types';
  import { SKY, type TimeOfDay } from './terrain-tokens';

  interface Props {
    id: string;
    terrain: Terrain;
    timeOfDay?: TimeOfDay;
  }

  let { id, terrain, timeOfDay = 'day' }: Props = $props();
  const stops = $derived(SKY[terrain]?.[timeOfDay] ?? SKY.prairie.day);
</script>

<linearGradient {id} x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color={stops[0]} />
  <stop offset="60%" stop-color={stops[1]} />
  <stop offset="100%" stop-color={stops[2]} />
</linearGradient>
