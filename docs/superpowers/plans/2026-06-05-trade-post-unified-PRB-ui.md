# Trade Post Unified Rebuild — PR-B (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Rebuild `TradeModal.svelte` to the handoff's **unified two-mode** layout (Cash default / Barter toggle) and wire it to a single new `settleTrade:` server action backed by the PR-A engine. Retire the old `trade:`/`barter:` actions. No engine change — PR-A's `settleTrade()` is the contract.

**Architecture:** The modal becomes a thin client over `settleTrade()`. It derives `getValue`/`giveValue`/`netCash`/`rate` client-side for live preview (mirroring the engine's formulas), and submits `{ mode, get_<id>, give_<id>, cashOffer }` to `settleTrade:`. The server re-runs the authoritative `settleTrade()` and persists. Visual reference: `docs/handoff/ui-redesign/trade-post-modal.jsx` (the `UnifiedView` + `ItemColumn` + `Stepper`/`PostHeader`/`PreferencesBanner`/`RateScale` widgets) and `docs/handoff/ui-redesign/Trade Post.html` (the `tp-*` CSS). Tokens: broadsheet `--of-*` only.

**Tech Stack:** Svelte 5 runes, SvelteKit form actions, broadsheet theme. jj workspace `hoosierTrail-trade-ui`, bookmark `feat/trade-post-unified-ui`. Spec: `docs/superpowers/specs/2026-06-04-trade-post-unified-rebuild-design.md` (§1 interaction, §4 UI). Engine: `src/lib/game/systems/settle-trade.ts` (merged in PR-A).

**Pre-flight:** edits via Bash+Python heredoc (default-workspace hook blocks Edit/Write; Read is fine). `npm run verify` is the gate. node_modules is a real `npm ci` (not symlink). I (controller) drive Playwright for the visual gate per `feedback_verify_ui_myself`.

---

## Task 1: `settleTrade:` server action + basket parser (TDD)

**Files:**
- Modify: `src/routes/play/+page.server.ts` (add `settleTrade:` action + `_parseTradeBasket` helper; import `settleTrade`)
- Test: `tests/parse-trade-basket.test.ts` (create)

- [ ] **Step 1: failing test for the parser**

```ts
// tests/parse-trade-basket.test.ts
import { describe, it, expect } from 'vitest';
import { _parseTradeBasket } from '../src/routes/play/+page.server';

function fd(pairs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(pairs)) f.append(k, v);
  return f;
}

describe('_parseTradeBasket', () => {
  it('parses mode, get_/give_ fields, and cashOffer; drops zero/neg qty', () => {
    const b = _parseTradeBasket(fd({
      mode: 'barter', get_flour: '8', get_bacon: '0', give_buffalo_robe: '2', cashOffer: '5'
    }));
    expect(b.mode).toBe('barter');
    expect(b.get).toEqual({ flour: 8 });          // bacon:0 dropped
    expect(b.give).toEqual({ buffalo_robe: 2 });
    expect(b.cashOffer).toBe(5);
  });
  it('defaults mode to cash and cashOffer to 0', () => {
    const b = _parseTradeBasket(fd({ get_flour: '3' }));
    expect(b.mode).toBe('cash');
    expect(b.cashOffer).toBe(0);
  });
});
```
Run `npx vitest run tests/parse-trade-basket.test.ts` → FAIL.

- [ ] **Step 2: implement parser + action**

In `src/routes/play/+page.server.ts`, add the import `import { settleTrade, type TradeBasket } from '$lib/game/systems/settle-trade';` and the helper (underscore-prefixed so SvelteKit permits the export, per the #233 lesson):

```ts
export function _parseTradeBasket(fd: FormData): TradeBasket {
  const mode = fd.get('mode')?.toString() === 'barter' ? 'barter' : 'cash';
  const get: Record<string, number> = {};
  const give: Record<string, number> = {};
  for (const [key, value] of fd.entries()) {
    const qty = parseInt(value.toString(), 10);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (key.startsWith('get_')) get[key.slice(4)] = qty;
    else if (key.startsWith('give_')) give[key.slice(5)] = qty;
  }
  const cashOffer = Math.max(0, parseInt(fd.get('cashOffer')?.toString() ?? '0', 10) || 0);
  return { mode, get, give, cashOffer };
}
```

Add the action (mirror the existing `trade:`/`barter:` actions' load/persist shape — read those for the exact `loadState`/`locals.repo.save`/`error` pattern):

```ts
  settleTrade: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const basket = _parseTradeBasket(fd);
    let state = await loadState(locals, slot);
    try {
      state = settleTrade(state, basket).state;
    } catch (e) {
      throw error(409, (e as Error).message);
    }
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },
```
Run the parser test → PASS. Run `npm run check` → 0 errors.

- [ ] **Step 3: commit** `jj describe -m "feat(trade): settleTrade: server action + basket parser"`

---

## Task 2: Rebuild `TradeModal.svelte` to the unified two-mode layout

**Files:**
- Rewrite: `src/lib/ui/TradeModal.svelte`
- Reference (read, do not edit): `docs/handoff/ui-redesign/trade-post-modal.jsx` (UnifiedView lines ~239–470, ItemColumn ~470–560, shared widgets PostHeader/PreferencesBanner/Stepper/RateScale ~24–214), `docs/handoff/ui-redesign/Trade Post.html` (tp-* CSS).

**This is a port, not a redesign.** Match the handoff `UnifiedView` faithfully, adapted to Svelte 5 + real engine data. Preserve from the CURRENT modal: props `{ state, slot, onclose }`, `POST_THEME`/landmark-icon header, `ItemTooltip` on rows, `NumberStepper` (the repo's stepper) for qty, profession-bonus awareness, `postRemainingQty` for get-side max, `findBarterableItems` for the give list.

**Structure (Svelte 5):**
- State: `let mode = $state<'cash'|'barter'>('cash')`, `let get = $state<Record<string,number>>({})`, `let give = $state<Record<string,number>>({})`, `let cashOffer = $state(0)`.
- Derived preview math MIRRORING `settle-trade.ts` exactly (import the same constants; reuse `getPrice`, `postRemainingQty`, profession mults already computed in the current modal, `quoteBarter`/preferred-refused for barter give value):
  - `getValue = Σ buy × (pBuy×postMult) × qty`
  - cash `giveValue = Σ sell × (pSell×postMult) × qty`; barter `giveValue = Σ sell × postMult × prefReject × qty`
  - cash `netCash = round(getValue − giveValue)`; barter `giveTotal = giveValue + cashOffer`, `rate = giveTotal/getValue`
  - flags: `tooThin = barter && rate < BARTER_RATE_FLOOR`, `overpaying = barter && rate > BARTER_RATE_CEIL`, cash-mode `overBudget = netCash > cash`.
- Layout (broadsheet `--of-*` tokens, port `tp-*` rules into the component `<style>`): sticky summary with the **Cash/Barter toggle** + mode hint; cash-mode net row ("you pay / you receive / over budget"); barter-mode give+cash=total / get rows + RateScale + cash-top-up chips (`+50¢ +$1 +$5 +$10` + "Even $X" suggestion) + tooThin/overpaying alert; then the two `ItemColumn`s (give = wagon, get = post stock) with per-row icon, name, ★+15%/⊘−40% chips in barter, have/perUnit, and a stepper bounded by source qty.
- Confirm: a `<form method="POST" action="?/settleTrade&slot=...">` emitting hidden inputs `mode`, `cashOffer`, and `get_<id>`/`give_<id>` for each non-zero line; submit disabled when nothing-gained / overBudget / tooThin. On success the page reloads state (same pattern as the current trade form). Keep the post-trade receipt only if trivial; otherwise the eventLog entry suffices (note in PR).
- Cash mode hides the give column's barter chips and uses sell-price labels; at a `!postBuysForCash` post (compute via the merged `postBuysForCash(here, year)`), disable/hide the give column in cash mode with the "trades in goods, not coin — use Barter" note.

- [ ] **Step 1** Read the three reference sections + the current modal fully. Map each `tp-*` block to a `--of-*` equivalent (paper/ink/rust/good/warn/bad/river). Do NOT introduce hardcoded hex — tokens only.
- [ ] **Step 2** Rewrite `TradeModal.svelte`. Keep it one component; if it exceeds ~600 lines, extract `TradeItemColumn.svelte` as a child (props: title/subtitle/side/groups/source/values/onChange/post/barterEnabled) — mirrors the handoff `ItemColumn`.
- [ ] **Step 3** `npm run check` → 0 errors (fix all type errors properly; no `as any`).
- [ ] **Step 4** `npm test` → existing suite still green (no engine/test change expected).
- [ ] **Step 5** commit `jj describe -m "feat(ui): rebuild TradeModal to unified two-mode basket (handoff)"`

---

## Task 3: Wire + retire old actions + Playwright (controller-driven gate)

**Files:**
- Modify: `src/routes/play/+page.svelte` (TradeModal invocation unchanged if props match; confirm)
- Modify: `src/routes/play/+page.server.ts` (remove `trade:` and `barter:` actions ONLY after confirming nothing else posts to them — grep `?/trade`, `?/barter`)
- Modify (maybe): remove `TradeReceiptModal` wiring if the rebuild drops the receipt

- [ ] **Step 1** Grep for `?/trade`, `?/barter`, `ackTrade`, `TradeReceiptModal` across `src/`. Only remove an action when its sole caller was the old modal. If the receipt modal is still referenced elsewhere, keep it.
- [ ] **Step 2** `npm run verify` (check + full test) → green.
- [ ] **Step 3 (controller)** Playwright: start dev under `systemd-run --user --unit=ot-trade-ui`, drive to a trading-post dev scenario (`town_services_at_laramie` or a `/dev/scenario/...` that parks at a post), and screenshot + exercise: cash buy, cash sell at a cash post (1850 Laramie), sell blocked at a no-cash post (Fort Hall), barter offset, barter cash-top-up to clear "trader refuses", overpaying warning. Confirm broadsheet legibility (no inverted/invisible text).
- [ ] **Step 4** commit `jj describe -m "chore(trade): retire trade:/barter: actions; wire settleTrade: only"`

---

## Task 4: verify + PR-B + merge

- [ ] `npm run verify` green; push `feat/trade-post-unified-ui`; open PR-B referencing PR-A (#234) and the spec; CI green; squash-merge; cleanup workspace.

---

## Notes
- The engine is authoritative; the client preview math must MATCH `settle-trade.ts` (same constants, same rounding) so the displayed net never disagrees with what the server applies. If they diverge, fix the CLIENT preview, not the engine.
- `feedback_verify_ui_myself`: the controller runs the Playwright gate; subagents can't.
- Out of scope: bot/NPC (#1223), post-stock-gains-given-goods (#1222), tabs/split variants, save migration.
