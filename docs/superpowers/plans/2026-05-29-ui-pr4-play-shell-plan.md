# UI Redesign PR4 — Play Shell Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Port the main game screen (the play shell) off the legacy `--c-*` bridge to direct `--of-*` broadsheet-paper tokens, matching `docs/handoff/ui-redesign/ui_kits/game/Components.jsx`.

**Architecture:** PR4 of the rollout. These 7 surfaces already render in paper via PR0's global `.panel` treatment + the `--c-*`→`--of-*` alias bridge (panel/header backgrounds use `--c-bg-raised`/`--c-panel` → paper/paper-soft; `--c-wood` is borders/frames → ink-soft). This PR makes the tokens explicit (files leave the bridge) and fixes the one hazard — light text left dark on rust buttons (ActionBar). No logic changes, no new components.

**Tech Stack:** SvelteKit 5, TypeScript, vitest, svelte-check. jj (not git) — commit with `jj commit`.

## Scope (rollout spec PR4 row)
| File | lines | --c- refs |
|---|---|---|
| `src/routes/play/+page.svelte` | 569 | 12 |
| `src/lib/ui/ActionBar.svelte` | 363 | 19 |
| `src/lib/ui/PartyPanel.svelte` | 493 | 36 |
| `src/lib/ui/InventoryPanel.svelte` | 399 | 22 |
| `src/lib/ui/WagonPanel.svelte` | 230 | 19 |
| `src/lib/ui/EventLog.svelte` | 83 | 3 |
| `src/lib/ui/JourneyMenu.svelte` | 230 | 14 |

Only **ActionBar** has rust-background buttons (contrast risk). The new status tokens (`--c-warn`/`--c-danger`/`--c-good`/`--c-amber-dark`) appear only as text colors / a warning stripe in PartyPanel — no contrast concern.

## Bridge mapping (authoritative; full table incl. status colors)
| legacy | → | legacy | → |
|---|---|---|---|
| `--c-bg-raised` | `--of-paper` | `--c-cream` | `--of-ink` |
| `--c-parchment` | `--of-paper-soft` | `--c-rust` | `--of-rust` |
| `--c-panel` | `--of-paper-soft` | `--c-rust-dark` | `--of-rust-dark` |
| `--c-border` | `--of-rule` | `--c-good` | `--of-good` |
| `--c-wood` | `--of-ink-soft` | `--c-warn` | `--of-warn` |
| `--c-tan-bright` | `--of-ink` | `--c-amber-dark` | `--of-warn` |
| `--c-tan` | `--of-ink` | `--c-danger` | `--of-bad` |
| `--c-ink` | `--of-ink` | | |

