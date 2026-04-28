<script lang="ts">
  // Water stat — droplet with depth wash. Ported verbatim from
  // docs/handoff/stat-icons/src/stat-icons.jsx (WaterIcon). Path
  // data is committed — don't optimize or redraw.
  import { SI } from './stat-icon-tokens';
</script>

<path d="M 12 3 C 12 3 5 11 5 16 C 5 19.5 8 22 12 22 C 16 22 19 19.5 19 16 C 19 11 12 3 12 3 Z" fill={SI.river} opacity="0.88" />
<path d="M 7 14 Q 12 18 17 14 Q 17 19 12 21 Q 7 19 7 14 Z" fill={SI.riverDeep} opacity="0.4" />
<path d="M 9 17 Q 9 19 11 19" stroke={SI.parchment} stroke-width="1" fill="none" stroke-linecap="round" opacity="0.85" />
<path d="M 12 3 C 12 3 5 11 5 16 C 5 19.5 8 22 12 22 C 16 22 19 19.5 19 16 C 19 11 12 3 12 3 Z" fill="none" stroke={SI.ink} stroke-width="1.2" stroke-linejoin="round" />
