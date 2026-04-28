<script lang="ts">
  // Leg stat — surveyor's pocket compass. Fresh glyph drawn in the
  // bundle's vocabulary because the bundle pre-dates the addition of
  // `leg` to ICON.stats. Brass case + ivory dial + simple N/S+E/W
  // cardinal marks + an ink-and-rust needle. Reads at 16 px.
  //
  // The "leg" stat tracks which segment of the trail the party is on
  // (Independence-to-Kearny, Kearny-to-Laramie, etc.); a compass is
  // the period instrument every wagon-master carried for that.
  import { SI } from './stat-icon-tokens';
</script>

<!-- brass case ring -->
  <circle cx="12" cy="12" r="9" fill={SI.brass} />
  <circle cx="12" cy="12" r="9" fill="none" stroke={SI.ink} stroke-width="1.1" />
  <!-- ivory dial -->
  <circle cx="12" cy="12" r="7" fill={SI.bone} />
  <circle cx="12" cy="12" r="7" fill="none" stroke={SI.brassDeep} stroke-width="0.5" />
  <!-- cardinal tick marks -->
  <line x1="12" y1="5.5" x2="12" y2="7.5" stroke={SI.ink} stroke-width="0.8" stroke-linecap="round" />
  <line x1="12" y1="16.5" x2="12" y2="18.5" stroke={SI.ink} stroke-width="0.6" stroke-linecap="round" />
  <line x1="5.5" y1="12" x2="7.5" y2="12" stroke={SI.ink} stroke-width="0.6" stroke-linecap="round" />
  <line x1="16.5" y1="12" x2="18.5" y2="12" stroke={SI.ink} stroke-width="0.6" stroke-linecap="round" />
  <!-- needle — north half rust, south half ink -->
  <path d="M 12 12 L 10.4 7.5 L 12 6.5 L 13.6 7.5 Z" fill={SI.rust} stroke={SI.ink} stroke-width="0.5" stroke-linejoin="round" />
  <path d="M 12 12 L 10.4 16.5 L 12 17.5 L 13.6 16.5 Z" fill={SI.ink} stroke={SI.ink} stroke-width="0.5" stroke-linejoin="round" />
  <!-- pivot bead -->
  <circle cx="12" cy="12" r="0.9" fill={SI.brassDeep} />
  <circle cx="12" cy="12" r="0.9" fill="none" stroke={SI.ink} stroke-width="0.4" />
<!-- ring loop at top -->
<path d="M 11 3 Q 12 2 13 3" fill="none" stroke={SI.brassDeep} stroke-width="1.1" stroke-linecap="round" />
