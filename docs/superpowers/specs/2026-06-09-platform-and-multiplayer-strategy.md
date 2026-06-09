# Platform & Multiplayer Strategy — hoosierTrail

*2026-06-09. Decisions in §0 were made with Dave in session; the engine-path
decision in §5 is deliberately OPEN, gated on the Deck spike + this doc.*

## 0. Decisions already made

| Question | Decision |
|---|---|
| Monetization | Premium one-time purchase. No gacha, no IAP, no ads. |
| First storefront | itch.io ($0 fee). Steam, Google Play, Apple later. |
| Free web version | Comes down at paid launch; itch web build replaces it. |
| Multiplayer shape | Co-op shared wagon train, live sessions primary, 2–8+ players. |
| MP identity | Lightweight accounts first; Steam/platform identity migration later. |
| MP build timing | Deferred — designed here so nothing blocks it, built later. |
| Engine path | **OPEN** — wrapper vs Godot, decided after the Deck spike (§5). |

## 1. Where the codebase stands

Health is good: zero `as any`/`@ts-ignore` across the repo, 240 test files /
2,600+ tests, SHA-pinned CI, clean error-handling discipline. The strategic
asset is the engine: **27k lines of pure TypeScript with no UI imports, fully
seeded RNG (Mulberry32, zero `Math.random()` in engine code), a pure-function
daily tick, and 10–20 KB fully-serializable game state.** Given the same seed
and choices, every outcome replays byte-identical. This determinism is the
moat: it is what makes multiplayer, save-sync, replays, and bot testing cheap,
and it must be protected in every path below.

