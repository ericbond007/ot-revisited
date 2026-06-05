<script lang="ts">
  // Newspaper reveal — pops when flags._paperBatch is set after the
  // ?/townNewspaper action. Same dismiss pattern as PostHuntModal /
  // CampSummaryModal: server flag persists until ?/ackPaper clears it,
  // so backdrop close would just re-mount on next render.
  //
  // Visual style: parchment grain reusing ParchmentBg, period serif
  // headlines with smaller italic source bylines underneath. Layout is
  // intentionally plain — Claude Design will rework this; this stage
  // is just the mechanic with a respectable parchment feel.
  import type { PaperBatch } from '$lib/game/systems/news';
  import ParchmentBg from './trail-map/trail-map-svg/ParchmentBg.svelte';
  import { dialogA11y } from '$lib/ui/actions/dialog-a11y';

  let { batch, slot }: { batch: PaperBatch; slot: string } = $props();
  const qp = $derived(encodeURIComponent(slot));
</script>

<div class="modal-backdrop">
  <div class="paper-shell" role="dialog" use:dialogA11y={{}}>
    <ParchmentBg>
      <div class="paper">
        <header class="masthead">
          <div class="rule top"></div>
          <h1 class="title">The {batch.postName} Gazette</h1>
          <div class="dateline">{batch.dateline} &mdash; One Cent</div>
          <div class="rule bottom"></div>
        </header>

        <ol class="columns">
          {#each batch.items as item, i (i)}
            <li class="story">
              <h2 class="head">{item.text}</h2>
              <p class="byline">&mdash; {item.source}</p>
            </li>
          {/each}
        </ol>

        <form method="POST" action="?/ackPaper&slot={qp}" class="actions">
          <button type="submit" class="continue">Fold the paper</button>
        </form>
      </div>
    </ParchmentBg>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 12, 6, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 16px;
  }
  .paper-shell {
    width: min(640px, 100%);
    max-height: 92vh;
    border: 1px solid #3a1a08;
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.45),
      0 0 0 6px rgba(58, 26, 8, 0.08);
    overflow: hidden;
  }
  .paper {
    position: relative;
    padding: 24px clamp(16px, 4vw, 32px) 20px;
    color: #2a160a;
    overflow-y: auto;
    max-height: 92vh;
    font-family: 'IM Fell English', Georgia, serif;
  }
  .masthead {
    text-align: center;
    margin-bottom: 14px;
  }
  .rule {
    height: 0;
    border-top: 1px solid #3a1a08;
    margin: 6px auto;
  }
  .rule.top { border-top-width: 3px; }
  .rule.bottom { border-top-width: 1px; }
  .title {
    margin: 0;
    font-size: clamp(24px, 5vw, 34px);
    letter-spacing: 0.02em;
    font-variant: small-caps;
    font-weight: 700;
  }
  .dateline {
    font-style: italic;
    font-size: 13px;
    margin: 2px 0 4px;
    letter-spacing: 0.04em;
  }
  .columns {
    list-style: none;
    margin: 0;
    padding: 4px 0 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .story {
    padding-bottom: 12px;
    border-bottom: 1px dashed rgba(58, 26, 8, 0.35);
  }
  .story:last-child { border-bottom: none; }
  .head {
    margin: 0 0 4px;
    font-size: clamp(15px, 2.4vw, 17px);
    font-weight: 700;
    line-height: 1.25;
  }
  .byline {
    margin: 0;
    font-style: italic;
    font-size: 12px;
    color: #5a3a1a;
  }
  .actions {
    margin-top: 18px;
    display: flex;
    justify-content: center;
  }
  .continue {
    background: #3a1a08;
    color: #f0e3c4;
    border: 1px solid #3a1a08;
    padding: 8px 22px;
    font-family: inherit;
    font-size: 15px;
    cursor: pointer;
    border-radius: 2px;
    letter-spacing: 0.03em;
  }
  .continue:hover { background: #5a3a1a; }
</style>
