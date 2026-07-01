<script lang="ts">
  // Visual-diff harness for ActionBar. Renders the bar in three states
  // (on the road, at a trading post, at a river) so each can be diffed
  // against docs/handoff/components/src/action-bar.html side by side.
  //
  // ActionBar reads only `state.location.atLandmarkId` and
  // `state.date.year` from the game state — we mock those two fields and
  // cast through `unknown` to satisfy the prop type without dragging in
  // a full GameState fixture.
  import ActionBar from '$lib/ui/ActionBar.svelte';
  import type { GameState } from '$lib/game/types';

  function mockState(atLandmarkId: string | null): GameState {
    return {
      location: { atLandmarkId, milesFromStart: 0 },
      date: { year: 1848, month: 4, day: 15 }
    } as unknown as GameState;
  }

  const onRoad = mockState(null);
  const atFort = mockState('ft_kearny');
  const atRiver = mockState('big_blue_river');
</script>

<svelte:head><title>ActionBar Showcase — dev</title></svelte:head>

<div class="page">
  <h1 class="brand-title">ActionBar Showcase</h1>
  <p class="subtitle">
    Each row is the same component with a different mocked location.
    Diff against <code>docs/handoff/components/src/action-bar.html</code>.
  </p>

  <section class="card">
    <div class="eyebrow">On the road · no contextual action</div>
    <ActionBar state={onRoad} slot="dev" />
  </section>

  <section class="card">
    <div class="eyebrow">At trading post · Visit highlighted (rust glow)</div>
    <ActionBar state={atFort} slot="dev" />
  </section>

  <section class="card">
    <div class="eyebrow">At river · Ford highlighted, Travel disabled, blue panel border</div>
    <ActionBar state={atRiver} slot="dev" />
  </section>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--of-s-6) var(--of-s-4);
  }
  .brand-title {
    font-family: var(--of-display);
    font-size: 44px;
    color: var(--of-rust);
    letter-spacing: 0.10em;
    margin: 0 0 var(--of-s-2) 0;
  }
  .subtitle {
    color: var(--of-ink);
    font-family: var(--of-body);
    margin: 0 0 var(--of-s-4) 0;
  }
  code { background: var(--of-paper); padding: 0 .25em; border-radius: 2px; }
  .card {
    background: var(--of-paper-soft);
    border: 2px solid var(--of-ink-soft);
    border-radius: var(--of-r-sm);
    padding: var(--of-s-3);
    margin-bottom: var(--of-s-3);
  }
  .eyebrow {
    color: var(--of-ink-soft);
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: var(--of-s-2);
  }
</style>
