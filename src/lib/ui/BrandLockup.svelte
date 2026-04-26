<script lang="ts">
  // Brand lockup. `?raw` inlines the SVGs so they inherit `currentColor`
  // from the parent — set CSS `color` to retheme. `auto` swaps to the
  // square mark below `breakpoint` px so narrow contexts (mobile chrome,
  // sidebar headers) don't truncate the wordmark.
  //
  // SSR/first-paint behavior (#161B): we can't measure clientWidth on
  // the server, so the auto variant defaults to wordmark before
  // hydration. Most consumers (landing brand, layout shell) sit in
  // wide containers and want wordmark anyway — so first paint is
  // correct for the common case. After hydration, we measure and
  // swap to mark only if the container is genuinely narrow. Narrow
  // contexts that need mark from first paint should pass
  // `variant="mark"` explicitly.
  import Mark from '$lib/assets/brand/mark.svg?raw';
  import Wordmark from '$lib/assets/brand/wordmark.svg?raw';

  interface Props {
    variant?: 'mark' | 'wordmark' | 'auto';
    /** When `auto`, use mark below this width in px. Default 280. */
    breakpoint?: number;
    /** Color override; defaults to currentColor. */
    color?: string;
  }
  let { variant = 'auto', breakpoint = 280, color }: Props = $props();

  // null = "not measured yet" — distinct from 0. The auto variant
  // treats unmeasured as "assume wide" → wordmark.
  let containerWidth = $state<number | null>(null);
  const resolved = $derived(
    variant === 'auto'
      ? (containerWidth !== null && containerWidth < breakpoint ? 'mark' : 'wordmark')
      : variant
  );
</script>

<div class="lockup" style:color bind:clientWidth={containerWidth}>
  {#if resolved === 'mark'}
    {@html Mark}
  {:else}
    {@html Wordmark}
  {/if}
</div>

<style>
  .lockup { display: inline-flex; align-items: center; }
  .lockup :global(svg) { height: 100%; width: auto; }
</style>
