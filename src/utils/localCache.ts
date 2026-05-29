type CacheEnvelope<T> = {
  expiresAt: number;
  value: T;
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function getCache<T>(key: string): T | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;

    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  if (!canUseStorage()) {
    return;
  }

  const envelope: CacheEnvelope<T> = {
    expiresAt: Date.now() + ttlMs,
    value,
  };

  window.localStorage.setItem(key, JSON.stringify(envelope));
}

export function removeCache(key: string) {
  if (canUseStorage()) {
    window.localStorage.removeItem(key);
  }
}
