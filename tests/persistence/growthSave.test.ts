import { describe, expect, it } from 'vitest';
import { freshState } from '../helpers';
import { unlockGrowth } from '@/domain/org/OrgController';
import { purchaseItem } from '@/domain/shop/ShopController';
import { assignEmployee } from '@/domain/org/OrgController';
import {
  SAVE_SCHEMA_VERSION,
  applyGrowthSlice,
  migratePayload,
  serializeGrowthSlice,
} from '@/persistence/growthSave';

describe('growth persistence round-trip', () => {
  it('restores org, growth, events, and money', () => {
    const state = freshState(7);
    unlockGrowth(state);
    state.money = 9000;
    purchaseItem(state, 'hire_operator');
    const emp = state.org.employees[0];
    assignEmployee(state, emp.id, 'machine');

    const payload = serializeGrowthSlice(state);
    const restored = freshState(7);
    applyGrowthSlice(restored, payload);

    expect(restored.org.employees).toHaveLength(1);
    expect(restored.growth.unlocked).toBe(true);
    expect(restored.money).toBe(state.money);
    expect(restored.events.length).toBeGreaterThan(0);
    expect(restored.org.employees[0].zoneId).toBe('machine');
  });

  it('serialize resets transient UI state', () => {
    const state = freshState(3);
    unlockGrowth(state);
    state.growth.ui.shopOpen = true;
    state.growth.ui.panel = 'org';
    const payload = serializeGrowthSlice(state);
    expect(payload.growth.ui.shopOpen).toBe(false);
    expect(payload.growth.ui.panel).toBeNull();
    expect(payload.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
  });

  it('negative: migratePayload rejects invalid shapes', () => {
    expect(migratePayload(null)).toBeNull();
    expect(migratePayload({ schemaVersion: 1 })).toBeNull();
    expect(migratePayload({ schemaVersion: 2, org: {}, growth: null })).toBeNull();
  });

  it('happy path: migratePayload accepts v2 payload', () => {
    const state = freshState(5);
    unlockGrowth(state);
    const payload = serializeGrowthSlice(state);
    expect(migratePayload(payload)?.seed).toBe(5);
  });

  it('boundary: applyGrowthSlice tolerates missing optional fields', () => {
    const restored = freshState(1);
    applyGrowthSlice(restored, {
      schemaVersion: 2,
      seed: 1,
      savedAt: 0,
      org: undefined as unknown as import('@/domain/org/types').OrgState,
      growth: undefined as unknown as import('@/domain/org/types').GrowthState,
      events: undefined as unknown as [],
      money: undefined as unknown as number,
      commandJournal: undefined as unknown as string[],
    });
    expect(restored.org.employees).toHaveLength(0);
    expect(restored.growth.unlocked).toBe(false);
    expect(restored.events).toHaveLength(0);
  });
});
