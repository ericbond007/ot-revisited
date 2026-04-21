import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { devices, saves } from './schema';
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
    return deserialize(row.gameState);
  }

  async save(deviceId: string, slotName: string, state: GameState): Promise<void> {
    const now = new Date();
    const gameState = serialize(state);
    const summary = buildSummary(state);
    const existing = await this.db
      .select({ id: saves.id })
      .from(saves)
      .where(and(eq(saves.deviceId, deviceId), eq(saves.slotName, slotName)))
      .get();
    if (existing) {
      await this.db
        .update(saves)
        .set({ gameState, summary, updatedAt: now })
        .where(eq(saves.id, existing.id))
        .run();
    } else {
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
        .run();
    }
  }

  async delete(deviceId: string, slotName: string): Promise<void> {
    await this.db
      .delete(saves)
      .where(and(eq(saves.deviceId, deviceId), eq(saves.slotName, slotName)))
      .run();
  }
}
