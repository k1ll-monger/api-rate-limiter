/**
 * API Rate Limiter & Real-Time Analytics Dashboard Client Script
 */
document.addEventListener('DOMContentLoaded', () => {
  // Chart & State Variables
  let trafficChart = null;
  let normalTrafficInterval = null;
  let burstTrafficInterval = null;
  let currentNormalRate = 0;
  let currentBurstRate = 0;

  // DOM Elements
  const statTotalRequests = document.getElementById('statTotalRequests');
  const statPassedRatio = document.getElementById('statPassedRatio');
  const statBlockedCount = document.getElementById('statBlockedCount');
  const statAvgLatency = document.getElementById('statAvgLatency');
  const latencyBadge = document.getElementById('latencyBadge');
  const latencyStatusText = document.getElementById('latencyStatusText');
  const logsTableBody = document.getElementById('logsTableBody');
  const resetMetricsBtn = document.getElementById('resetMetricsBtn');

  // Simulator Controls
  const simApiKeySelect = document.getElementById('simApiKeySelect');
  const simEndpointSelect = document.getElementById('simEndpointSelect');
  const simSingleBtn = document.getElementById('simSingleBtn');
  const simNormalBtn = document.getElementById('simNormalBtn');
  const simNormalLabel = document.getElementById('simNormalLabel');
  const simBurstBtn = document.getElementById('simBurstBtn');
  const simBurstLabel = document.getElementById('simBurstLabel');
  const simStatusDot = document.getElementById('simStatusDot');
  const simStatusText = document.getElementById('simStatusText');
  const simRateText = document.getElementById('simRateText');

  /**
   * Initialize Chart.js Real-time Line Graph
   */
  function initChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    
    // Create subtle vertical gradients
    const greenGradient = ctx.createLinearGradient(0, 0, 0, 300);
    greenGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    greenGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const redGradient = ctx.createLinearGradient(0, 0, 0, 300);
    redGradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    redGradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    trafficChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Allowed (2xx)',
            data: [],
            borderColor: '#10b981',
            backgroundColor: greenGradient,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4
          },
          {
            label: 'Blocked (429)',
            data: [],
            borderColor: '#ef4444',
            backgroundColor: redGradient,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0b0f17',
            titleColor: '#94a3b8',
            bodyColor: '#f8fafc',
            borderColor: '#1e293b',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            boxPadding: 4,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${context.parsed.y} req/s`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)'
            },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              maxTicksLimit: 12
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.03)'
            },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              precision: 0
            }
          }
        }
      }
    });
  }

  /**
   * Fetch Real-Time Metrics Snapshot from Server
   */
  async function fetchMetrics() {
    try {
      const response = await fetch('/api/v1/metrics');
      if (!response.ok) return;

      const result = await response.json();
      if (result.success && result.data) {
        updateDashboard(result.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    }
  }

  /**
   * Update Dashboard UI Elements
   */
  function updateDashboard(data) {
    // 1. Update Top KPI Counters
    statTotalRequests.textContent = data.totalRequests.toLocaleString();
    statPassedRatio.textContent = `${data.passRatio}%`;
    statBlockedCount.textContent = data.throttledRequests.toLocaleString();
    statAvgLatency.textContent = data.averageLatencyMs;

    // Latency badge logic
    const avgLat = data.averageLatencyMs;
    if (avgLat < 20) {
      latencyBadge.className = 'w-2 h-2 rounded-full bg-emerald-400';
      latencyStatusText.textContent = 'Optimal (<20ms)';
    } else if (avgLat < 50) {
      latencyBadge.className = 'w-2 h-2 rounded-full bg-amber-400';
      latencyStatusText.textContent = 'Good (<50ms)';
    } else {
      latencyBadge.className = 'w-2 h-2 rounded-full bg-rose-400';
      latencyStatusText.textContent = 'High Load (>50ms)';
    }

    // 2. Update Streaming Chart
    if (trafficChart && data.timeSeries) {
      const labels = data.timeSeries.map(item => item.timeLabel);
      const allowedData = data.timeSeries.map(item => item.allowed);
      const throttledData = data.timeSeries.map(item => item.throttled);

      trafficChart.data.labels = labels;
      trafficChart.data.datasets[0].data = allowedData;
      trafficChart.data.datasets[1].data = throttledData;
      trafficChart.update('none');
    }

    // 3. Update Recent Request Logs Table
    if (data.recentLogs && data.recentLogs.length > 0) {
      renderLogsTable(data.recentLogs);
    } else {
      logsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-slate-500 font-sans">
            <i class="fa-solid fa-inbox text-xl mb-2 block text-slate-600"></i>
            No traffic logged yet. Trigger requests using the Traffic Simulator panel above.
          </td>
        </tr>
      `;
    }
  }

  /**
   * Render Request Logs Table
   */
  function renderLogsTable(logs) {
    let rowsHtml = '';

    logs.forEach(log => {
      const isAllowed = log.allowed;
      const statusBadgeClass = isAllowed
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      
      const statusIcon = isAllowed
        ? '<i class="fa-solid fa-check mr-1 text-[9px]"></i>'
        : '<i class="fa-solid fa-ban mr-1 text-[9px]"></i>';

      const statusText = isAllowed ? `${log.statusCode} OK` : `${log.statusCode} THROTTLED`;
      const methodBadgeClass = log.method === 'POST' ? 'text-amber-400 font-semibold' : 'text-cyan-400 font-semibold';

      const resetDisplay = log.retryAfter > 0
        ? `<span class="text-rose-400 font-medium">Retry in ${log.retryAfter}s</span>`
        : `<span class="text-slate-500">${new Date(log.resetTime * 1000).toLocaleTimeString()}</span>`;

      rowsHtml += `
        <tr class="hover:bg-slate-900/60 transition text-xs">
          <td class="py-2.5 px-4 text-slate-400">${log.timeFormatted}</td>
          <td class="py-2.5 px-4">
            <span class="${methodBadgeClass} mr-1.5">${log.method}</span>
            <span class="text-slate-200">${log.path}</span>
          </td>
          <td class="py-2.5 px-4">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusBadgeClass}">
              ${statusIcon}${statusText}
            </span>
          </td>
          <td class="py-2.5 px-4 text-slate-300">
            <span class="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
              ${log.tierKey}
            </span>
          </td>
          <td class="py-2.5 px-4 text-slate-300">
            <span class="${log.remaining === 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}">${log.remaining}</span>
            <span class="text-slate-500">/ ${log.limit}</span>
          </td>
          <td class="py-2.5 px-4">${resetDisplay}</td>
          <td class="py-2.5 px-4 text-right text-slate-300 font-medium">${log.latencyMs} ms</td>
        </tr>
      `;
    });

    logsTableBody.innerHTML = rowsHtml;
  }

  /**
   * Fire a single API request to test rate limiter
   */
  async function fireRequest() {
    const endpoint = simEndpointSelect.value;
    const apiKey = simApiKeySelect.value;
    const method = endpoint.includes('submit') ? 'POST' : 'GET';

    const headers = {};
    if (apiKey !== 'anonymous') {
      headers['x-api-key'] = apiKey;
    }

    const options = { method, headers };
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify({ testPayload: 'Simulator request at ' + new Date().toISOString() });
    }

    try {
      await fetch(endpoint, options);
      fetchMetrics();
    } catch (err) {
      console.error('Error firing simulated request:', err);
    }
  }

  /**
   * Traffic Simulator - Single Request Button
   */
  simSingleBtn.addEventListener('click', () => {
    fireRequest();
  });

  /**
   * Traffic Simulator - Normal (5 req/sec) Toggle
   */
  simNormalBtn.addEventListener('click', () => {
    if (normalTrafficInterval) {
      // Stop normal simulation
      clearInterval(normalTrafficInterval);
      normalTrafficInterval = null;
      currentNormalRate = 0;
      simNormalBtn.className = 'py-2 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5';
      simNormalLabel.textContent = 'Normal (5 r/s)';
    } else {
      // Stop burst if active
      if (burstTrafficInterval) simBurstBtn.click();

      // Start normal simulation (5 req/sec = 1 request every 200ms)
      currentNormalRate = 5;
      simNormalBtn.className = 'py-2 px-2.5 bg-emerald-500 text-slate-950 font-bold border border-emerald-400 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition';
      simNormalLabel.textContent = 'Stop Normal';

      normalTrafficInterval = setInterval(() => {
        fireRequest();
      }, 200);
    }

    updateSimulatorStatusBox();
  });

  /**
   * Traffic Simulator - Burst Spike (30 req/sec) Toggle
   */
  simBurstBtn.addEventListener('click', () => {
    if (burstTrafficInterval) {
      // Stop burst simulation
      clearInterval(burstTrafficInterval);
      burstTrafficInterval = null;
      currentBurstRate = 0;
      simBurstBtn.className = 'py-2 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5';
      simBurstLabel.textContent = 'Spike (30 r/s)';
    } else {
      // Stop normal if active
      if (normalTrafficInterval) simNormalBtn.click();

      // Start burst simulation (30 req/sec = 1 request every ~33ms)
      currentBurstRate = 30;
      simBurstBtn.className = 'py-2 px-2.5 bg-rose-500 text-white font-bold border border-rose-400 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition animate-pulse';
      simBurstLabel.textContent = 'Stop Spike';

      burstTrafficInterval = setInterval(() => {
        fireRequest();
      }, 33);
    }

    updateSimulatorStatusBox();
  });

  /**
   * Update Status Box Indicator for Simulator
   */
  function updateSimulatorStatusBox() {
    const totalRate = currentNormalRate + currentBurstRate;

    if (totalRate === 0) {
      simStatusDot.className = 'w-2 h-2 rounded-full bg-slate-600';
      simStatusText.textContent = 'Status: Idle';
      simRateText.textContent = '0 req/s';
    } else if (currentBurstRate > 0) {
      simStatusDot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-pulse';
      simStatusText.textContent = 'Status: Traffic Spike active';
      simRateText.textContent = `${totalRate} req/s`;
    } else {
      simStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
      simStatusText.textContent = 'Status: Normal Traffic active';
      simRateText.textContent = `${totalRate} req/s`;
    }
  }

  /**
   * Reset Metrics Button Click
   */
  resetMetricsBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/v1/metrics/reset', { method: 'POST' });
      if (response.ok) {
        fetchMetrics();
      }
    } catch (err) {
      console.error('Error resetting metrics:', err);
    }
  });

  // Init Dashboard
  initChart();
  fetchMetrics();

  // Poll metrics every 1 second for live dashboard updates
  setInterval(fetchMetrics, 1000);
});
