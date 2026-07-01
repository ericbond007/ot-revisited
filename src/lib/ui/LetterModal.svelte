<script lang="ts">
  // Letter from home — pops when flags._pendingLetter is set after a
  // post arrival rolled a delivery. Same dismiss pattern as the
  // newspaper / hunt-haul / camp-summary modals: server flag persists
  // until ?/ackLetter clears it, so backdrop close would re-mount.
  //
  // Visual: parchment grain, IM Fell English serif body, signed
  // closing right-aligned. Layout intentionally plain — Claude
  // Design will rework later. Morale-delta footer reads as a small
  // diary aside, not a stat readout.
  import type { PendingLetter } from '$lib/game/systems/letters';
  import ParchmentBg from './trail-map/trail-map-svg/ParchmentBg.svelte';
  import { dialogA11y } from '$lib/ui/actions/dialog-a11y';

  let { letter, slot }: { letter: PendingLetter; slot: string } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const moraleSign = $derived(letter.moraleDelta > 0 ? '+' : '');
  const moraleClass = $derived(
    letter.moraleDelta > 0 ? 'tone-good'
    : letter.moraleDelta < 0 ? 'tone-bad'
    : 'tone-neutral'
  );
</script>

<div class="modal-backdrop">
  <div class="paper-shell" role="dialog" use:dialogA11y={{}}>
    <ParchmentBg>
      <div class="letter">
        <header class="head">
          <div class="caught">A letter caught up with you at {letter.postName}.</div>
          <div class="from">From {letter.origin}</div>
        </header>

        <section class="body-text">
          <p>{letter.body}</p>
          <p class="closing">{letter.closing}</p>
        </section>

        <footer class="footnote">
          <span class="morale {moraleClass}">
            Morale {moraleSign}{letter.moraleDelta}
          </span>
        </footer>

        <form method="POST" action="?/ackLetter&slot={qp}" class="actions">
          <button type="submit" class="continue">Fold and tuck away</button>
        </form>
      </div>
    </ParchmentBg>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(42, 29, 12, 0.80);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 16px;
  }
  .paper-shell {
    width: min(560px, 100%);
    max-height: 92vh;
    border: 1px solid var(--of-ink-soft);
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.45),
      0 0 0 6px var(--of-rule-soft);
    overflow: hidden;
  }
  .letter {
    position: relative;
    padding: 26px clamp(20px, 5vw, 36px) 22px;
    color: var(--of-ink);
    overflow-y: auto;
    max-height: 92vh;
    font-family: var(--of-body);
  }
  .head {
    text-align: center;
    margin-bottom: 18px;
    border-bottom: 1px solid var(--of-rule);
    padding-bottom: 10px;
  }
  .caught {
    font-style: italic;
    font-size: 14px;
    letter-spacing: 0.03em;
  }
  .from {
    margin-top: 4px;
    font-variant: small-caps;
    font-size: 13px;
    letter-spacing: 0.06em;
    color: var(--of-ink-soft);
  }
  .body-text {
    line-height: 1.55;
    font-size: 16px;
  }
  .body-text p {
    margin: 0 0 12px;
  }
  .closing {
    text-align: right;
    font-style: italic;
    margin-top: 14px !important;
  }
  .footnote {
    margin-top: 10px;
    text-align: center;
    border-top: 1px dashed var(--of-rule);
    padding-top: 8px;
  }
  .morale {
    font-size: 12px;
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .morale.tone-good { color: var(--of-good); }
  .morale.tone-bad { color: var(--of-bad); }
  .morale.tone-neutral { color: var(--of-ink-soft); }
  .actions {
    margin-top: 14px;
    display: flex;
    justify-content: center;
  }
  .continue {
    background: var(--of-rust);
    color: var(--of-paper-soft);
    border: 1px solid var(--of-rust-dark);
    padding: 8px 22px;
    font-family: inherit;
    font-size: 15px;
    cursor: pointer;
    border-radius: var(--of-r-xs);
    letter-spacing: 0.03em;
  }
  .continue:hover { filter: brightness(1.15); }
</style>
