/** Storage can throw (private mode, blocked cookies), so every access is guarded. */
function safe<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

export function readJson<T>(store: 'local' | 'session', key: string): T | null {
  return safe(() => {
    const raw = (store === 'local' ? localStorage : sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }, null);
}

export function writeJson(store: 'local' | 'session', key: string, value: unknown): void {
  safe(() => (store === 'local' ? localStorage : sessionStorage).setItem(key, JSON.stringify(value)), undefined);
}

export function removeKey(store: 'local' | 'session', key: string): void {
  safe(() => (store === 'local' ? localStorage : sessionStorage).removeItem(key), undefined);
}