**Contrast pitfall (PR2/PR3):** the blanket `--c-cream`/`--c-tan` → `--of-ink` is correct for light text on a dark *surface* (inverts to paper) but WRONG for light text on a *rust button* (rust doesn't invert). After migrating, any `color: var(--of-ink)`/`--of-ink-soft` on a `--of-rust`/`--of-rust-dark` background must become `var(--of-paper-soft)`.

---

### Task 1: Migrate the 7 play-shell surfaces off `--c-*` + contrast fix

**Files:** the 7 above.

- [ ] **Step 1: Pre-check** — list distinct tokens per file; every one must be in the table above. If not, look it up in the `--c-` block in `src/lib/styles/theme.css` and add a `-e` rule.
```bash
cd /home/eric/projects/hoosierTrail-ui-pr4
for f in play/+page ActionBar PartyPanel InventoryPanel WagonPanel EventLog JourneyMenu; do :; done
for f in src/routes/play/+page.svelte src/lib/ui/ActionBar.svelte src/lib/ui/PartyPanel.svelte src/lib/ui/InventoryPanel.svelte src/lib/ui/WagonPanel.svelte src/lib/ui/EventLog.svelte src/lib/ui/JourneyMenu.svelte; do echo "== $f =="; grep -oE -- '--c-[a-z-]+' "$f" | sort -u; done
```

- [ ] **Step 2: Migrate (order matters; longer-prefix tokens first)**
```bash
cd /home/eric/projects/hoosierTrail-ui-pr4
for f in src/routes/play/+page.svelte src/lib/ui/ActionBar.svelte src/lib/ui/PartyPanel.svelte src/lib/ui/InventoryPanel.svelte src/lib/ui/WagonPanel.svelte src/lib/ui/EventLog.svelte src/lib/ui/JourneyMenu.svelte; do
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
    -e 's/--c-amber-dark/--of-warn/g' \
    -e 's/--c-good/--of-good/g' \
    -e 's/--c-warn/--of-warn/g' \
    -e 's/--c-danger/--of-bad/g' \
    "$f"
done
grep -c -- '--c-' src/routes/play/+page.svelte src/lib/ui/ActionBar.svelte src/lib/ui/PartyPanel.svelte src/lib/ui/InventoryPanel.svelte src/lib/ui/WagonPanel.svelte src/lib/ui/EventLog.svelte src/lib/ui/JourneyMenu.svelte
```
Each count MUST be 0. (Order note: `--c-amber-dark` before `--c-amber`? no `--c-amber` exists; `--c-rust-dark` before `--c-rust`, `--c-tan-bright` before `--c-tan`, `--c-bg-raised` before any `--c-b…` — list above is safe.)

- [ ] **Step 3: Contrast scan + fix (ActionBar + any rust-bg in the others)**
```bash
cd /home/eric/projects/hoosierTrail-ui-pr4
for f in src/routes/play/+page.svelte src/lib/ui/ActionBar.svelte src/lib/ui/PartyPanel.svelte src/lib/ui/InventoryPanel.svelte src/lib/ui/WagonPanel.svelte src/lib/ui/EventLog.svelte src/lib/ui/JourneyMenu.svelte; do echo "== $f =="; grep -nE 'background:[^;]*--of-rust|background-color:[^;]*--of-rust' "$f"; done
```
For each rule with a `--of-rust`/`--of-rust-dark` BACKGROUND, Read it; if its text `color:` is now `var(--of-ink)`/`--of-ink-soft` (dark on rust — a sed-introduced contrast bug), change that color to `var(--of-paper-soft)`. Also check `:hover`/`.active`/`.selected`/`.primary`/`.danger` state rules that flip a background to rust. Only fix genuine light-text-on-rust cases. Note: the project has a global `button:hover` rust fill — PartyPanel/WagonPanel already carry `background: var(--c-panel)` overrides for that (now `--of-paper-soft`), so their hover text stays ink-on-paper (correct, leave alone). Report what you changed and what you left.

- [ ] **Step 4: Verify** — `cd /home/eric/projects/hoosierTrail-ui-pr4 && npm run check && npx vitest run` (0 errors; all tests pass).

- [ ] **Step 5: Commit** — `jj commit -m "feat(ui): migrate play shell off --c-* bridge to broadsheet paper (PR4)"`.

---

### Task 2: Verify + Playwright parity sweep + PR (controller-driven)

- [ ] **Step 1: Full gate** — `npm run verify`.
- [ ] **Step 2: Dev server** — `systemd-run --user --unit=ot-pr4-dev --working-directory="$PWD" npm run dev -- --port 5182`; confirm 200 on `http://localhost:5182/`.
- [ ] **Step 3: Playwright** — `/dev/scenario/at_kearny` (mid-trail travel state). Screenshot the full play shell: top journey bar, central travel/landmark stage, ActionBar, and the right rail (PartyPanel / WagonPanel / InventoryPanel). Expand PartyPanel + WagonPanel + InventoryPanel (and open JourneyMenu via the 🤠 button) — screenshot each. Confirm: broadsheet paper throughout, no inverted/invisible text, ActionBar buttons readable, status colors (morale/condition/trend arrows) legible on paper, EventLog readable. Compare against `Components.jsx` intent; add a Task 3 polish ONLY if a surface visibly diverges beyond tokens.
- [ ] **Step 4: Stop server** — `systemctl --user stop ot-pr4-dev`.
- [ ] **Step 5: Residue** — `grep -rc -- '--c-'` across all 7 → 0.
- [ ] **Step 6: PR** — push `feat/ui-pr4-play-shell`; `gh pr create` from the colocated default workspace, base master, body summarizing migration + contrast fix + screenshots. PR4 of the rollout.

---

## Self-Review
- **Spec coverage:** all 7 PR4 components migrated (Task 1) + verified against `Components.jsx` (Task 2). ✅
- **Placeholders:** none — extended sed table is concrete; status-color mappings included; only the optional polish is gated on a real screenshot divergence.
- **Risk:** the new status tokens are text-only (no contrast risk); the one hazard (ActionBar rust buttons) has a pre-specified fix. Largest file is PartyPanel (493 lines / 36 refs) — still a mechanical migration.

## Execution
subagent-driven-development: Task 1 → one implementer + (light) review; Task 2 controller-driven.
