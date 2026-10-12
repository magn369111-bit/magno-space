import { createInitialState, SCHEMA_VERSION } from "./domain.js";
import { initialQuotes } from "./quotes.js";

const DB_NAME = "magno-space-db";
const STORE_NAME = "state";
const STATE_KEY = "app-state";
const FALLBACK_KEY = "magno-space-state";

export async function loadState() {
  try {
    const db = await openDb();
    const saved = await requestToPromise(db.transaction(STORE_NAME).objectStore(STORE_NAME).get(STATE_KEY));
    return migrateState(saved || createInitialState(initialQuotes));
  } catch {
    const saved = localStorage.getItem(FALLBACK_KEY);
    return migrateState(saved ? JSON.parse(saved) : createInitialState(initialQuotes));
  }
}

export async function saveState(state) {
  const prepared = migrateState(state);
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(prepared, STATE_KEY);
    await txDone(tx);
  } catch {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(prepared));
  }
}

export function migrateState(state) {
  const base = createInitialState(initialQuotes);
  const merged = {
    ...base,
    ...state,
    settings: { ...base.settings, ...(state?.settings || {}) },
    favorites: { ...base.favorites, ...(state?.favorites || {}) },
    ui: { ...base.ui, ...(state?.ui || {}) }
  };

  merged.schemaVersion = SCHEMA_VERSION;
  merged.quotes = Array.isArray(merged.quotes) && merged.quotes.length ? merged.quotes : initialQuotes;
  merged.tasks = Array.isArray(merged.tasks) ? merged.tasks : [];
  merged.daily = merged.daily && typeof merged.daily === "object" ? merged.daily : {};
  merged.workouts = Array.isArray(merged.workouts) ? merged.workouts : [];
  merged.notes = Array.isArray(merged.notes) ? merged.notes : [];
  merged.quoteHistory = merged.quoteHistory && typeof merged.quoteHistory === "object" ? merged.quoteHistory : {};
  return merged;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB indisponivel"));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
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
