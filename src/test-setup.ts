/**
 * `localStorage` is a lie under Vitest + jsdom.
 *
 * Vitest copies the jsdom window's keys onto `globalThis`, but `window` ends up
 * as a plain object rather than a jsdom `Window`, so jsdom's `localStorage`
 * accessor resolves to `undefined` — `'localStorage' in window` is true, the
 * own property exists, and its value is `undefined`. Node 26 makes it worse by
 * adding its own experimental `localStorage` global that throws unless the
 * process was started with `--localstorage-file`.
 *
 * Neither one is usable, so provide a real in-memory Storage instead. It also
 * gives every test file a clean store, which is what the specs want anyway.
 */
function createStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(String(key)) ?? null,
    setItem: (key: string, value: string) => void entries.set(String(key), String(value)),
    removeItem: (key: string) => void entries.delete(String(key)),
    clear: () => entries.clear(),
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: createStorage(),
  configurable: true,
  writable: true,
})