# UI Redesign PR3 — Trade + Town Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the trade-post and town surfaces to the 1840s-broadsheet paper system by migrating them off the legacy `--c-*` bridge and fixing the contrast pitfalls the migration exposes, matching `docs/handoff/ui-redesign/Trade Post.html`.

**Architecture:** PR3 of the rollout (`docs/superpowers/specs/2026-05-28-ui-redesign-rollout-design.md`). These 4 components already render in paper via PR0's global `.panel`/`.panel-head` treatment + the `--c-*`→`--of-*` alias bridge; this PR makes the tokens explicit (the files leave the bridge) and fixes the one real hazard — light text left dark on rust/colored buttons. No new logic, no new components.

**Tech Stack:** SvelteKit 5, TypeScript, vitest, svelte-check. Version control is **jj** (not git) — commit with `jj commit`.

## Scope (rollout spec PR3 row)
| Component | lines | --c- refs | reference |
|---|---|---|---|
| `src/lib/ui/TradeModal.svelte` | 1149 | 44 | `Trade Post.html` |
| `src/lib/ui/TradeReceiptModal.svelte` | 297 | 15 | `Trade Post.html` |
| `src/lib/ui/TownActionModal.svelte` | 348 | 8 | `Trade Post.html` |
| `src/lib/ui/TownStage.svelte` | 532 | 29 | `Trade Post.html` |

All `--c-*` tokens used are in the bridge table (no out-of-table tokens). `TradeModal` + `TradeReceiptModal` contain rust-background buttons → contrast risk.

## Bridge mapping (authoritative; migration is a visual no-op except where it un-breaks contrast)
| legacy | → |
|---|---|
| `--c-bg-raised` | `--of-paper` |
| `--c-parchment` | `--of-paper-soft` |
| `--c-panel` | `--of-paper-soft` |
| `--c-border` | `--of-rule` |
| `--c-wood` | `--of-ink-soft` |
| `--c-tan-bright` | `--of-ink` |
| `--c-tan` | `--of-ink` |
| `--c-cream` | `--of-ink` |
| `--c-ink` | `--of-ink` |
| `--c-rust-dark` | `--of-rust-dark` |
| `--c-rust` | `--of-rust` |

**Contrast pitfall (learned in PR2):** the blanket `--c-cream`/`--c-tan` → `--of-ink` mapping is correct for light text on a dark *surface* (which inverts to paper) but WRONG for light text on a *rust/colored button* (rust does not invert). After migrating, any `color: var(--of-ink)` sitting on a `var(--of-rust)`/`--of-rust-dark` background must become `var(--of-paper-soft)`.

---

### Task 1: Migrate the 4 surfaces off `--c-*` + contrast fix

**Files:** `src/lib/ui/TradeModal.svelte`, `TradeReceiptModal.svelte`, `TownActionModal.svelte`, `TownStage.svelte`

- [ ] **Step 1: Pre-check for out-of-table tokens**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr3
for f in TradeModal TradeReceiptModal TownActionModal TownStage; do echo "== $f =="; grep -oE -- '--c-[a-z-]+' src/lib/ui/$f.svelte | sort -u; done
```
Every token must be in the bridge table above. If one isn't, look it up in the `--c-` alias block in `src/lib/styles/theme.css` and add the correct `-e` rule.

- [ ] **Step 2: Run the migration (order matters — already safe)**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr3
for f in src/lib/ui/TradeModal.svelte src/lib/ui/TradeReceiptModal.svelte src/lib/ui/TownActionModal.svelte src/lib/ui/TownStage.svelte; do
  sed -i \
    -e 's/--c-bg-raised/--of-paper/g' \
    -e 's/--c-parchment/--of-paper-soft/g' \
    -e 's/--c-panel/--of-paper-soft/g' \
    -e 's/--c-border/--of-rule/g' \
    -e 's/--c-wood/--of-ink-soft/g' \
    -e 's/--c-tan-bright/--of-ink/g' \
    -e 's/--c-tan/--of-ink/g' \
    -e 's/--c-cream/--of-ink/g' \
    -e 's/--c-ink/--of-ink/g' \
    -e 's/--c-rust-dark/--of-rust-dark/g' \
    -e 's/--c-rust/--of-rust/g' \
    "$f"
done
grep -c -- '--c-' src/lib/ui/TradeModal.svelte src/lib/ui/TradeReceiptModal.svelte src/lib/ui/TownActionModal.svelte src/lib/ui/TownStage.svelte
```
Each count MUST be 0.

