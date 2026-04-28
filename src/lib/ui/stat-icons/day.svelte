<script lang="ts">
  // Day stat — sun with 8 rays. Worked-port template for "simple
  // geometric glyph with stroke detail." Ported verbatim from
  // docs/handoff/stat-icons/src/stat-icons.jsx (DayIcon).
  // Path data is committed — don't optimize or redraw.
  import { SI } from './stat-icon-tokens';
</script>

<circle cx="12" cy="12" r="4.4" fill={SI.sun} opacity="0.92" />
<circle cx="12" cy="12" r="4.4" fill="none" stroke={SI.ink} stroke-width="1.1" />
<g stroke={SI.ink} stroke-width="1.4" stroke-linecap="round">
  <line x1="12" y1="3" x2="12" y2="6" />
  <line x1="12" y1="18" x2="12" y2="21" />
  <line x1="3" y1="12" x2="6" y2="12" />
  <line x1="18" y1="12" x2="21" y2="12" />
  <line x1="5.6" y1="5.6" x2="7.5" y2="7.5" />
  <line x1="16.5" y1="16.5" x2="18.4" y2="18.4" />
  <line x1="5.6" y1="18.4" x2="7.5" y2="16.5" />
  <line x1="16.5" y1="7.5" x2="18.4" y2="5.6" />
</g>
