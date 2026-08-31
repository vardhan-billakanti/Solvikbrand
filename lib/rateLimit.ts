interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  rateLimitStore: Map<string, RateLimitEntry> | undefined;
};

// Use global store so it can be managed cleanly
const store = globalForRateLimit.rateLimitStore ?? new Map<string, RateLimitEntry>();
if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.rateLimitStore = store;
}

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

export function clearAllRateLimits(): void {
  store.clear();
}

export function isLocalhost(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.')
  );
}

// Pre-configured rate limiters
export const loginRateLimit = (ip: string) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const isLocal = isLocalhost(ip);

  // In development for local testing, allow higher threshold (30 attempts)
  // In production, strictly enforce 5 attempts per 15 minutes for brute-force defense
  const maxRequests = isDev && isLocal ? 30 : 5;
  const windowMs = isDev && isLocal ? 2 * 60 * 1000 : 15 * 60 * 1000;

  return checkRateLimit(`login:${ip}`, { maxRequests, windowMs });
};

export const resetLoginRateLimit = (ip: string) => {
  resetRateLimit(`login:${ip}`);
  // Also clean any variations of localhost
  if (isLocalhost(ip)) {
    resetRateLimit('login:127.0.0.1');
    resetRateLimit('login:::1');
    resetRateLimit('login:::ffff:127.0.0.1');
    resetRateLimit('login:localhost');
  }
};

export const visitSubmitRateLimit = (ip: string) =>
  checkRateLimit(`visit:${ip}`, { maxRequests: 30, windowMs: 60 * 60 * 1000 });

export const apiRateLimit = (ip: string) =>
  checkRateLimit(`api:${ip}`, { maxRequests: 100, windowMs: 60 * 1000 });
