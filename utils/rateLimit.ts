import { NextRequest } from 'next/server';
import { SECURITY_CONFIG } from '@/config/security';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number,
    private maxRequests: number,
    private cleanupIntervalMs: number = 60 * 1000 // 1 minute
  ) {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  public isAllowed(key: string): { allowed: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.store.set(key, newEntry);
      return {
        allowed: true,
        resetTime: newEntry.resetTime,
        remaining: this.maxRequests - 1,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        resetTime: entry.resetTime,
        remaining: 0,
      };
    }

    entry.count++;
    return {
      allowed: true,
      resetTime: entry.resetTime,
      remaining: this.maxRequests - entry.count,
    };
  }

  public reset(key: string): void {
    this.store.delete(key);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

export const authRateLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMIT.AUTH.WINDOW_MS,
  SECURITY_CONFIG.RATE_LIMIT.AUTH.MAX_REQUESTS,
  60 * 1000 // 1 minute
);

export const generalRateLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMIT.GENERAL.WINDOW_MS,
  SECURITY_CONFIG.RATE_LIMIT.GENERAL.MAX_REQUESTS,
  60 * 1000 // 1 minute
);

export const uploadRateLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMIT.UPLOAD.WINDOW_MS,
  SECURITY_CONFIG.RATE_LIMIT.UPLOAD.MAX_REQUESTS,
  30 * 1000 // 30 seconds
);

/**
 * Gets client IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP.trim();
  }

  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  return 'unknown';
}

/**
 * Middleware function for rate limiting
 */
export function createRateLimitMiddleware(rateLimiter: RateLimiter) {
  return async (request: NextRequest) => {
    const ip = getClientIP(request);
    const key = `${ip}:${request.nextUrl.pathname}`;
    
    const result = rateLimiter.isAllowed(key);
    
    if (!result.allowed) {
      return {
        allowed: false,
        resetTime: result.resetTime,
        remaining: result.remaining,
      };
    }
    
    return {
      allowed: true,
      resetTime: result.resetTime,
      remaining: result.remaining,
    };
  };
}

/**
 * HTTP headers for rate limiting
 */
export function getRateLimitHeaders(resetTime: number, remaining: number, limit?: number) {
  const limitValue = limit || SECURITY_CONFIG.RATE_LIMIT.GENERAL.MAX_REQUESTS;
  return {
    'X-RateLimit-Limit': limitValue.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetTime).toUTCString(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
  };
}