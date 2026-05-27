#!/usr/bin/env -S npx tsx
// #1181 — Read all feedback rows in chronological order. Pipe into a
// Claude conversation or just eyeball it.
//
// Usage:
//   npx tsx scripts/feedback-read.ts                  # default DB
//   DATABASE_URL=file:./prod.db npx tsx scripts/...   # override
//
// Production reads (wanda):
//   docker exec ot-revisited sqlite3 /data/game.db \
//     "SELECT id, datetime(created_at,'unixepoch'), substr(body,1,200) \
//      FROM feedback ORDER BY id DESC;"

import Database from 'better-sqlite3';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const path = url.startsWith('file:') ? url.slice('file:'.length) : url;

const db = new Database(path, { readonly: true });
const rows = db
  .prepare(
    `SELECT id, body, page_url, user_agent, datetime(created_at, 'unixepoch') AS at
     FROM feedback ORDER BY id ASC`
  )
  .all() as Array<{ id: number; body: string; page_url: string | null; user_agent: string | null; at: string }>;

if (rows.length === 0) {
  console.log('(no feedback yet)');
  process.exit(0);
}

for (const r of rows) {
  console.log(`--- #${r.id}  ${r.at}  ${r.page_url ?? '(no url)'}`);
  console.log(r.body);
  console.log();
}
console.log(`(${rows.length} total)`);
