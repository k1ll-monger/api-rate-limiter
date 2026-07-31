const express = require('express');
const router = express.Router();

/**
 * Mock Resource Endpoint: GET /api/v1/resource
 */
router.get('/resource', (req, res) => {
  // Simulate slight random processing delay (10-40ms) to give realistic latency readings
  const delay = Math.floor(Math.random() * 30) + 10;
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        id: 'res_' + Math.random().toString(36).substring(2, 9),
        name: 'Enterprise Cloud Metric Stream',
        status: 'active',
        timestamp: new Date().toISOString()
      },
      message: 'Resource retrieved successfully'
    });
  }, delay);
});

/**
 * Mock Submit Endpoint: POST /api/v1/submit
 */
router.post('/submit', (req, res) => {
  const delay = Math.floor(Math.random() * 50) + 15;
  setTimeout(() => {
    res.json({
      success: true,
      transactionId: 'tx_' + Date.now(),
      status: 'processed',
      payloadReceived: req.body || {},
      timestamp: new Date().toISOString()
    });
  }, delay);
});

/**
 * Mock Analytics Endpoint: GET /api/v1/analytics
 */
router.get('/analytics', (req, res) => {
  const delay = Math.floor(Math.random() * 25) + 5;
  setTimeout(() => {
    res.json({
      success: true,
      report: {
        activeNodes: 12,
        throughput: '1.2 GB/s',
        cpuUtilization: '24.5%',
        memoryUsage: '512 MB'
      },
      timestamp: new Date().toISOString()
    });
  }, delay);
});

module.exports = router;
