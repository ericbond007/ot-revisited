# UI Redesign PR9 — Cleanup + Delete the `--c-*` Bridge (Finale)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Migrate every remaining `--c-*` straggler off the bridge, promote the one real legacy color (`--c-river`) to an `--of-river` token, then **delete the entire `--c-*` alias block** from `theme.css`. The clean `npm run verify` after deletion is the proof the whole app stands on `--of-*`.

**Tech Stack:** SvelteKit 5, TypeScript, vitest, svelte-check. jj (not git).

## Scope — every file still referencing `--c-*` (full-tree sweep)
**Production surfaces missed by earlier PRs (migrate with care + contrast scan):**
- `src/lib/ui/EndScreen.svelte` (36 refs — arrival/death screen, has rust-bg buttons)
- `src/lib/ui/WagonTrainPanel.svelte` (8 refs)
- `src/lib/ui/FordModal.svelte` (1 ref — `--c-river`, the water color → promote to `--of-river`)
- `src/lib/ui/IconSprite.svelte` (1 ref — in a **code comment** only; update the comment text)

**Dev harnesses + error page (mechanical bulk migrate — dev-only, low stakes):**
- `src/routes/+error.svelte` (2)
- `src/routes/dev/components/+page.svelte`, `.../action-bar`, `.../buttons`, `.../event-modal`, `.../party-panel`, `.../stat-bars`, `.../stat-readout` (`+page.svelte` each)
- `src/routes/dev/scenario/+page.svelte`, `src/routes/dev/ox-team/+page.svelte`, `src/routes/dev/terrain/+page.svelte`, `src/routes/dev/trail-map/+page.svelte`, `src/routes/dev/wagons/+page.svelte`, `src/routes/dev/wagon-detail/+page.svelte`, `src/routes/dev/wagon-view/+page.svelte`

All tokens are in-bridge. `--c-river` is the only "real color" alias (a muted blue `#4a6a8c`); `--c-river-pale` (`#c8d4dc`) is defined but **used nowhere** — drop it.

## Bridge mapping (full)
`--c-bg`/`--c-bg-raised`→`--of-paper`; `--c-panel`/`--c-parchment`/`--c-paper`/`--c-parchment-trade`/`--c-parchment-end`→`--of-paper-soft`; `--c-parchment-visited`→`--of-paper`; `--c-border`→`--of-rule`; `--c-wood`→`--of-ink-soft`; `--c-wood-soft`→`--of-ink-faded`; `--c-ink`/`--c-tan`/`--c-tan-bright`/`--c-cream`→`--of-ink`; `--c-rust`→`--of-rust`; `--c-rust-dark`→`--of-rust-dark`; `--c-good`/`--c-sage`/`--c-sage-dark`→`--of-good`; `--c-warn`/`--c-amber-dark`→`--of-warn`; `--c-danger`/`--c-blood`/`--c-ill-dark`→`--of-bad`; `--c-river`→`--of-river` (NEW token); `--c-river-pale`→drop (unused).

**Contrast pitfall (PR2–PR8):** after migrating, any `color: var(--of-ink)`/`--of-ink-soft` on a `--of-rust`/`--of-rust-dark` *background* → `var(--of-paper-soft)`. EndScreen has rust-bg buttons — scan it.

---

### Task 1: Add `--of-river` + migrate every straggler off `--c-*`

**Files:** all listed above.

- [ ] **Step 1: Add the `--of-river` token** to the `--of` palette in `src/lib/styles/theme.css` (near the other `--of-*` color defs, e.g. after `--of-bad`):
```bash
cd /home/eric/projects/hoosierTrail-ui-pr9
# Read the :root --of palette block first to place it correctly, then add:
#   --of-river: #4a6a8c;   /* muted blue — water/ford context (promoted from legacy --c-river) */
```
Add it via a targeted edit (insert the line after the `--of-bad:` declaration). Confirm `grep -n 'of-river' src/lib/styles/theme.css`.

