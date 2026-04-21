# Hoosier Trail

Browser-based replica of the original Oregon Trail. Single-player, choice-driven, self-hostable.

## Status

v1 in progress. Foundation (Plan 1) complete: game engine types, seeded RNG, day-tick turn loop, SQLite saves. Core mechanics (Plan 2) next.

## Stack

- SvelteKit + TypeScript
- Vitest for tests
- Drizzle ORM + better-sqlite3 for persistence

## Development

```bash
npm install
npm run db:generate   # regenerate migrations after schema changes
npm test              # run the suite
npm run test:watch    # watch mode
npm run dev           # dev server (UI arrives in Plan 4)
```

## Running the UI

```bash
npm run build         # produces build/
node build/index.js   # starts the self-hosted server (default port 3000)
```

Open http://localhost:3000/ in a browser.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for self-hosting instructions.

Plan 4a UI screens:
- `/` — landing; lists existing saves
- `/new` — party-setup wizard; creates a new journey
- `/load` — load or delete saved games

Main play screen lands in Plan 4b.

## Project layout

- `src/lib/game/` — pure game engine (no DB, no DOM). `types.ts`, `rng.ts`, `engine.ts`, `saves.ts`, `systems/`.
- `src/lib/db/` — SQLite persistence. `schema.ts`, `client.ts`, `saves-repo.ts`.
- `tests/` — Vitest tests mirroring the source layout.
- `docs/superpowers/specs/` — design spec.
- `docs/superpowers/plans/` — implementation plans.

## Design spec

See `docs/superpowers/specs/2026-04-20-hoosier-trail-design.md`.
