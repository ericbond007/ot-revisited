<!--
  FortLaramieArt — mile ~650, "last outpost before the Rockies."

  FLUX-only following the chimney_rock / scotts_bluff convention from PRs
  #185 / #190 / #195. The decorative SVG overlay was stripped per the
  CLAUDE.md rule "FLUX landmark backdrops — no SVG decorative overlay."

  Backdrop source: tools/wagon-bg/render_landmark.py LANDMARKS['ft_laramie']
  (ht_landscape v2_2000 LoRA, seed 830020, 2048×1024).

  STOPGAP — ht_landscape produces cartoon buildings at any aspect, and at
  3:1 the model tiles content into a wall of buildings. The shipped v23
  render is a single Old-Bedlam-style building, which is the cleanest
  result of 29 prompt iterations. It is also period-accurate (Old Bedlam
  is the iconic single-building Fort Laramie image). Replace once the
  architectural-FLUX pipeline lands — see project #2 ticket #1187.
-->
<script lang="ts">
  import { LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';
</script>

<g>
  <image
    href="/wagon-bg/landmarks/ft_laramie.webp?v=1"
    x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H}
    preserveAspectRatio="xMidYMid slice" />
</g>
