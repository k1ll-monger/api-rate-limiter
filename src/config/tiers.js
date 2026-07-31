/**
 * API Key Tiers and Rate Limit Definitions
 */
const TIERS = {
  anonymous: {
    name: 'Anonymous (IP Fallback)',
    limit: 15,
    windowMs: 60 * 1000, // 1 minute
  },
  free: {
    name: 'Free Tier',
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  pro: {
    name: 'Pro Tier',
    limit: 50,
    windowMs: 60 * 1000, // 1 minute
  },
  enterprise: {
    name: 'Enterprise Tier',
    limit: 200,
    windowMs: 60 * 1000, // 1 minute
  }
};

/**
 * Pre-configured API keys for quick testing
 */
const API_KEYS = {
  'key-free-123': 'free',
  'key-pro-456': 'pro',
  'key-enterprise-789': 'enterprise'
};

/**
 * Resolve client tier and limit rules based on x-api-key header or client IP
 * @param {string|undefined} apiKey Header value x-api-key
 * @returns {object} { tierName, limit, windowMs, identifier }
 */
function resolveClientTier(apiKey, clientIp) {
  if (apiKey && API_KEYS[apiKey]) {
    const tierName = API_KEYS[apiKey];
    const tierConfig = TIERS[tierName];
    return {
      tierKey: tierName,
      tierName: tierConfig.name,
      limit: tierConfig.limit,
      windowMs: tierConfig.windowMs,
      identifier: `key:${apiKey}`
    };
  }

  // Fallback to IP-based rate limiting
  const tierConfig = TIERS.anonymous;
  return {
    tierKey: 'anonymous',
    tierName: tierConfig.name,
    limit: tierConfig.limit,
    windowMs: tierConfig.windowMs,
    identifier: `ip:${clientIp || '127.0.0.1'}`
  };
}

module.exports = {
  TIERS,
  API_KEYS,
  resolveClientTier
};
