import { MMKV } from 'react-native-mmkv';

/**
 * Single shared MMKV instance for the app.
 *
 * Why MMKV instead of AsyncStorage: see the storage note in the migration plan.
 *
 *  - src/context/LanguageContext.jsx (web) reads `localStorage.getItem('appLanguage')`
 *    SYNCHRONOUSLY inside a useState initializer, on first render, before paint. AsyncStorage
 *    is async by design — swapping it in naively means the language-selection modal would
 *    flash open on every launch (since `language` starts null while the async read is still
 *    in flight), even for a returning user who already picked a language. MMKV's get/set
 *    calls are synchronous (JSI-backed), so `storage.getString('appLanguage')` can run inside
 *    a useState initializer exactly like localStorage.getItem did on web — no flash, no
 *    extra bootstrap/loading gate needed.
 *
 *  - src/data/mockBookings.js (web) is a module-level mutable singleton:
 *    `export let mockBookings = loadStoredBookings()` runs at import time, synchronously
 *    reading the `sahakar_bookings` localStorage key. Same constraint applies.
 *
 * react-native-mmkv v3.3.3 is a pure C++ TurboModule (requires New Architecture, which this
 * project already has) — not a Nitro Module. Deliberately pinned to v3.3.3 rather than v4.x:
 * v4 is a full rewrite onto react-native-nitro-modules, which pulls in a second native
 * codegen/build pipeline on top of the one already fixed for this project's Windows/space-in-
 * username toolchain issue (see MIGRATION_NOTES.md). v3 has no such extra dependency and the
 * synchronous get/set/contains/delete API used here is identical between v3 and v4.
 */
export const storage = new MMKV();

/**
 * Thin key-based helpers mirroring the localStorage.getItem/setItem/removeItem shape used
 * throughout the web app, so callers porting web code 1:1 (LanguageContext, mockBookings)
 * don't need to learn a different API surface.
 */
export function getString(key) {
  return storage.getString(key) ?? null;
}

export function setString(key, value) {
  storage.set(key, value);
}

export function getJSON(key) {
  const raw = storage.getString(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Mirrors web behaviour where a corrupt/foreign localStorage value would throw inside
    // JSON.parse at call sites — fail soft to null instead, since a crash-on-launch from a
    // bad persisted value would be strictly worse on mobile than it was on web.
    return null;
  }
}

export function setJSON(key, value) {
  storage.set(key, JSON.stringify(value));
}

export function removeItem(key) {
  storage.delete(key);
}
