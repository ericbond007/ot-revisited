<script lang="ts">
  // #1046b — shown when flags._companyDissentPending is set (the chartered
  // company captain called a maintenance or Sabbath lay-by and the player
  // hasn't answered). The player picks how to respond; the form POSTs to
  // ?/companyDissent which calls applyCompanyDissent (tail-only continuation).
  //
  // No backdrop-close: the server flag persists until a form POST clears it,
  // so a dismiss would just re-open on the next render.
  import type { GameState } from '$lib/game/types';

  let { state: gs, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();

  const qp = $derived(encodeURIComponent(slot));
  const isCaptain = $derived(gs.wagonTrain?.leaderId === 'player');
  const mode = $derived(gs.wagonTrain?.companyDecisionBlock?.mode ?? 'maintenance_layby');
  const reason = $derived(mode === 'sabbath_layby' ? 'observe the Sabbath' : 'lay by to rest the company');
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <div class="head">
      <span class="head-glyph">🛑</span>
      <div class="head-titles">
        <span class="head-tag">COMPANY HALT</span>
        <h2 class="modal-title">The captain calls a halt</h2>
      </div>
    </div>

    <p class="advice">
      The company will <strong>{reason}</strong>. You'd press on.
    </p>

    <form method="POST" action="?/companyDissent&slot={qp}" class="choices-form">
      <div class="actions">
        <button type="submit" name="choice" value="abide" class="choice-btn">
          Abide — halt with the company
        </button>

        {#if isCaptain}
          <button type="submit" name="choice" value="override" class="choice-btn choice-warn">
            Overrule — break camp anyway (−morale)
          </button>
        {:else}
          <button type="submit" name="choice" value="lobby" class="choice-btn choice-warn">
            Press the captain to move on
          </button>
        {/if}

        <button type="submit" name="choice" value="press_on" class="choice-btn choice-danger">
          Press on alone — leave the company
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    animation: backdrop-fade 0.2s ease-out;
  }
  @keyframes backdrop-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .modal-body {
    max-width: 480px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--c-rust);
    border-width: 3px;
    animation: card-slide 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  }
  @keyframes card-slide {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.7em;
    margin-bottom: 0.8em;
  }
  .head-glyph {
    font-size: 2.2em;
    line-height: 1;
  }
  .head-titles {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    min-width: 0;
  }
  .head-tag {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
    color: var(--c-wood);
  }
  .head-titles h2 {
    margin: 0;
    color: var(--c-rust);
    font-size: 1.4em;
    line-height: 1.1;
  }

  .advice {
    margin: 0 0 1em 0;
    padding: 0.6em 0.8em;
    background: rgba(201, 106, 42, 0.1);
    border-left: 3px solid #c96a2a;
    border-radius: 0 3px 3px 0;
    color: var(--c-tan);
    font-size: 0.9em;
    line-height: 1.5;
  }
  .advice strong { color: var(--c-tan-bright); }

  .choices-form {
    display: flex;
    flex-direction: column;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .choice-btn {
    font-size: 1em;
    padding: 0.65em 1.2em;
    text-align: left;
    width: 100%;
  }

  .choice-warn {
    background: none;
    border: 1px solid var(--c-rust);
    color: var(--c-rust);
  }
  .choice-warn:hover {
    background: rgba(153, 0, 0, 0.1);
  }

  .choice-danger {
    background: none;
    border: none;
    color: var(--c-wood);
    font-size: 0.88em;
    text-decoration: underline;
    cursor: pointer;
    padding: 0.3em;
    text-align: left;
  }
  .choice-danger:hover { color: var(--c-rust); }
</style>
