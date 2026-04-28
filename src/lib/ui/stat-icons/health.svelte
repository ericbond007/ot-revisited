<script lang="ts">
  // Health stat — heart with highlight wash. Worked-port template for
  // "single hero shape with overlay highlight." Ported verbatim from
  // docs/handoff/stat-icons/src/stat-icons.jsx (HealthIcon). Path
  // data is committed — don't optimize or redraw.
  import { SI } from './stat-icon-tokens';
</script>

<path d="M 12 20.5 C 4 14 4 6.5 8 4.5 C 10 3.5 12 5.5 12 6.5 C 12 5.5 14 3.5 16 4.5 C 20 6.5 20 14 12 20.5 Z" fill={SI.heart} opacity="0.92" />
<path d="M 9 7 Q 7.5 9 8.5 11.5" fill="none" stroke={SI.highlight} stroke-width="0.9" opacity="0.6" stroke-linecap="round" />
<path d="M 12 20.5 C 4 14 4 6.5 8 4.5 C 10 3.5 12 5.5 12 6.5 C 12 5.5 14 3.5 16 4.5 C 20 6.5 20 14 12 20.5 Z" fill="none" stroke={SI.ink} stroke-width="1.2" stroke-linejoin="round" />
