import type { GameSnapshot } from '@/core/types';
import {
  applyGrowthSlice,
  migratePayload,
  serializeGrowthSlice,
  type GrowthSavePayload,
} from './growthSave';

const DB_NAME = 'manual-mode-arcade';
const DB_VER = 2;
const GROWTH_KEY = 'growth_v2';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      const oldVer = ev.oldVersion;
      if (!db.objectStoreNames.contains('profile')) db.createObjectStore('profile');
      if (!db.objectStoreNames.contains('runs')) db.createObjectStore('runs', { autoIncrement: true });
      if (oldVer < 2 && !db.objectStoreNames.contains('growth')) {
        db.createObjectStore('growth');
      }
    };
  });
}

export async function saveGrowthState(state: GameSnapshot): Promise<void> {
  if (!state.growth.unlocked) return;
  try {
    const db = await openDb();
    const payload = serializeGrowthSlice(state);
    const tx = db.transaction('growth', 'readwrite');
    tx.objectStore('growth').put(payload, GROWTH_KEY);
  } catch {
    /* optional persistence */
  }
}

export async function loadGrowthState(state: GameSnapshot): Promise<boolean> {
  try {
    const db = await openDb();
    const tx = db.transaction('growth', 'readonly');
    const raw = await new Promise<unknown>((resolve, reject) => {
      const req = tx.objectStore('growth').get(GROWTH_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const payload = migratePayload(raw);
    if (!payload) return false;
    applyGrowthSlice(state, payload);
    return true;
  } catch {
    return false;
  }
}

export async function clearGrowthState(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('growth', 'readwrite');
    tx.objectStore('growth').delete(GROWTH_KEY);
  } catch {
    /* ignore */
  }
}

export type { GrowthSavePayload };
