<script lang="ts">
  // #1181 — Anonymous in-game feedback modal. Posts to `/feedback`
  // form action which writes to the `feedback` table via SavesRepo.
  // Auto-captures the current page URL + UA so triage knows the
  // context. No auth, no identifying fields.
  import { dialogA11y } from '$lib/ui/actions/dialog-a11y';
  import { enhance } from '$app/forms';

  let { onclose }: { onclose: () => void } = $props();
  let body = $state('');
  let submitting = $state(false);
  let sent = $state(false);
  let formError = $state<string | null>(null);

  const MAX_BODY = 4000;

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget && !submitting) onclose();
  }
</script>

<div class="modal-backdrop" onclick={handleBackdrop} role="presentation">
  <div class="panel modal-body" role="dialog" use:dialogA11y={{ onClose: onclose }}>
    <header class="modal-head">
      <div class="head-text">
        <span class="head-tag">FEEDBACK</span>
        <h2>What's on your mind?</h2>
      </div>
      <button type="button" class="close-btn" onclick={onclose} aria-label="Close" disabled={submitting}>✕</button>
    </header>

    {#if sent}
      <p class="sent">Thanks — feedback received. <button type="button" class="link-btn" onclick={onclose}>Close</button></p>
    {:else}
      <p class="lede">
        Anonymous — nothing identifying is stored. Bugs, suggestions, "this felt wrong" notes —
        all useful.
      </p>

      <form
        method="POST"
        action="/?/feedback"
        use:enhance={() => {
          submitting = true;
          formError = null;
          return async ({ result, update }) => {
            submitting = false;
            if (result.type === 'success') {
              sent = true;
              body = '';
            } else if (result.type === 'failure') {
              formError = (result.data?.error as string) ?? 'Submit failed. Try again?';
            } else {
              await update();
            }
          };
        }}
        class="form"
      >
        <textarea
          name="body"
          bind:value={body}
          placeholder="The trail is too…"
          rows="6"
          maxlength={MAX_BODY}
          required
          disabled={submitting}
        ></textarea>
        <input type="hidden" name="pageUrl" value={typeof window !== 'undefined' ? window.location.href : ''} />
        <div class="bottom-row">
          <small class="count">{body.length} / {MAX_BODY}</small>
          {#if formError}<small class="err">{formError}</small>{/if}
          <button type="submit" class="send-btn" disabled={submitting || body.trim().length === 0}>
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    {/if}
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
    z-index: 100;
    padding: 1em;
    animation: backdrop-fade 0.2s ease-out;
  }
  @keyframes backdrop-fade { from { opacity: 0; } to { opacity: 1; } }
  .modal-body {
    max-width: 520px;
    width: 100%;
    padding: 1.2em 1.4em;
    border-color: var(--of-rust);
    border-width: 3px;
    animation: card-slide 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  }
  @keyframes card-slide {
    from { transform: translateY(12px) scale(0.98); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }
  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1em;
    margin-bottom: 0.6em;
    padding-bottom: 0.5em;
    border-bottom: 1px solid rgba(138, 90, 42, 0.2);
  }
  .head-text { display: flex; flex-direction: column; gap: 0.15em; }
  .head-tag {
    font-size: 0.7em; letter-spacing: 0.18em; color: var(--of-ink-soft); font-weight: 700;
  }
  .modal-head h2 {
    margin: 0; color: var(--of-rust); font-size: 1.2em; letter-spacing: 0.04em;
  }
  .close-btn {
    background: transparent; border: 0; color: var(--of-ink-soft);
    font-size: 1.4em; padding: 0.1em 0.4em; cursor: pointer; line-height: 1;
  }
  .close-btn:hover:not(:disabled) { color: var(--of-rust); }
  .close-btn:disabled { opacity: 0.4; cursor: wait; }
  .lede { margin: 0 0 0.7em; color: var(--of-ink-soft); font-size: 0.9em; line-height: 1.4; }
  .form { display: flex; flex-direction: column; gap: 0.5em; }
  textarea {
    width: 100%; padding: 0.6em 0.7em;
    border: 2px solid var(--of-ink); border-radius: 4px;
    background: var(--of-paper-soft); color: var(--of-ink);
    font-family: inherit; font-size: 0.95em; line-height: 1.4;
    resize: vertical;
  }
  textarea:focus { outline: none; border-color: var(--of-rust); box-shadow: 0 0 0 2px rgba(201, 106, 42, 0.25); }
  .bottom-row {
    display: flex; align-items: center; gap: 0.8em; justify-content: flex-end;
  }
  .count { color: var(--of-ink-soft); font-size: 0.78em; margin-right: auto; }
  .err { color: #e85a4a; font-weight: 600; font-size: 0.85em; }
  .send-btn { font-size: 0.95em; padding: 0.55em 1.1em; }
  .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sent {
    color: var(--of-rust); margin: 0.5em 0 0; font-size: 0.95em;
  }
  .link-btn {
    background: transparent; border: 0; color: var(--of-rust);
    text-decoration: underline; cursor: pointer; padding: 0; font: inherit;
  }
</style>
