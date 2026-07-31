const { resolveClientTier } = require('../config/tiers');
const { defaultStore } = require('../services/slidingWindowStore');
const { defaultCollector } = require('../services/analyticsCollector');

/**
 * Express Rate Limiting Middleware using Sliding Window Counter algorithm
 */
function createRateLimiter(options = {}) {
  const store = options.store || defaultStore;
  const collector = options.collector || defaultCollector;

  return async function rateLimiterMiddleware(req, res, next) {
    const startTime = process.hrtime();
    const apiKey = req.headers['x-api-key'] || req.query['api_key'];
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Resolve client tier & window limit
    const clientInfo = resolveClientTier(apiKey, clientIp);
    const { identifier, limit, windowMs, tierKey, tierName } = clientInfo;

    try {
      // Execute atomic sliding window check
      const result = await store.incrementAndCheck(identifier, limit, windowMs);

      // Attach RFC standard rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);
      res.setHeader('X-RateLimit-Tier', tierKey);

      // Function to calculate request duration in milliseconds
      const getLatencyMs = () => {
        const diff = process.hrtime(startTime);
        return diff[0] * 1000 + diff[1] / 1e6;
      };

      if (!result.allowed) {
        // Limit breached! Set Retry-After header
        res.setHeader('Retry-After', result.retryAfter);
        const latencyMs = getLatencyMs();

        // Record metrics for throttled request
        collector.recordRequest({
          path: req.originalUrl || req.url,
          method: req.method,
          statusCode: 429,
          allowed: false,
          tierKey,
          identifier,
          latencyMs,
          remaining: result.remaining,
          limit: result.limit
        });

        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded for ${tierName}. Maximum ${limit} requests per minute allowed.`,
          tier: tierName,
          tierKey,
          limit: result.limit,
          remaining: result.remaining,
          retryAfterSeconds: result.retryAfter,
          resetTime: result.resetTime
        });
      }

      // If request passes, hook into res.on('finish') to capture final latency & stats
      res.on('finish', () => {
        const latencyMs = getLatencyMs();
        collector.recordRequest({
          path: req.originalUrl || req.url,
          method: req.method,
          statusCode: res.statusCode,
          allowed: true,
          tierKey,
          identifier,
          latencyMs,
          remaining: result.remaining,
          limit: result.limit
        });
      });

      next();
    } catch (err) {
      console.error('Rate Limiter error:', err);
      // Fail-open strategy: log error and allow request to prevent breaking application
      next();
    }
  };
}

module.exports = {
  createRateLimiter
};
