<script lang="ts">
  // Weather stat — sun behind a cumulus cloud. Fresh glyph drawn in
  // the bundle's vocabulary because the bundle pre-dates the addition
  // of `weather` to ICON.stats. Yellow sun peeks out from behind a
  // muted-cream cloud silhouette with a sage-leaning underbelly. Reads
  // at 16 px.
  //
  // The `weather` stat surfaces the day's Markov-picked weather state
  // (clear, overcast, rain, storm, fog, etc.). One glyph stands for
  // "today's weather" — the variation lives in the tooltip text, not
  // the icon, since 16-px space can't carry 8 different icons cleanly.
  import { SI } from './stat-icon-tokens';
</script>

<!-- sun (back) -->
  <circle cx="9" cy="9" r="3.6" fill={SI.sun} opacity="0.92" />
  <circle cx="9" cy="9" r="3.6" fill="none" stroke={SI.ink} stroke-width="0.9" />
  <!-- short rays -->
  <g stroke={SI.ink} stroke-width="1" stroke-linecap="round">
    <line x1="9" y1="3" x2="9" y2="4.5" />
    <line x1="3.5" y1="9" x2="5" y2="9" />
    <line x1="4.7" y1="4.7" x2="5.8" y2="5.8" />
    <line x1="13.3" y1="4.7" x2="12.2" y2="5.8" />
  </g>
  <!-- cloud body — three lobes -->
  <path d="M 7 16  Q 6 13.5 8 13  Q 9 11 11.5 11.5  Q 13.5 10.5 15.5 12  Q 18 11.5 18.5 13.5  Q 20.5 14 19.5 16.5  L 7 16.5 Z"
        fill={SI.cloud} />
  <!-- cloud underbelly shade -->
  <path d="M 7 16.5  Q 12 17.5 19.5 16.5"
        fill="none" stroke={SI.cloudShade} stroke-width="0.9" opacity="0.55" />
  <!-- cloud ink outline -->
<path d="M 7 16  Q 6 13.5 8 13  Q 9 11 11.5 11.5  Q 13.5 10.5 15.5 12  Q 18 11.5 18.5 13.5  Q 20.5 14 19.5 16.5  L 7 16.5 Z"
      fill="none" stroke={SI.ink} stroke-width="1.1" stroke-linejoin="round" />
