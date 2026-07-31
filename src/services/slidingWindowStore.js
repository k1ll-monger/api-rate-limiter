/**
 * Memory-based Sliding Window Counter Rate Limiter Store
 * Implements atomic window sliding mathematical estimation logic.
 * Structured with clean adapter interface to swap with Redis or external stores.
 */
class SlidingWindowStore {
  constructor(cleanupIntervalMs = 60000) {
    // Data structure: Map<identifier, Map<windowId, count>>
    this.store = new Map();
    
    // Periodic garbage collector for stale window entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleWindows();
    }, cleanupIntervalMs);

    // Prevent interval from blocking node process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Increment request count and check rate limit for a client identifier
   * @param {string} identifier Unique client key (e.g. key:xyz or ip:127.0.0.1)
   * @param {number} limit Maximum allowed requests per window
   * @param {number} windowMs Window duration in milliseconds (default: 60000)
   * @param {number} [now] Current timestamp override for testing
   * @returns {object} { allowed: boolean, remaining: number, limit: number, resetTime: number, retryAfter: number, currentCount: number }
   */
  async incrementAndCheck(identifier, limit, windowMs = 60000, now = Date.now()) {
    const currentWindowId = Math.floor(now / windowMs);
    const previousWindowId = currentWindowId - 1;
    const timeElapsedInCurrentWindow = now % windowMs;
    const previousWindowWeight = (windowMs - timeElapsedInCurrentWindow) / windowMs;

    if (!this.store.has(identifier)) {
      this.store.set(identifier, new Map());
    }

    const clientWindows = this.store.get(identifier);
    const currentWindowCount = clientWindows.get(currentWindowId) || 0;
    const previousWindowCount = clientWindows.get(previousWindowId) || 0;

    // Sliding Window Counter calculation:
    // Estimated Count = Current Window Count + Previous Window Count * Weight
    const estimatedCount = currentWindowCount + (previousWindowCount * previousWindowWeight);

    // Reset timestamp (epoch seconds) for current window completion
    const resetTimeSeconds = Math.ceil(((currentWindowId + 1) * windowMs) / 1000);
    const timeRemainingInWindowMs = windowMs - timeElapsedInCurrentWindow;
    const retryAfterSeconds = Math.max(1, Math.ceil(timeRemainingInWindowMs / 1000));

    // Check if adding 1 request breaches limit
    if (Math.floor(estimatedCount) + 1 > limit) {
      const remaining = Math.max(0, limit - Math.floor(estimatedCount));
      return {
        allowed: false,
        limit,
        remaining,
        resetTime: resetTimeSeconds,
        retryAfter: retryAfterSeconds,
        estimatedCount: Math.round(estimatedCount * 100) / 100
      };
    }

    // Limit not breached: increment count in current window
    const newCurrentCount = currentWindowCount + 1;
    clientWindows.set(currentWindowId, newCurrentCount);

    const newEstimatedCount = newCurrentCount + (previousWindowCount * previousWindowWeight);
    const remaining = Math.max(0, limit - Math.floor(newEstimatedCount));

    return {
      allowed: true,
      limit,
      remaining,
      resetTime: resetTimeSeconds,
      retryAfter: 0,
      estimatedCount: Math.round(newEstimatedCount * 100) / 100
    };
  }

  /**
   * Periodically remove window records older than 2 window cycles to prevent memory leaks
   */
  cleanupStaleWindows(now = Date.now(), windowMs = 60000) {
    const minKeepWindowId = Math.floor(now / windowMs) - 1;

    for (const [identifier, windows] of this.store.entries()) {
      for (const windowId of windows.keys()) {
        if (windowId < minKeepWindowId) {
          windows.delete(windowId);
        }
      }
      if (windows.size === 0) {
        this.store.delete(identifier);
      }
    }
  }

  /**
   * Clear all records (useful for testing or store resets)
   */
  async clear() {
    this.store.clear();
  }
}

// Singleton instance
const defaultStore = new SlidingWindowStore();

module.exports = {
  SlidingWindowStore,
  defaultStore
};
