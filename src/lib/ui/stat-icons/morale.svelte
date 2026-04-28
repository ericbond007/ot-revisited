<script lang="ts">
  // Morale stat — concertina (period-correct 1840s instrument). Ported
  // verbatim from docs/handoff/stat-icons/src/stat-icons.jsx (MoraleIcon).
  // Path data is committed — don't optimize or redraw.
  import { SI } from './stat-icon-tokens';
</script>

<!-- bellows -->
<path d="M 9 7.5 Q 12 6.5 15 7.5 L 15 16.5 Q 12 17.5 9 16.5 Z" fill={SI.squeeze} />
<path d="M 9 7.5 Q 12 6.5 15 7.5 L 15 16.5 Q 12 17.5 9 16.5 Z" fill="none" stroke={SI.ink} stroke-width="1.1" stroke-linejoin="round" />
<!-- side boxes -->
<path d="M 5 9 L 9 7 L 9 17 L 5 15 Z" fill={SI.woodAccent} opacity="0.92" />
<path d="M 5 9 L 9 7 L 9 17 L 5 15 Z" fill="none" stroke={SI.ink} stroke-width="1.1" stroke-linejoin="round" />
<path d="M 19 9 L 15 7 L 15 17 L 19 15 Z" fill={SI.woodAccent} opacity="0.92" />
<path d="M 19 9 L 15 7 L 15 17 L 19 15 Z" fill="none" stroke={SI.ink} stroke-width="1.1" stroke-linejoin="round" />
<!-- bellows folds -->
<line x1="11" y1="9" x2="11" y2="15" stroke={SI.ink} stroke-width="0.6" />
<line x1="13" y1="9" x2="13" y2="15" stroke={SI.ink} stroke-width="0.6" />
<!-- buttons -->
<circle cx="6.6"  cy="10.6" r="0.55" fill={SI.squeeze} />
<circle cx="6.6"  cy="13"   r="0.55" fill={SI.squeeze} />
<circle cx="17.4" cy="10.6" r="0.55" fill={SI.squeeze} />
<circle cx="17.4" cy="13"   r="0.55" fill={SI.squeeze} />
