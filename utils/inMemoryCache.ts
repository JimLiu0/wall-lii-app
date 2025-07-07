type CacheValue<T> = {
  value: T;
  expiresAt: number;
};

class InMemoryCache {
  private cache = new Map<string, CacheValue<any>>();

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Export a singleton instance (per serverless invocation)
export const inMemoryCache = new InMemoryCache();