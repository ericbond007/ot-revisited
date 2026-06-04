import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { devices, saves, feedback } from './schema';
import type { AppDb } from './client';
import { buildSummary, deserialize, serialize } from '../game/saves';
import type { GameState } from '../game/types';

export interface SaveRow {
  id: string;
  slotName: string;
  summary: string;
  updatedAt: Date;
}

export class SavesRepo {
  constructor(private db: AppDb) {}

  async createDevice(): Promise<string> {
    const id = randomUUID();
    await this.db.insert(devices).values({ id }).run();
    return id;
  }

  /**
   * Verify a device id exists in the DB. If the cookie carries a stale
   * id (DB wipe, fresh migration, branch swap) the parent caller can
   * rotate the cookie before the next save attempt — saves are FK-bound
   * to devices and would otherwise fail with a constraint error.
   */
  async deviceExists(deviceId: string): Promise<boolean> {
    const row = await this.db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.id, deviceId))
      .get();
    return row !== undefined;
  }

  async list(deviceId: string): Promise<SaveRow[]> {
    const rows = await this.db
      .select({
        id: saves.id,
        slotName: saves.slotName,
        summary: saves.summary,
        updatedAt: saves.updatedAt
      })
      .from(saves)
      .where(eq(saves.deviceId, deviceId))
      .orderBy(desc(saves.updatedAt))
      .all();
    return rows;
  }

  async load(deviceId: string, slotName: string): Promise<GameState | null> {
    const row = await this.db
      .select({ gameState: saves.gameState })
      .from(saves)
      .where(and(eq(saves.deviceId, deviceId), eq(saves.slotName, slotName)))
      .get();
    if (!row) return null;
    try {
      return deserialize(row.gameState);
    } catch (err) {
      // A corrupt or schema-drifted slot must not throw a 500 from every
      // game action that loads it. Treat it as absent — no save migration
      // is supported, so an unreadable save is simply gone.
      console.warn(`[saves] dropping unreadable slot "${slotName}": ${(err as Error).message}`);
      return null;
    }
  }

  /** A slot name not yet used by this device, suffixing " (2)", " (3)"…
   *  so two journeys started the same calendar day don't silently
   *  overwrite each other through the save upsert. */
  async uniqueSlotName(deviceId: string, base: string): Promise<string> {
    const taken = new Set((await this.list(deviceId)).map((r) => r.slotName));
    if (!taken.has(base)) return base;
    for (let n = 2; n < 1000; n++) {
      const candidate = `${base} (${n})`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${base} (${Date.now()})`;
  }

  async save(deviceId: string, slotName: string, state: GameState): Promise<void> {
    const now = new Date();
    const gameState = serialize(state);
    const summary = buildSummary(state);
    await this.db
      .insert(saves)
      .values({
        id: randomUUID(),
        deviceId,
        slotName,
        gameState,
        summary,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [saves.deviceId, saves.slotName],
        set: { gameState, summary, updatedAt: now }
      })
      .run();
  }

  async delete(deviceId: string, slotName: string): Promise<void> {
    await this.db
      .delete(saves)
      .where(and(eq(saves.deviceId, deviceId), eq(saves.slotName, slotName)))
      .run();
  }

  /** #1181 — store anonymous playtester feedback. deviceId is optional
   *  so the form still works when the cookie is missing. body is required
   *  and clamped to 4000 chars at the caller. */
  async saveFeedback(input: {
    deviceId: string | null;
    body: string;
    pageUrl: string | null;
    userAgent: string | null;
  }): Promise<void> {
    await this.db.insert(feedback).values(input).run();
  }
}
