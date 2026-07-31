const express = require('express');
const cors = require('cors');
const path = require('path');
const { createRateLimiter } = require('./src/middleware/rateLimiter');
const apiRoutes = require('./src/routes/api');
const metricsRoutes = require('./src/routes/metrics');

const app = express();
const PORT = process.env.PORT || 3000;

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for IP address resolution (essential when running behind reverse proxies / Replit)
app.set('trust proxy', true);

// Serve static frontend assets from /public directory
app.use(express.static(path.join(__dirname, 'public')));

// Unprotected Metrics & System Routes for Frontend Dashboard
app.use('/api/v1', metricsRoutes);

// Protect API Endpoints with Sliding Window Rate Limiter Middleware
app.use('/api/v1', createRateLimiter(), apiRoutes);

// Fallback route for SPA dashboard
app.get('*', (req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint Not Found' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 API Rate Limiter & Analytics Dashboard Service`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📊 Dashboard UI:     http://localhost:${PORT}/`);
  console.log(`⚡ Metrics API:       http://localhost:${PORT}/api/v1/metrics`);
  console.log(`=======================================================`);
});