- [ ] **Step 2: Migrate all straggler files** (one sed loop; `--c-river`→`--of-river`, longer-prefix tokens first):
```bash
cd /home/eric/projects/hoosierTrail-ui-pr9
FILES="src/lib/ui/EndScreen.svelte src/lib/ui/WagonTrainPanel.svelte src/lib/ui/FordModal.svelte src/lib/ui/IconSprite.svelte src/routes/+error.svelte $(ls src/routes/dev/components/+page.svelte src/routes/dev/components/*/+page.svelte src/routes/dev/scenario/+page.svelte src/routes/dev/ox-team/+page.svelte src/routes/dev/terrain/+page.svelte src/routes/dev/trail-map/+page.svelte src/routes/dev/wagons/+page.svelte src/routes/dev/wagon-detail/+page.svelte src/routes/dev/wagon-view/+page.svelte)"
for f in $FILES; do
  sed -i \
    -e 's/--c-bg-raised/--of-paper/g' \
    -e 's/--c-parchment-visited/--of-paper/g' \
    -e 's/--c-parchment-trade/--of-paper-soft/g' \
    -e 's/--c-parchment-end/--of-paper-soft/g' \
    -e 's/--c-parchment/--of-paper-soft/g' \
    -e 's/--c-paper/--of-paper-soft/g' \
    -e 's/--c-panel/--of-paper-soft/g' \
    -e 's/--c-border/--of-rule/g' \
    -e 's/--c-wood-soft/--of-ink-faded/g' \
    -e 's/--c-wood/--of-ink-soft/g' \
    -e 's/--c-tan-bright/--of-ink/g' \
    -e 's/--c-tan/--of-ink/g' \
    -e 's/--c-cream/--of-ink/g' \
    -e 's/--c-ink/--of-ink/g' \
    -e 's/--c-rust-dark/--of-rust-dark/g' \
    -e 's/--c-rust/--of-rust/g' \
    -e 's/--c-amber-dark/--of-warn/g' \
    -e 's/--c-good/--of-good/g' \
    -e 's/--c-sage-dark/--of-good/g' \
    -e 's/--c-sage/--of-good/g' \
    -e 's/--c-warn/--of-warn/g' \
    -e 's/--c-danger/--of-bad/g' \
    -e 's/--c-blood/--of-bad/g' \
    -e 's/--c-ill-dark/--of-bad/g' \
    -e 's/--c-river-pale/--of-river/g' \
    -e 's/--c-river/--of-river/g' \
    -e 's/--c-bg/--of-paper/g' \
    "$f"
done
# residue across the whole src tree EXCEPT theme.css (the bridge block is still there until Task 2)
grep -rl -- '--c-' src/ 2>/dev/null | grep -v 'styles/theme.css' || echo "ALL STRAGGLERS CLEAR"
```
Expected: "ALL STRAGGLERS CLEAR" (only theme.css's own block remains, deleted in Task 2).

- [ ] **Step 3: Contrast scan + fix** — EndScreen (rust-bg buttons), WagonTrainPanel:
```bash
cd /home/eric/projects/hoosierTrail-ui-pr9
for f in src/lib/ui/EndScreen.svelte src/lib/ui/WagonTrainPanel.svelte; do echo "== $f =="; grep -nE 'background:[^;]*--of-rust|background-color:[^;]*--of-rust' "$f"; done
```
For each `--of-rust`/`--of-rust-dark`-background rule whose text `color:` is now `var(--of-ink)`/`--of-ink-soft`, change to `var(--of-paper-soft)`. Include `:hover`/`.primary`/`.again`/`.restart` state rules. Report what changed / left.

- [ ] **Step 4: Verify** — `cd /home/eric/projects/hoosierTrail-ui-pr9 && npm run check && npx vitest run` (0 errors; all tests pass).

- [ ] **Step 5: Commit** — `jj commit -m "feat(ui): migrate remaining surfaces + dev harnesses off --c-* bridge; promote --c-river to --of-river (PR9)"`.

---

### Task 2: Delete the `--c-*` alias block (the finale)

**Files:** `src/lib/styles/theme.css`.

- [ ] **Step 1: Delete the entire legacy `--c-*` block.** Read the block (≈lines 208–250 — it spans the surfaces/text/accent/status/river alias declarations plus any section comments). Remove every `--c-*:` declaration line (and the now-empty comment headers for that legacy section). Leave all `--of-*` tokens and `.ds-*` utilities intact.
```bash
cd /home/eric/projects/hoosierTrail-ui-pr9
# After deletion, NO --c- definitions may remain anywhere:
grep -rn -- '--c-' src/ 2>/dev/null || echo "ZERO --c- IN ENTIRE src/ — BRIDGE GONE"
```
Expected: "ZERO --c- IN ENTIRE src/ — BRIDGE GONE".

- [ ] **Step 2: Verify build — THIS IS THE PROOF** — `cd /home/eric/projects/hoosierTrail-ui-pr9 && npm run verify` (svelte-check 0 errors + all tests). A clean build with the bridge deleted proves nothing references a legacy token. If anything errors, a straggler was missed — find it (`grep -rn -- '--c-' src/`), migrate it, re-run. Do NOT re-add the bridge.

- [ ] **Step 3: Commit** — `jj commit -m "chore(ui): delete the --c-* alias bridge — every surface stands on --of-* (PR9)"`.

---

### Task 3: Verify + Playwright sweep + PR (controller-driven)

- [ ] **Step 1:** `npm run verify` (already green from Task 2; re-confirm).
- [ ] **Step 2:** `systemd-run --user --unit=ot-pr9-dev --working-directory="$PWD" npm run dev -- --port 5187`; confirm 200. (Vite `@fs` 403 in a separate jj workspace is a known cosmetic artifact.)
- [ ] **Step 3:** Playwright — focus on the **production stragglers never before verified in paper**:
  - **EndScreen (arrival)**: `/dev/scenario/arrival_chimney_rock` (or a win scenario) → screenshot; confirm broadsheet paper, readable rust buttons (Play Again / restart), scoring/epilogue legible.
  - **EndScreen (death)**: `/dev/scenario/party_wiped` → screenshot the tombstone/game-over.
  - **`/error`**: hit a bad route (e.g. `/play?slot=nonexistent` or `/dev/scenario/bogus`) → screenshot the error page in paper.
  - **WagonTrainPanel**: a scenario with a joined train (or the `/dev` wagon harness) → confirm paper.
  - Confirm no inverted/invisible text anywhere.
- [ ] **Step 4:** `systemctl --user stop ot-pr9-dev`.
- [ ] **Step 5:** Final proof — `grep -rn -- '--c-' src/` returns nothing.
- [ ] **Step 6:** PR — push `feat/ui-pr9-cleanup`; `gh pr create` from the colocated default workspace, base master. The rollout finale: cleanup + bridge deletion.

---

## Self-Review
- **Spec coverage:** all `--c-*` stragglers (production + 14 dev harnesses + error) migrated (Task 1); `--c-river` promoted to `--of-river`; bridge deleted (Task 2); production surfaces verified (Task 3). ✅
- **Placeholders:** none — full file list + sed table + the `--of-river` promotion are concrete.
- **Risk:** EndScreen (36 refs, rust buttons, player-facing) is the real one — gets the contrast scan + arrival/death screenshots. The bridge deletion is self-proving: build breaks if any straggler was missed.

## Execution
subagent-driven-development: one implementer does Task 1 (migrate + --of-river + contrast) then Task 2 (delete bridge + verify) — two commits + review; Task 3 controller-driven.
