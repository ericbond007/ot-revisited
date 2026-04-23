<script lang="ts">
  // Inline SVG of a covered prairie schooner — arched canvas, bed, two
  // spoked wheels. Uses `currentColor` so callers can inherit parent color.

  let { size = '1em', strokeWidth = 1.4 }: { size?: string; strokeWidth?: number } = $props();
</script>

<svg
  class="wagon-icon"
  viewBox="0 0 32 20"
  xmlns="http://www.w3.org/2000/svg"
  style="height: {size}; width: auto;"
  aria-hidden="true"
>
  <!-- Canvas cover arch -->
  <path
    d="M3 12 Q16 2 29 12"
    fill="none"
    stroke="currentColor"
    stroke-width={strokeWidth}
    stroke-linecap="round"
  />
  <!-- Canvas body fill -->
  <path
    d="M3 12 Q16 3 29 12 L29 13 Q16 4 3 13 Z"
    fill="currentColor"
    fill-opacity="0.12"
    stroke="none"
  />
  <!-- Wagon bed -->
  <rect
    x="3"
    y="12"
    width="26"
    height="2.5"
    fill="currentColor"
    fill-opacity="0.3"
    stroke="currentColor"
    stroke-width={strokeWidth * 0.8}
  />
  <!-- Wheels -->
  <circle cx="8" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width={strokeWidth} />
  <circle cx="24" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width={strokeWidth} />
  <!-- Spokes -->
  <line x1="8" y1="14.8" x2="8" y2="19.2" stroke="currentColor" stroke-width={strokeWidth * 0.6} />
  <line x1="5.8" y1="17" x2="10.2" y2="17" stroke="currentColor" stroke-width={strokeWidth * 0.6} />
  <line x1="24" y1="14.8" x2="24" y2="19.2" stroke="currentColor" stroke-width={strokeWidth * 0.6} />
  <line x1="21.8" y1="17" x2="26.2" y2="17" stroke="currentColor" stroke-width={strokeWidth * 0.6} />
</svg>

<style>
  .wagon-icon {
    display: inline-block;
    vertical-align: middle;
  }
</style>
