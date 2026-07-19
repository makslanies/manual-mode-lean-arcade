const DB_NAME = 'manual-mode-arcade';
const DB_VER = 2;

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

export async function saveRunResult(state: import('@/core/types').GameSnapshot): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('runs', 'readwrite');
    tx.objectStore('runs').add({
      at: Date.now(),
      money: Math.round(state.money),
      accidents: state.accidents,
      prevented: state.prevented,
      autoActs: state.autoActs,
      stat: state.stat,
      seed: state.seed,
    });
  } catch {
    /* IndexedDB optional — game continues */
  }
}

export async function saveProfile(data: Record<string, unknown>): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('profile', 'readwrite');
    tx.objectStore('profile').put(data, 'main');
  } catch {
    /* ignore */
  }
}
