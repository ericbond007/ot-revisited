<script lang="ts">
  // Rations stat — drumstick matching 🍖 emoji silhouette. Ported verbatim
  // from docs/handoff/stat-icons/src/stat-icons.jsx (RationsIcon). Path
  // data is committed — don't optimize or redraw.
  import { SI } from './stat-icon-tokens';
</script>

<!-- meat ball -->
<circle cx="15.5" cy="15.5" r="5.2" fill={SI.meat} opacity="0.95" />
<ellipse cx="14" cy="14" rx="2.4" ry="1.8" fill={SI.meatLight} opacity="0.55" transform="rotate(-30 14 14)" />
<circle cx="15.5" cy="15.5" r="5.2" fill="none" stroke={SI.ink} stroke-width="1.1" />
<!-- bone shaft -->
<path d="M 11.5 12 L 6 6.5 L 4.5 8 L 9.5 14 Z" fill={SI.bone} />
<path d="M 11.5 12 L 6 6.5 L 4.5 8 L 9.5 14 Z" fill="none" stroke={SI.ink} stroke-width="1.1" stroke-linejoin="round" />
<!-- bone knob — double lobe -->
<circle cx="5.2" cy="5.6" r="1.6" fill={SI.bone} />
<circle cx="3.8" cy="7"   r="1.6" fill={SI.bone} />
<circle cx="5.2" cy="5.6" r="1.6" fill="none" stroke={SI.ink} stroke-width="1.1" />
<circle cx="3.8" cy="7"   r="1.6" fill="none" stroke={SI.ink} stroke-width="1.1" />
<!-- meat-meets-bone seam -->
<path d="M 10.2 12.6 Q 11.5 13 12 14" fill="none" stroke={SI.ink} stroke-width="0.6" opacity="0.5" />
<line x1="5.5" y1="7.5" x2="10.5" y2="13" stroke={SI.ink} stroke-width="0.5" opacity="0.3" />
