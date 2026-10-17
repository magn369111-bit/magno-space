// Persistência local: IndexedDB com reserva em localStorage.
// Os dados nunca saem do aparelho.

import { createInitialState, normalizeState } from "./domain.js";

const DB_NAME = "magno-space-db";
const STORE_NAME = "state";
const STATE_KEY = "app-state";
const FALLBACK_KEY = "magno-space-state";

let dbPromise = null;
let queue = Promise.resolve(true);

export function migrateState(raw) {
  return normalizeState(raw);
}

export async function loadState() {
  const candidates = [await readIndexedDb(), readFallback()].filter(Boolean);
  if (!candidates.length) return createInitialState();
  candidates.sort((a, b) => b.savedAt - a.savedAt);
  return normalizeState(candidates[0].state);
}

// Gravações são enfileiradas para nunca chegarem fora de ordem.
export function saveState(state) {
  const snapshot = { savedAt: Date.now(), state: JSON.parse(JSON.stringify(state)) };
  queue = queue.then(() => write(snapshot), () => write(snapshot));
  return queue;
}

export async function wipeState() {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(STATE_KEY);
    await txDone(tx);
  } catch {
    /* sem IndexedDB: só o localStorage importa */
  }
  try {
    localStorage.removeItem(FALLBACK_KEY);
  } catch {
    /* armazenamento bloqueado */
  }
}

async function write(snapshot) {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(snapshot, STATE_KEY);
    await txDone(tx);
    return true;
  } catch {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(snapshot));
      return true;
    } catch {
      return false;
    }
  }
}

async function readIndexedDb() {
  try {
    const db = await getDb();
    const saved = await requestToPromise(db.transaction(STORE_NAME).objectStore(STORE_NAME).get(STATE_KEY));
    return wrap(saved);
  } catch {
    return null;
  }
}

function readFallback() {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? wrap(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

// Aceita o formato novo ({ savedAt, state }) e o antigo (estado solto, da versão 1).
function wrap(value) {
  if (!value || typeof value !== "object") return null;
  if (value.state && typeof value.savedAt === "number") return value;
  return { savedAt: 0, state: value };
}

function getDb() {
  dbPromise ||= openDb().catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB indisponível"));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