Known debt (tracked in Vikunja, none blocking): `src/routes/outfit/+page.svelte`
god-file (2,341 lines), tick-pipeline consolidation (#1266, in flight), several
systems tested only via integration, zero UI-component unit tests.

Current architecture: SvelteKit SSR (adapter-node), better-sqlite3 saves keyed
by a device cookie, ~50 form actions in `src/routes/play/+page.server.ts`.
Zero runtime network calls beyond the app's own server; no PWA manifest.
Note the framing that matters for everything below: **the game is already
server-authoritative** — multiplayer extends this server, it does not fight it.

## 2. Shared prerequisite: the action vocabulary

Every path below — multiplayer, itch, Steam, mobile — passes through one
refactor first: replace the ~50 ad-hoc form actions with a **serializable
action vocabulary**. Every player decision becomes a plain object:

```ts
{ type: 'travel', days: 3 }
{ type: 'ford', method: 'ferry' }
{ type: 'resolveEvent', choiceId: 'give_meat' }
{ type: 'camp', actions: ['hunt', 'repair'] }
```

One dispatcher validates an action against the current state and applies the
pure engine function. The same objects then serve three masters:

- **Solo offline:** dispatch locally (browser, Tauri webview, phone).
- **Co-op:** dispatch over the wire to the session server — the action
  vocabulary IS the network protocol.
- **Testing/replay:** a saved action log + seed replays any game.

The engine stays isomorphic — one codebase, one test suite, one set of balance
numbers, running client-side for solo and server-side for co-op.

**Effort: ~1–2 weeks of sessions.** Mostly mechanical: each form action body
becomes a vocabulary case; the SvelteKit actions become thin wrappers during
the transition, then disappear on the platform path.

## 3. Multiplayer design (build-later; nothing below blocks on it)

**Shape:** each human owns a wagon in one shared train, slotting in exactly
where an NPC wagon sits today. The engine already drives NPC wagons through
the `Persona` interface (`src/lib/game/ai/personas.ts`, ~25 decision methods
over `WagonStateLike`) — a remote human is "a persona whose decisions arrive
over the network." This satisfies the house NPC-parity rule by construction:
human and NPC wagons share `WagonStateLike`, the same consumption /
condition / morale systems, and the same decision points. The game-ai axis:
personas remain the AFK/timeout fallback, so the decision layer gains a
consumer, not a fork.

**Authority:** server-authoritative on wanda (self-hosted, $0). Sessions +
rosters + action logs in SQLite next to the existing saves schema. The server
runs the same engine package the client ships — determinism makes
desync impossible by construction rather than by netcode heroics.

**Cadence:** live sessions primary — everyone online, the shared day ticks
when all wagons have submitted (configurable timeout, default ~60s, then the
absent player's persona auto-passes). Correspondence mode is the same
machinery with a deadline measured in hours — a knob, not a feature.

**Transport:** WebSocket (or SSE + POST fallback) carrying action objects from
§2 and state broadcasts (10–20 KB gzipped to 2–4 KB — trivial).

**Identity:** v1 lightweight accounts (username+password or email magic-link)
so wagons survive device changes; join via 6-char game codes. Designed so a
Steam/Play identity can attach to the same account row later (platform-id
column, not a rewrite).

**Synchronicity caveats:** one player AFK = timeout → persona plays their day
(they get a recap on return). Mid-journey drop-in: joining player adopts an
existing NPC wagon. 150-day runs are 1–3 hours solo; live co-op targets
evening-session length via the existing multi-day travel batching.

**Effort: ~3–6 weeks of sessions** after §2 (sessions/accounts, orchestration
loop, lobby/join UI, in-game presence surfaces, recap UX).

## 4. Platform path (after the engine decision)

1. **Client-side solo core** — engine + dispatcher run in-browser;
   saves move behind the existing repo interface to IndexedDB;
   `adapter-static` build. The dev-only routes stay behind `dev` gates.
   *~2–4 weeks.*
2. **itch.io launch** — the static build sells directly as a paid HTML5 game
   (plays in-browser on itch) plus downloadable Tauri desktop builds
   (Linux/Windows/macOS, ~10 MB shells) from the same artifact. Free web
   version retires. *~1 week of packaging + store setup.*
3. **Steam** — $100 Steamworks fee; Tauri build + steamworks integration
   (achievements, cloud saves); the **controller-navigation workstream**
   (gamepad API + focus-ring across all modals/stages) is the Deck-feel
   linchpin and pays off on every platform. Target Deck Verified.
   *~2–3 weeks for controller nav, ~1–2 weeks Steamworks.*
4. **Android (Capacitor)** — same static artifact in a webview shell,
   Play Store $25. Gated on asset slimming. Apple ($99/yr + Mac hardware)
   only if demand shows up.

**Asset workstream (parallel, required before 2):** `static/wagon-bg/` is
360 MB (756 WebP @ ~480 KB). Tier it: full-res for desktop downloads,
~100–150 KB recompress for the itch web build, aggressive tier + lazy
fetch-and-cache for mobile. *~days, mostly batch scripting.*

## 5. The "real game" question: wrapper vs Godot — open, evidence pending

Two honest paths to "a real game on the Steam Deck," with the asymmetry
spelled out. **Decision gate: Dave's Deck spike verdict (tools/deck-spike/)
plus this doc.**

### Path A — polished wrapper (TS stays canonical)

Tauri binaries, Steamworks, full controller navigation, settings menu
(audio/display/text size), tiered assets. Precedent that players cannot tell:
CrossCode (HTML5 in NW.js — Steam, PS4, Switch, Deck-verified), Vampire
Survivors v1.0 (Phaser in Electron — conquered the Deck before its Unity
rebuild). For a turn-based menu-driven game the webview runtime is invisible;
what players feel is input, latency-free UI, and packaging — all addressable.

- Everything in §2–§4 carries forward unchanged; one engine, one test suite.
- *Effort to Steam-quality Deck build: ~6–10 weeks of sessions total.*
- Ceiling: console ports need a porting house (as CrossCode did).

### Path B — Godot port

- **Full port** (engine + UI in GDScript/C#): months of rework (realistic
  range 4–8), re-earning determinism test-by-test, and once MP exists the
  server still runs TypeScript — two engines, every balance change lands
  twice. **If browser play must survive, the port must be GDScript:** Godot's
  C#/.NET web export remains unsupported, and even GDScript web export means
  a 40+ MB WASM runtime and COOP/COEP hosting headers. The browser — currently
  the game's best platform — becomes its most fragile.
- **View-layer port** (Godot renders, sim stays TS): clean for online co-op
  (any client talks to the wanda server), but offline solo needs the TS engine
  on-device — embedded JS runtime or sidecar process. Real plumbing the
  wrapper simply doesn't need. *2–4 months for the UI port alone (219 Svelte
  components).*
- What Godot genuinely buys: built-in controller/focus UI primitives (the one
  durable advantage), native runtime, console certification without a partner.

### Recommendation on record (HAL)

Path A, with the controller-nav workstream treated as first-class. Path B's
honest home is a future trigger: a console deal, or realtime-rendering
ambitions the webview can't meet — and then as a view-layer port, never a sim
rewrite. The Deck spike exists to test this recommendation against hardware
before committing.

## 6. Monetization

Premium one-time purchase. itch first: $8–10 list (genre-typical for polished
narrative/sim indies; launch discount to $6–7), itch rev share configurable
(default 10%). Steam at the same or +$2 price point; the $100 fee recoups at
~$1k gross. No IAP, no ads, ever. Demo strategy: once the free web version
retires, an itch demo channel (first ~40 trail days, save carries into the
full game) replaces it as the funnel. Multiplayer ships as a free update to
the paid game — a headline patch, not DLC.

## 7. Costs

| Item | Cost | Notes |
|---|---|---|
| itch.io | $0 | rev share configurable, default 10% |
| Steam | $100 one-time per app | recouped at ~$1k gross |
| Google Play | $25 one-time | Z Fold 4 is the test device |
| Apple | $99/year + Mac hardware | deferred unless demand appears |
| MP/web hosting | $0 | wanda, self-hosted |
| Tauri/Capacitor/tooling | $0 | open source |

## Appendix: order of operations

```
now      → code-health PR (done alongside this doc) + Deck spike verdict
gate     → engine-path decision (this doc §5 + spike findings)
phase 1  → action vocabulary (§2)            ~1–2 wk
phase 2  → multiplayer v1 (§3)               ~3–6 wk
phase 3  → client-side solo core (§4.1)      ~2–4 wk
phase 4  → asset tiers + itch launch (§4.2)  ~1–2 wk
phase 5  → Steam + controller nav (§4.3)     ~3–5 wk
phase 6  → Android (§4.4)                    on demand
```

*Effort figures are working-session weeks at Claude pace, not calendar
promises; phases 1–2 and the asset workstream can interleave.*
