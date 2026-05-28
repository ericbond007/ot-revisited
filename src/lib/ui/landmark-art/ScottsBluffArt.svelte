<!--
  ScottsBluffArt — mile ~500, "second-most referred to landmark on the
  Emigrant Trails in pioneer journals and diaries" (NPS).

  FLUX-only following the chimney_rock convention from PR #185 / #190.
  The decorative SVG overlay (etched bluffs, wagon train, caption) was
  stripped in favor of a pure raster backdrop — see CLAUDE.md "FLUX
  landmark backdrops — no SVG decorative overlay" for the rule.

  Backdrop source: tools/wagon-bg/render_landmark.py LANDMARKS['scotts_bluff']
  (ht_landscape v2_2000 LoRA, seed 820009). 3072×1024 native. Iteration
  reached this v9 after the model kept collapsing two bluffs into a single
  distant horizon — the winning prompt anchors the viewer INSIDE Mitchell
  Pass with both cliff faces close to the camera, which broke the
  distant-horizon bias.
-->
<script lang="ts">
  import { LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';
</script>

<g>
  <image
    href="/wagon-bg/landmarks/scotts_bluff.webp?v=1"
    x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H}
    preserveAspectRatio="xMidYMid slice" />
</g>
