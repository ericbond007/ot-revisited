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

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type Save = typeof saves.$inferSelect;
export type NewSave = typeof saves.$inferInsert;
