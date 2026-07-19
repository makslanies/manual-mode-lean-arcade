import type { GameSnapshot } from '@/core/types';
import type { GrowthState, OrgState } from '@/domain/org/types';
import { createInitialGrowth, createInitialOrg } from '@/domain/org/OrgController';
import { normalizeEmployee } from '@/domain/org/Employee';
import { syncEventCounter } from '@/domain/economy/EventJournal';

export const SAVE_SCHEMA_VERSION = 2;

export interface GrowthSavePayload {
  schemaVersion: number;
  seed: number;
  savedAt: number;
  org: OrgState;
  growth: GrowthState;
  events: GameSnapshot['events'];
  money: number;
  commandJournal: string[];
}

export function serializeGrowthSlice(state: GameSnapshot): GrowthSavePayload {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed: state.seed,
    savedAt: Date.now(),
    org: structuredClone(state.org),
    growth: {
      ...structuredClone(state.growth),
      ui: { shopOpen: false, panel: null, hireItemId: null, selectedCategory: 'personnel' },
    },
    events: structuredClone(state.events),
    money: state.money,
    commandJournal: [...state.commandJournal],
  };
}

export function applyGrowthSlice(state: GameSnapshot, payload: GrowthSavePayload): void {
  state.org = payload.org ?? createInitialOrg();
  for (const emp of state.org.employees) normalizeEmployee(emp);
  state.growth = payload.growth ?? createInitialGrowth();
  state.growth.ui = { shopOpen: false, panel: null, hireItemId: null, selectedCategory: 'personnel' };
  state.events = payload.events ?? [];
  syncEventCounter(state.events);
  if (typeof payload.money === 'number') state.money = payload.money;
  if (Array.isArray(payload.commandJournal)) state.commandJournal = payload.commandJournal;
}

export function migratePayload(raw: unknown): GrowthSavePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<GrowthSavePayload>;
  if (data.schemaVersion === 2 && data.org && data.growth) {
    return data as GrowthSavePayload;
  }
  return null;
}
