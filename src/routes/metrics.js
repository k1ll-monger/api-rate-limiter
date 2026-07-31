const express = require('express');
const router = express.Router();
const { defaultCollector } = require('../services/analyticsCollector');
const { defaultStore } = require('../services/slidingWindowStore');
const { TIERS, API_KEYS } = require('../config/tiers');

/**
 * GET /api/v1/metrics
 * Returns real-time metrics data for dashboard UI
 */
router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    data: defaultCollector.getMetrics()
  });
});

/**
 * POST /api/v1/metrics/reset
 * Resets all collected metrics and rate limiter state (useful for live demo reset)
 */
router.post('/metrics/reset', async (req, res) => {
  defaultCollector.resetMetrics();
  await defaultStore.clear();
  res.json({
    success: true,
    message: 'Metrics and rate limiter memory store reset successfully'
  });
});

/**
 * GET /api/v1/tiers
 * Returns available tiers & keys for frontend controls
 */
router.get('/tiers', (req, res) => {
  res.json({
    success: true,
    tiers: TIERS,
    apiKeys: API_KEYS
  });
});

module.exports = router;
