<script lang="ts">
  // Date stat — calendar with rust header and today dot. Ported verbatim
  // from docs/handoff/stat-icons/src/stat-icons.jsx (DateIcon). Path
  // data is committed — don't optimize or redraw.
  import { SI } from './stat-icon-tokens';
</script>

<rect x="4" y="6" width="16" height="14" rx="1" fill={SI.parchment} />
<rect x="4" y="6" width="16" height="3.5" fill={SI.rust} opacity="0.85" />
<rect x="4" y="6" width="16" height="14" rx="1" fill="none" stroke={SI.ink} stroke-width="1.1" />
<line x1="4" y1="9.5" x2="20" y2="9.5" stroke={SI.ink} stroke-width="1" />
<line x1="8" y1="3.5" x2="8" y2="7.5" stroke={SI.ink} stroke-width="1.4" stroke-linecap="round" />
<line x1="16" y1="3.5" x2="16" y2="7.5" stroke={SI.ink} stroke-width="1.4" stroke-linecap="round" />
<circle cx="8"  cy="13" r="0.7" fill={SI.ink} />
<circle cx="12" cy="13" r="0.7" fill={SI.ink} />
<circle cx="16" cy="13" r="0.7" fill={SI.ink} />
<circle cx="8"  cy="17" r="0.7" fill={SI.ink} />
<circle cx="12" cy="17" r="1.3" fill={SI.rust} />
<circle cx="12" cy="17" r="1.3" fill="none" stroke={SI.ink} stroke-width="0.6" />
