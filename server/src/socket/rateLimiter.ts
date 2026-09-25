import { RATE_LIMITS, type RateLimitBucket } from '@bluffsketch/shared';

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/** Per-socket token buckets. */
export class RateLimiter {
  private readonly buckets = new Map<RateLimitBucket, Bucket>();

  consume(kind: RateLimitBucket, now = Date.now()): boolean {
    const { capacity, refillPerSec } = RATE_LIMITS[kind];
    const bucket = this.buckets.get(kind) ?? { tokens: capacity, updatedAt: now };
    bucket.tokens = Math.min(capacity, bucket.tokens + ((now - bucket.updatedAt) / 1000) * refillPerSec);
    bucket.updatedAt = now;
    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.buckets.set(kind, bucket);
    return allowed;
  }
}
