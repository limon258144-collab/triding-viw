import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'trading_platform_db';
const STORE_NAME = 'candle_history';
const VERSION = 1;

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  assetId: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: ['assetId', 'time'],
          });
          store.createIndex('assetId', 'assetId', { unique: false });
          store.createIndex('time', 'time', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export const dbService = {
  async saveCandle(candle: Candle) {
    const db = await getDB();
    await db.put(STORE_NAME, candle);
  },

  async saveCandles(candles: Candle[]) {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all([
      ...candles.map(candle => tx.store.put(candle)),
      tx.done,
    ]);
  },

  async getHistory(assetId: string, limit = 1000) {
    const db = await getDB();
    const index = db.transaction(STORE_NAME).store.index('assetId');
    const range = IDBKeyRange.only(assetId);
    let cursor = await index.openCursor(range, 'prev');
    
    const results: Candle[] = [];
    while (cursor && results.length < limit) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return results.sort((a, b) => a.time - b.time);
  },

  async clearHistory(assetId: string) {
    const db = await getDB();
    const index = db.transaction(STORE_NAME, 'readwrite').store.index('assetId');
    const range = IDBKeyRange.only(assetId);
    let cursor = await index.openCursor(range);
    
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  },

  async pruneHistory(assetId: string, keepCount = 1000) {
    const db = await getDB();
    const index = db.transaction(STORE_NAME, 'readwrite').store.index('assetId');
    const range = IDBKeyRange.only(assetId);
    let cursor = await index.openCursor(range, 'prev');
    
    let count = 0;
    while (cursor) {
      count++;
      if (count > keepCount) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
  }
};
