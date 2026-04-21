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

## Project layout

- `src/lib/game/` — pure game engine (no DB, no DOM). `types.ts`, `rng.ts`, `engine.ts`, `saves.ts`, `systems/`.
- `src/lib/db/` — SQLite persistence. `schema.ts`, `client.ts`, `saves-repo.ts`.
- `tests/` — Vitest tests mirroring the source layout.
- `docs/superpowers/specs/` — design spec.
- `docs/superpowers/plans/` — implementation plans.

## Design spec

See `docs/superpowers/specs/2026-04-20-hoosier-trail-design.md`.
