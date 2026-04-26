<script lang="ts">
  // Parchment-textured wrapper. Background composes:
  //   * SVG fractal-noise grain (data: URL, computes once per repaint)
  //   * Two radial-gradient age-stains (top-left amber, bottom-right umber)
  //   * Inset box-shadow vignette
  // Children render absolutely-positioned over the parchment.
  //
  // Lifted verbatim from `.trailmap` in trail-snippet.html.

  interface Props {
    children?: import('svelte').Snippet;
    /** When true, drops the border + radius for full-bleed use inside
     *  the modal stage. Defaults to false (snippet-style chrome). */
    bare?: boolean;
  }

  let { children, bare = false }: Props = $props();
</script>

<div class="trailmap" class:bare>
  {@render children?.()}
</div>

<style>
  .trailmap {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: #e8d9b8;
    background-image:
      url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.23  0 0 0 0 0.13  0 0 0 0 0.05  0 0 0 0.20 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),
      radial-gradient(ellipse at 25% 18%, rgba(201,168,102,0.35), transparent 65%),
      radial-gradient(ellipse at 80% 90%, rgba(122,72,40,0.30), transparent 55%);
    background-size: 220px 220px, 100% 100%, 100% 100%;
    background-blend-mode: multiply, normal, normal;
    border: 2px solid #5a3a1a;
    border-radius: 3px;
    color: #3a1a08;
    overflow: hidden;
    box-shadow:
      inset 0 0 0 1px rgba(201, 106, 42, 0.25),
      inset 0 60px 100px -40px rgba(122, 72, 40, 0.18),
      inset 0 -60px 100px -40px rgba(122, 72, 40, 0.18);
  }
  .trailmap.bare {
    border: none;
    border-radius: 0;
  }
</style>