- [ ] **Step 3: Contrast scan + fix (rust/colored-background buttons)**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr3
for f in src/lib/ui/TradeModal.svelte src/lib/ui/TradeReceiptModal.svelte src/lib/ui/TownActionModal.svelte src/lib/ui/TownStage.svelte; do echo "== $f =="; grep -nE 'background:.*--of-rust|background-color:.*--of-rust|background:.*--of-rust-dark' "$f"; done
```
For each CSS rule with a `--of-rust`/`--of-rust-dark` background, Read it and check its `color:`. If the text color is `var(--of-ink)` or `var(--of-ink-soft)` (dark on rust — a contrast bug introduced by the sed), change that text color to `var(--of-paper-soft)`. Also check `:hover`/`.selected`/`.active` rules that flip a background to rust — their text needs the same fix. Only touch genuine light-text-on-rust cases; leave correct ink-on-paper text alone. (In PR2 this pattern bit `.bundle-add` and selected cards — expect 1–4 such rules here, concentrated in TradeModal/TradeReceiptModal.)

- [ ] **Step 4: Verify**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr3 && npm run check && npx vitest run
```
Expected: svelte-check 0 errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/eric/projects/hoosierTrail-ui-pr3 && jj commit -m "feat(ui): migrate trade + town surfaces off --c-* bridge to broadsheet paper (PR3)"
```

---

### Task 2: Verify + Playwright parity sweep + PR

**Files:** none (verification only). Controller-driven (subagents can't screenshot).

- [ ] **Step 1: Full gate** — `cd /home/eric/projects/hoosierTrail-ui-pr3 && npm run verify` (check + full vitest, green).

- [ ] **Step 2: Dev server** — `systemd-run --user --unit=ot-pr3-dev --working-directory="$PWD" npm run dev -- --port 5181` (own port to avoid colliding with concurrent sessions; confirm with `curl -s -o /dev/null -w '%{http_code}' http://localhost:5181/`).

- [ ] **Step 3: Playwright sweep** — reach a trading post and a town via dev scenarios:
  - `/dev/scenario/at_laramie` (or `town_services_at_laramie`) → open the **Trade** / **Visit** flow → screenshot TradeModal + click an item (TradeReceiptModal) and a town action (TownActionModal); TownStage renders at a town landmark.
  - Confirm: broadsheet paper throughout, no inverted/invisible text, rust buttons readable, layout matches `Trade Post.html` intent. If a surface visibly diverges from `Trade Post.html` (beyond tokens — e.g. missing masthead/eyebrow/ds-row treatment), note it; add a **Task 3 polish** only if the divergence is real (the global `.panel` paper treatment from PR0 may already cover it).

- [ ] **Step 4: Stop server** — `systemctl --user stop ot-pr3-dev`.

- [ ] **Step 5: Residue check** — `grep -rc -- '--c-' src/lib/ui/TradeModal.svelte src/lib/ui/TradeReceiptModal.svelte src/lib/ui/TownActionModal.svelte src/lib/ui/TownStage.svelte` → all 0.

- [ ] **Step 6: PR** — push `feat/ui-pr3-trade-town`; `gh pr create` (from the colocated default workspace) base master, body summarizing the migration + contrast fixes + screenshot confirmation. PR3 of the rollout.

---

## Self-Review
- **Spec coverage:** all 4 rollout-spec PR3 components migrated (Task 1) + verified against `Trade Post.html` (Task 2). ✅
- **Placeholder scan:** none — sed table + contrast procedure are concrete; the only judgement call (extra polish) is explicitly gated on the screenshot showing real divergence.
- **Risk:** the contrast pitfall is pre-identified with the exact fix; the migration is otherwise a bridge-backed no-op.

## Execution
subagent-driven-development. Task 1 → one implementer (mechanical migration + contrast scan) + spec/quality review; Task 2 controller-driven (verify + Playwright + PR).
