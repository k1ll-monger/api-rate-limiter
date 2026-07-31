/**
 * Analytics Collector Service
 * Tracks real-time traffic statistics, latencies, rate-limit breaches, and rolling metrics.
 */
class AnalyticsCollector {
  constructor() {
    this.totalRequests = 0;
    this.allowedRequests = 0;
    this.throttledRequests = 0;
    
    // Latency metrics
    this.latencyHistory = []; // stores recent latencies (ms)
    this.maxLatencyHistorySize = 100;
    
    // Tier breakdowns
    this.tierStats = {
      anonymous: { total: 0, allowed: 0, throttled: 0 },
      free: { total: 0, allowed: 0, throttled: 0 },
      pro: { total: 0, allowed: 0, throttled: 0 },
      enterprise: { total: 0, allowed: 0, throttled: 0 }
    };

    // Rolling second-by-second traffic data for live Chart.js streaming (last 60 seconds)
    // Map<secondTimestamp, { timestamp, allowed, throttled } >
    this.timeSeries = new Map();
    this.maxTimeSeriesSeconds = 60;

    // Recent activity audit log for UI Inspector (last 50 requests)
    this.recentLogs = [];
    this.maxLogSize = 50;

    // System uptime start time
    this.startTime = Date.now();
  }

  /**
   * Record a request outcome
   */
  recordRequest({
    path,
    method,
    statusCode,
    allowed,
    tierKey,
    identifier,
    latencyMs,
    remaining,
    limit
  }) {
    this.totalRequests++;

    if (allowed) {
      this.allowedRequests++;
    } else {
      this.throttledRequests++;
    }

    // Record latency
    if (typeof latencyMs === 'number' && latencyMs >= 0) {
      this.latencyHistory.push(latencyMs);
      if (this.latencyHistory.length > this.maxLatencyHistorySize) {
        this.latencyHistory.shift();
      }
    }

    // Record tier stats
    if (!this.tierStats[tierKey]) {
      this.tierStats[tierKey] = { total: 0, allowed: 0, throttled: 0 };
    }
    this.tierStats[tierKey].total++;
    if (allowed) {
      this.tierStats[tierKey].allowed++;
    } else {
      this.tierStats[tierKey].throttled++;
    }

    // Record per-second time series bucket
    const currentSecond = Math.floor(Date.now() / 1000);
    if (!this.timeSeries.has(currentSecond)) {
      this.timeSeries.set(currentSecond, {
        timestamp: currentSecond,
        timeLabel: new Date(currentSecond * 1000).toLocaleTimeString(),
        allowed: 0,
        throttled: 0,
        total: 0
      });
    }

    const secData = this.timeSeries.get(currentSecond);
    secData.total++;
    if (allowed) {
      secData.allowed++;
    } else {
      secData.throttled++;
    }

    // Prune time series older than maxTimeSeriesSeconds
    const minSecond = currentSecond - this.maxTimeSeriesSeconds;
    for (const secKey of this.timeSeries.keys()) {
      if (secKey < minSecond) {
        this.timeSeries.delete(secKey);
      }
    }

    // Add to recent activity log
    const logItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString(),
      method,
      path,
      statusCode,
      allowed,
      tierKey,
      identifier,
      latencyMs: Math.round(latencyMs * 100) / 100,
      remaining,
      limit
    };

    this.recentLogs.unshift(logItem);
    if (this.recentLogs.length > this.maxLogSize) {
      this.recentLogs.pop();
    }
  }

  /**
   * Get average latency over the recent history
   */
  getAverageLatency() {
    if (this.latencyHistory.length === 0) return 0;
    const sum = this.latencyHistory.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / this.latencyHistory.length) * 10) / 10;
  }

  /**
   * Get structured time-series data for line chart
   */
  getTimeSeriesData() {
    const currentSecond = Math.floor(Date.now() / 1000);
    const result = [];

    // Ensure continuous 60-second window even if no traffic occurred in some seconds
    for (let i = this.maxTimeSeriesSeconds - 1; i >= 0; i--) {
      const sec = currentSecond - i;
      if (this.timeSeries.has(sec)) {
        result.push(this.timeSeries.get(sec));
      } else {
        result.push({
          timestamp: sec,
          timeLabel: new Date(sec * 1000).toLocaleTimeString(),
          allowed: 0,
          throttled: 0,
          total: 0
        });
      }
    }

    return result;
  }

  /**
   * Get complete metrics dashboard snapshot
   */
  getMetrics() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const avgLatency = this.getAverageLatency();
    const passRatio = this.totalRequests > 0
      ? Math.round((this.allowedRequests / this.totalRequests) * 1000) / 10
      : 100;
    const blockRatio = this.totalRequests > 0
      ? Math.round((this.throttledRequests / this.totalRequests) * 1000) / 10
      : 0;

    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      throttledRequests: this.throttledRequests,
      passRatio,
      blockRatio,
      averageLatencyMs: avgLatency,
      uptimeSeconds,
      tierStats: this.tierStats,
      timeSeries: this.getTimeSeriesData(),
      recentLogs: this.recentLogs
    };
  }

  /**
   * Reset stats (useful for demo & testing)
   */
  resetMetrics() {
    this.totalRequests = 0;
    this.allowedRequests = 0;
    this.throttledRequests = 0;
    this.latencyHistory = [];
    this.timeSeries.clear();
    this.recentLogs = [];
    this.startTime = Date.now();
    for (const key of Object.keys(this.tierStats)) {
      this.tierStats[key] = { total: 0, allowed: 0, throttled: 0 };
    }
  }
}

// Singleton instance
const defaultCollector = new AnalyticsCollector();

module.exports = {
  AnalyticsCollector,
  defaultCollector
};
