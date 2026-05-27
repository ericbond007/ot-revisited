import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

export const saves = sqliteTable(
  'saves',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    slotName: text('slot_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    gameState: text('game_state').notNull(),
    summary: text('summary').notNull()
  },
  (t) => ({
    uxDeviceSlot: uniqueIndex('ux_saves_device_slot').on(t.deviceId, t.slotName)
  })
);


// #1181 — anonymous in-game feedback. Posted from FeedbackModal via
// `/feedback` form action; readable via `scripts/feedback-read.ts` for
// pulling into Claude conversations for design synthesis.
//
// deviceId is FK for soft-pseudonymity (we can see "this same playtester
// also said X yesterday") but never tied to a real identity. The page URL
// + user agent are captured for context — "feedback from the outfit
// screen on mobile" is more useful than "anon feedback #47."
export const feedback = sqliteTable('feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id').references(() => devices.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  pageUrl: text('page_url'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type Save = typeof saves.$inferSelect;
export type NewSave = typeof saves.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
