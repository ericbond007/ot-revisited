# The OT: Oregon Trail Revisited

**Short name:** OT.IO

A browser-based, single-player replica of the original Oregon Trail. Choice-driven, self-hostable, free to run.

## Status

Phase 1 UI polish complete. Full trail, 32 landmarks, 30+ events, per-river stats, chunked map view with scout/spyglass lookahead, themed tooltips, landmark stage takeover at trading posts / river crossings.

## Stack

- SvelteKit 2 + Svelte 5 runes + TypeScript
- Drizzle ORM + better-sqlite3 for persistence
- Vitest for tests
- `@sveltejs/adapter-node` — runs as a single Node process

## Development

```bash
npm install
npm run db:generate   # regenerate migrations after schema changes
npm test              # full suite (currently 225 tests)
npm run dev           # dev server on :5173
```

## Production build

```bash
npm run build         # produces build/
node build/index.js   # starts the Node server (default port 3000)
```

Open http://localhost:3000/.

## Deploying

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — covers Docker + traefik, systemd, backups.

## UI screens

- `/` — landing; lists saves
- `/new` — party-setup wizard; creates a new journey
- `/load` — load or delete saved games
- `/play?slot=<name>` — main play screen

## Project layout

- `src/lib/game/` — pure game engine (no DB, no DOM)
- `src/lib/db/` — SQLite persistence layer
- `src/lib/ui/` — Svelte components
- `src/routes/` — SvelteKit routes + form actions
- `tests/` — Vitest tests
- `docs/superpowers/specs/` — original design spec
- `docs/superpowers/plans/` — implementation plans (historical)
