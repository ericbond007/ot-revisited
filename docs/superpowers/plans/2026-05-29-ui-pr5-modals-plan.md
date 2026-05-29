# UI Redesign PR5 — Modals Batch Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Port the game modal batch off the legacy `--c-*` bridge to `--of-*` broadsheet-paper tokens, and fix the deferred dark-scrim straggler (modal backdrops standardized to the handoff's parchment-ink wash). Reference `docs/handoff/ui-redesign/ui_kits/game/game-modals.jsx`.

**Architecture:** PR5 of the rollout. Two mechanical passes: (1) token migration of 14 modals (same bridge-backed no-op + contrast pattern as PR3/PR4); (2) scrim standardization across ALL `*Modal.svelte` backdrops (a raw `rgba()` the token pass doesn't touch). No logic changes.

**Tech Stack:** SvelteKit 5, TypeScript, vitest, svelte-check. jj (not git) — commit with `jj commit`.

## Scope
**14 modals to migrate** (rollout spec PR5; TradeModal/TradeReceiptModal/TownActionModal already done in PR3; LetterModal/NewspaperModal already token-clean):
EventModal, HuntModal, FordModal, FordSummaryModal, PostHuntModal, CampSummaryModal, MudAbandonModal, CompanyDissentModal, PartyModal, PartyMemberModal, WagonModal, WagonTrainModal, InventoryModal, FeedbackModal (all `src/lib/ui/`). ~201 `--c-` refs total.

**Rust-bg buttons (contrast risk):** FordSummaryModal, CampSummaryModal, WagonTrainModal.

**Dark scrim:** 16 `*Modal.svelte` files set `.modal-backdrop { background: rgba(26, 15, 8, 0.85–0.92) }` (heavy dark-brown). The handoff backdrop is `rgba(42, 29, 12, 0.80)`.

## Bridge mapping (full table)
| legacy | → | legacy | → |
|---|---|---|---|
| `--c-bg` | `--of-paper` | `--c-cream` | `--of-ink` |
| `--c-bg-raised` | `--of-paper` | `--c-rust` | `--of-rust` |
| `--c-paper` | `--of-paper-soft` | `--c-rust-dark` | `--of-rust-dark` |
| `--c-parchment` | `--of-paper-soft` | `--c-good` | `--of-good` |
| `--c-panel` | `--of-paper-soft` | `--c-warn` / `--c-amber-dark` | `--of-warn` |
| `--c-border` | `--of-rule` | `--c-danger` / `--c-blood` | `--of-bad` |
| `--c-wood` | `--of-ink-soft` | | |
| `--c-tan` / `--c-tan-bright` / `--c-ink` | `--of-ink` | | |

**DO NOT migrate `--c-river` / `--c-river-pale`** — these are real muted-blue colors (`#4a6a8c` / `#c8d4dc`), not bridge aliases; the design keeps them for water/river context. Leave them as-is.

**Contrast pitfall (PR2–PR4):** after migrating, any `color: var(--of-ink)`/`--of-ink-soft` on a `--of-rust`/`--of-rust-dark` *background* must become `var(--of-paper-soft)` (rust buttons don't invert).

---

### Task 1: Migrate the 14 modals off `--c-*` + contrast fix

**Files:** the 14 modals above.

- [ ] **Step 1: Pre-check** — list distinct tokens per file; confirm every one is in the table (or `--c-river`/`-river-pale`, which you LEAVE). If a genuinely new alias appears, look it up in `src/lib/styles/theme.css` and add a rule.
```bash
cd /home/eric/projects/hoosierTrail-ui-pr5
for m in EventModal HuntModal FordModal FordSummaryModal PostHuntModal CampSummaryModal MudAbandonModal CompanyDissentModal PartyModal PartyMemberModal WagonModal WagonTrainModal InventoryModal FeedbackModal; do echo "== $m =="; grep -oE -- '--c-[a-z-]+' src/lib/ui/$m.svelte | sort -u; done
```

- [ ] **Step 2: Migrate** — note `--c-river`/`--c-river-pale` are deliberately NOT in this sed (longer-prefix tokens first; `--c-bg-raised` before `--c-bg`):
```bash
cd /home/eric/projects/hoosierTrail-ui-pr5
for m in EventModal HuntModal FordModal FordSummaryModal PostHuntModal CampSummaryModal MudAbandonModal CompanyDissentModal PartyModal PartyMemberModal WagonModal WagonTrainModal InventoryModal FeedbackModal; do
  f=src/lib/ui/$m.svelte
  sed -i \
    -e 's/--c-bg-raised/--of-paper/g' \
    -e 's/--c-parchment/--of-paper-soft/g' \
    -e 's/--c-paper/--of-paper-soft/g' \
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
    -e 's/--c-blood/--of-bad/g' \
    -e 's/--c-bg/--of-paper/g' \
    "$f"
done
# residue check — should show ONLY --c-river / --c-river-pale (if any), nothing else
for m in EventModal HuntModal FordModal FordSummaryModal PostHuntModal CampSummaryModal MudAbandonModal CompanyDissentModal PartyModal PartyMemberModal WagonModal WagonTrainModal InventoryModal FeedbackModal; do grep -oE -- '--c-[a-z-]+' src/lib/ui/$m.svelte; done | sort -u
```
Expected residue: empty, or only `--c-river`/`--c-river-pale`. Anything else = a missed mapping; fix it.

- [ ] **Step 3: Contrast scan + fix** — FordSummaryModal, CampSummaryModal, WagonTrainModal (and any other):
```bash
cd /home/eric/projects/hoosierTrail-ui-pr5
for m in EventModal HuntModal FordModal FordSummaryModal PostHuntModal CampSummaryModal MudAbandonModal CompanyDissentModal PartyModal PartyMemberModal WagonModal WagonTrainModal InventoryModal FeedbackModal; do echo "== $m =="; grep -nE 'background:[^;]*--of-rust|background-color:[^;]*--of-rust' src/lib/ui/$m.svelte; done
```
For each rule with a `--of-rust`/`--of-rust-dark` BACKGROUND whose text `color:` is now `var(--of-ink)`/`--of-ink-soft`, change that color to `var(--of-paper-soft)`. Include `:hover`/`.active`/`.primary`/`.confirm`/`.danger` state rules that flip a background to rust. Leave `color: var(--of-rust)` text (rust-on-paper, correct) and the `button:hover` rust-fill overrides (`background: var(--of-paper-soft)`) alone. Report what changed / left.

- [ ] **Step 4: Verify** — `cd /home/eric/projects/hoosierTrail-ui-pr5 && npm run check && npx vitest run` (0 errors; all tests pass).

- [ ] **Step 5: Commit** — `jj commit -m "feat(ui): migrate game modals off --c-* bridge to broadsheet paper (PR5)"`.

---

### Task 2: Standardize the modal dark-scrim (deferred straggler)

**Files:** every `src/lib/ui/*Modal.svelte` whose `.modal-backdrop` uses `rgba(26, 15, 8, …)` (16 files, including the 3 PR3-migrated trade/town modals — their scrim is a raw rgba untouched by the token pass).

- [ ] **Step 1: Replace the dark-brown scrim with the handoff parchment-ink wash**
```bash
cd /home/eric/projects/hoosierTrail-ui-pr5
for f in src/lib/ui/*Modal.svelte; do
  sed -i -E 's/rgba\(26, ?15, ?8, ?0\.[0-9]+\)/rgba(42, 29, 12, 0.80)/g' "$f"
done
# confirm none remain
grep -rlE 'rgba\(26, ?15, ?8' src/lib/ui/*Modal.svelte || echo "all scrims standardized"
```
(Only the full-screen `.modal-backdrop` uses `rgba(26,15,8,*)`. The small `rgba(0,0,0,0.x)` inner shadows/tints are NOT touched — leave them.)

- [ ] **Step 2: Verify** — `npm run check && npx vitest run` (green).

- [ ] **Step 3: Commit** — `jj commit -m "fix(ui): standardize modal backdrop scrim to broadsheet parchment-ink wash (PR5)"`.

---

### Task 3: Verify + Playwright sweep + PR (controller-driven)

- [ ] **Step 1:** `npm run verify`.
- [ ] **Step 2:** `systemd-run --user --unit=ot-pr5-dev --working-directory="$PWD" npm run dev -- --port 5183`; if the dev server throws a Vite `@fs` 403 (separate-jj-workspace artifact seen in PR4), add the default workspace path to `server.fs.allow` in `vite.config` OR just rely on SSR render + verify — the 403 doesn't affect correctness. Confirm 200.
- [ ] **Step 3:** Playwright — trigger a representative spread of modals via dev scenarios and confirm broadsheet paper + the new lighter scrim + no inverted/invisible text + rust buttons readable:
  - `/dev/scenario/post_hunt_haul` → PostHuntModal
  - `/dev/scenario/post_ford_summary` → FordSummaryModal
  - `/dev/scenario/post_camp_summary` → CampSummaryModal
  - on any `/play` scenario (`at_kearny`): open PartyModal (click a party member), WagonModal, InventoryModal, FeedbackModal (header), JourneyMenu; trigger HuntModal via the Hunt action.
  - Screenshot 3–4 of these. Confirm the backdrop reads as a parchment-ink wash, not heavy dark-brown.
- [ ] **Step 4:** `systemctl --user stop ot-pr5-dev`.
- [ ] **Step 5:** Residue — across the 14 migrated modals, `grep -oE -- '--c-[a-z-]+'` returns only `--c-river`/`--c-river-pale` (or nothing); no `rgba(26,15,8` anywhere.
- [ ] **Step 6:** PR — push `feat/ui-pr5-modals`; `gh pr create` from the colocated default workspace, base master, body covering the 14-modal migration + contrast fixes + the dark-scrim standardization. PR5 of the rollout; closes the PR0 dark-scrim straggler.

---

## Self-Review
- **Spec coverage:** all 14 PR5 modals migrated (Task 1); dark-scrim straggler fixed across all modals (Task 2); verified (Task 3). ✅
- **Placeholders:** none — sed tables concrete; the `--c-river` exclusion is explicit; scrim target is the handoff value.
- **Risk:** largest batch but mechanical; the only judgement is the 3 rust-button contrast fixes (pre-identified) and not touching `--c-river`/inner `rgba(0,0,0)` shadows.

## Execution
subagent-driven-development: one implementer does Task 1 then Task 2 (two commits) + review; Task 3 controller-driven.
