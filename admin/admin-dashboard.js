/**
 * Portal Finder Admin Analytics Dashboard
 * Real-time monitoring with Chart.js integration
 */

class AdminDashboard {
  constructor() {
    this.baseUrl = window.location.origin;
    this.refreshInterval = null;
    this.autoRefreshEnabled = true;
    this.performanceChart = null;
    this.usageChart = null;
    this.activityLog = [];
    this.isChartTypeToggled = false;
    
    // Initialize dashboard
    this.init();
  }

  /**
   * Initialize the admin dashboard
   */
  async init() {
    console.log('[ADMIN] Initializing Portal Finder Admin Dashboard...');
    
    // Check authentication first
    if (!window.adminAuth || !window.adminAuth.isUserAuthenticated()) {
      console.log('[ADMIN] Authentication required, redirecting...');
      this.handleAuthError();
      return;
    }
    
    try {
      // Setup event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadDashboardData();
      
      // Setup charts
      this.initializeCharts();
      
      // Setup auto-refresh
      this.setupAutoRefresh();
      
      // Hide loading screen and show dashboard
      this.showDashboard();
      
      this.logActivity('Dashboard initialized successfully', 'success');
      
    } catch (error) {
      console.error('[ADMIN] Dashboard initialization failed:', error);
      this.logActivity(`Dashboard initialization failed: ${error.message}`, 'error');
      
      // Check if error is auth-related
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        this.handleAuthError();
      } else {
        this.showError('Failed to initialize dashboard');
      }
    }
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshDashboard();
    });

    // Auto-refresh toggle
    document.getElementById('autoRefresh').addEventListener('change', (e) => {
      this.autoRefreshEnabled = e.target.checked;
      if (this.autoRefreshEnabled) {
        this.setupAutoRefresh();
      } else {
        this.clearAutoRefresh();
      }
    });

    // Performance chart time range
    document.getElementById('performanceTimeRange').addEventListener('change', (e) => {
      this.updatePerformanceChart(parseInt(e.target.value));
    });

    // Popular queries limit
    document.getElementById('popularQueriesLimit').addEventListener('change', (e) => {
      this.updatePopularQueriesTable(parseInt(e.target.value));
    });

    // Chart type toggle
    document.getElementById('toggleChartType').addEventListener('click', () => {
      this.toggleUsageChartType();
    });

    // Export stats
    document.getElementById('exportStatsBtn').addEventListener('click', () => {
      this.exportStats();
    });

    // Clear activity log
    document.getElementById('clearLogBtn').addEventListener('click', () => {
      this.clearActivityLog();
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Modal controls
    this.setupModalControls();
  }

  /**
   * Setup modal controls
   */
  setupModalControls() {
    // Cache management modal
    document.getElementById('cacheManagementBtn').addEventListener('click', () => {
      this.openModal('cacheManagementModal');
    });

    // System info modal
    document.getElementById('systemInfoBtn').addEventListener('click', () => {
      this.openModal('systemInfoModal');
      this.loadSystemInfo();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.closeModal(e.target.closest('.modal'));
      });
    });

    // Click outside to close modals
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });

    // Cache management actions
    document.getElementById('clearExpiredBtn').addEventListener('click', () => {
      this.performCacheAction('clear-expired');
    });

    document.getElementById('warmCacheBtn').addEventListener('click', () => {
      this.performCacheAction('warm');
    });

    document.getElementById('clearAllCacheBtn').addEventListener('click', () => {
      this.performCacheAction('clear-all');
    });

    document.getElementById('testCacheBtn').addEventListener('click', () => {
      this.performCacheAction('test');
    });
  }

  /**
   * Load all dashboard data
   */
  async loadDashboardData() {
    try {
      const [cacheStats, healthStatus, popularQueries] = await Promise.all([
        this.fetchCacheStats(),
        this.fetchHealthStatus(),
        this.fetchPopularQueries()
      ]);

      this.updateOverviewStats(cacheStats);
      this.updateHealthStatus(healthStatus);
      this.updatePopularQueriesTable(20, popularQueries);
      this.updateDetailedStats(cacheStats);
      this.updateSystemStatus(healthStatus);

      // Update last refreshed time
      document.getElementById('lastUpdated').textContent = this.formatTimestamp(new Date());

    } catch (error) {
      console.error('[ADMIN] Failed to load dashboard data:', error);
      this.logActivity(`Failed to load dashboard data: ${error.message}`, 'error');
    }
  }

  /**
   * Fetch cache statistics from API
   */
  async fetchCacheStats(days = 7) {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/api/cache/stats?days=${days}`);
      if (!response) return null; // Auth error handled
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      return data.cache_statistics;
    } catch (error) {
      console.error('[ADMIN] Failed to fetch cache stats:', error);
      throw error;
    }
  }

  /**
   * Fetch system health status
   */
  async fetchHealthStatus() {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/api/cache/health`);
      if (!response) return null; // Auth error handled
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      return data.health;
    } catch (error) {
      console.error('[ADMIN] Failed to fetch health status:', error);
      return {
        status: 'error',
        cache_initialized: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch popular queries
   */
  async fetchPopularQueries(limit = 20) {
    try {
      const response = await fetch(`${this.baseUrl}/api/cache/popular-queries?limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      return data.popular_queries;
    } catch (error) {
      console.error('[ADMIN] Failed to fetch popular queries:', error);
      return [];
    }
  }

  /**
   * Update overview statistics cards
   */
  updateOverviewStats(stats) {
    if (!stats || !stats.summary) return;

    const summary = stats.summary;
    
    // Total Requests
    document.getElementById('totalRequests').textContent = this.formatNumber(summary.total_requests);
    this.updateStatChange('requestsChange', summary.total_requests, null, 'requests today');

    // Cache Hit Rate
    document.getElementById('cacheHitRate').textContent = `${summary.hit_rate}%`;
    this.updateStatChange('hitRateChange', parseFloat(summary.hit_rate), 85, '%');

    // Average Response Time
    document.getElementById('avgResponseTime').textContent = `${Math.round(summary.avg_response_time_ms)} ms`;
    this.updateStatChange('responseTimeChange', parseFloat(summary.avg_response_time_ms), 200, 'ms', true);

    // API Calls Saved
    document.getElementById('apiCallsSaved').textContent = this.formatNumber(summary.api_calls_saved);
    const savings = summary.api_calls_saved * 0.025; // $0.025 per API call
    this.updateStatChange('costSavings', savings, null, `$${savings.toFixed(2)} saved`);
  }

  /**
   * Update stat change indicators
   */
  updateStatChange(elementId, currentValue, threshold, suffix, isLowerBetter = false) {
    const element = document.getElementById(elementId);
    
    if (threshold === null) {
      element.textContent = suffix;
      element.className = 'stat-change neutral';
      return;
    }

    const isGood = isLowerBetter ? currentValue < threshold : currentValue > threshold;
    
    if (isGood) {
      element.className = 'stat-change positive';
      element.innerHTML = `<i class="fas fa-arrow-up"></i> Good ${suffix}`;
    } else {
      element.className = 'stat-change negative';
      element.innerHTML = `<i class="fas fa-arrow-down"></i> Below target ${suffix}`;
    }
  }

  /**
   * Update system health status
   */
  updateHealthStatus(health) {
    const statusElement = document.getElementById('systemStatus');
    const overallHealthElement = document.getElementById('overallHealth');
    
    // Update main status indicator
    statusElement.className = `status-indicator ${health.status}`;
    
    let statusText = '';
    let statusIcon = '';
    
    switch (health.status) {
      case 'healthy':
        statusText = 'System Healthy';
        statusIcon = 'fa-check-circle';
        break;
      case 'warning':
        statusText = 'System Warning';
        statusIcon = 'fa-exclamation-triangle';
        break;
      case 'error':
        statusText = 'System Error';
        statusIcon = 'fa-times-circle';
        break;
      default:
        statusText = 'Status Unknown';
        statusIcon = 'fa-question';
    }
    
    statusElement.innerHTML = `<i class="fas ${statusIcon}"></i><span>${statusText}</span>`;
    
    // Update overall health indicator
    const healthIndicator = overallHealthElement.querySelector('.health-indicator');
    healthIndicator.className = `health-indicator ${health.status}`;
    healthIndicator.innerHTML = `<i class="fas ${statusIcon}"></i>`;

    // Update individual health metrics
    this.updateHealthMetric('cacheServiceHealth', health.cache_initialized, 'Cache service running');
    this.updateHealthMetric('memoryCacheHealth', health.memory_cache_size > 0, `${health.memory_cache_size || 0} entries`);
    this.updateHealthMetric('databaseHealth', health.cache_initialized, 'Database connected');
    this.updateHealthMetric('apiServiceHealth', health.last_24h_requests > 0, `${health.last_24h_requests || 0} requests today`);
  }

  /**
   * Update individual health metric
   */
  updateHealthMetric(elementId, isHealthy, message) {
    const element = document.getElementById(elementId);
    const icon = isHealthy ? 'fa-check-circle' : 'fa-times-circle';
    const color = isHealthy ? 'var(--success)' : 'var(--error)';
    
    element.innerHTML = `
      <i class="fas ${icon}" style="color: ${color}"></i>
      <span>${message}</span>
    `;
  }

  /**
   * Update popular queries table
   */
  async updatePopularQueriesTable(limit = 20, queries = null) {
    const tbody = document.querySelector('#popularQueriesTable tbody');
    
    try {
      if (!queries) {
        queries = await this.fetchPopularQueries(limit);
      }
      
      if (!queries || queries.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="loading-row">
              <i class="fas fa-info-circle"></i> No popular queries found
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = queries.map((query, index) => `
        <tr>
          <td><strong>#${index + 1}</strong></td>
          <td>
            <span style="color: var(--accent-primary); font-weight: 500;">${query.normalized_query}</span>
          </td>
          <td>
            <span class="stat-change positive">${this.formatNumber(query.search_count)}</span>
          </td>
          <td>${Math.round(query.avg_results)}</td>
          <td>
            <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
              ${query.states_searched.slice(0, 3).map(state => 
                `<span style="background: var(--accent-bg); padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${state}</span>`
              ).join('')}
              ${query.states_searched.length > 3 ? `<span style="color: var(--text-muted); font-size: 0.8rem;">+${query.states_searched.length - 3}</span>` : ''}
            </div>
          </td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">
            ${this.formatTimestamp(new Date(query.last_searched))}
          </td>
        </tr>
      `).join('');
      
    } catch (error) {
      console.error('[ADMIN] Failed to update popular queries table:', error);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="loading-row">
            <i class="fas fa-exclamation-triangle" style="color: var(--error);"></i> 
            Failed to load popular queries
          </td>
        </tr>
      `;
    }
  }

  /**
   * Update detailed cache statistics
   */
  updateDetailedStats(stats) {
    if (!stats || !stats.summary) return;

    const summary = stats.summary;
    
    document.getElementById('memoryCacheSize').textContent = this.formatNumber(summary.memory_cache_size);
    document.getElementById('dbCacheSize').textContent = '~' + this.formatNumber(summary.total_requests);
    document.getElementById('cacheAge').textContent = '24h max'; // Based on expiration
    document.getElementById('expiredEntries').textContent = '0'; // Would need separate API
  }

  /**
   * Initialize Chart.js charts
   */
  initializeCharts() {
    this.initializePerformanceChart();
    this.initializeUsageChart();
  }

  /**
   * Initialize performance trend chart
   */
  async initializePerformanceChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    try {
      const stats = await this.fetchCacheStats(7);
      const dailyStats = stats.daily_stats || [];
      
      const labels = dailyStats.map(day => this.formatDate(new Date(day.date)));
      const hitRates = dailyStats.map(day => parseFloat(day.total_requests > 0 ? ((day.cache_hits / day.total_requests) * 100).toFixed(2) : 0));
      const responseTimes = dailyStats.map(day => parseFloat(day.avg_response_time_ms.toFixed(1)));
      const totalRequests = dailyStats.map(day => day.total_requests);
      
      this.performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Cache Hit Rate (%)',
              data: hitRates,
              borderColor: '#48bb78',
              backgroundColor: 'rgba(72, 187, 120, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              yAxisID: 'y'
            },
            {
              label: 'Avg Response Time (ms)',
              data: responseTimes,
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              yAxisID: 'y1'
            },
            {
              label: 'Total Requests',
              data: totalRequests,
              borderColor: '#ed8936',
              backgroundColor: 'rgba(237, 137, 54, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              yAxisID: 'y2'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: '#a0aec0',
                usePointStyle: true,
                padding: 20
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: '#2d3748',
              titleColor: '#ffffff',
              bodyColor: '#a0aec0',
              borderColor: '#4a5568',
              borderWidth: 1
            }
          },
          scales: {
            x: {
              grid: {
                color: '#2d3748'
              },
              ticks: {
                color: '#a0aec0'
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              grid: {
                color: '#2d3748'
              },
              ticks: {
                color: '#a0aec0'
              },
              title: {
                display: true,
                text: 'Hit Rate (%)',
                color: '#48bb78'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                color: '#a0aec0'
              },
              title: {
                display: true,
                text: 'Response Time (ms)',
                color: '#667eea'
              }
            },
            y2: {
              type: 'linear',
              display: false,
              position: 'right',
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      });
      
    } catch (error) {
      console.error('[ADMIN] Failed to initialize performance chart:', error);
      this.showChartError('performanceChart', 'Failed to load performance data');
    }
  }

  /**
   * Initialize API usage chart
   */
  async initializeUsageChart() {
    const ctx = document.getElementById('usageChart').getContext('2d');
    
    try {
      const stats = await this.fetchCacheStats(7);
      const summary = stats.summary;
      
      // Pie chart showing cache vs API usage
      this.usageChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Cache Hits', 'Cache Misses', 'API Calls Saved'],
          datasets: [{
            data: [
              summary.cache_hits,
              summary.cache_misses,
              summary.api_calls_saved
            ],
            backgroundColor: [
              '#48bb78',
              '#f56565',
              '#667eea'
            ],
            borderColor: [
              '#38a169',
              '#e53e3e',
              '#5a67d8'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#a0aec0',
                usePointStyle: true,
                padding: 20
              }
            },
            tooltip: {
              backgroundColor: '#2d3748',
              titleColor: '#ffffff',
              bodyColor: '#a0aec0',
              borderColor: '#4a5568',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('[ADMIN] Failed to initialize usage chart:', error);
      this.showChartError('usageChart', 'Failed to load usage data');
    }
  }

  /**
   * Toggle usage chart between different views
   */
  async toggleUsageChartType() {
    if (!this.usageChart) return;
    
    this.isChartTypeToggled = !this.isChartTypeToggled;
    
    try {
      const stats = await this.fetchCacheStats(7);
      const dailyStats = stats.daily_stats || [];
      
      if (this.isChartTypeToggled) {
        // Show daily trend bar chart
        this.usageChart.destroy();
        
        const ctx = document.getElementById('usageChart').getContext('2d');
        const labels = dailyStats.map(day => this.formatDate(new Date(day.date)));
        
        this.usageChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Cache Hits',
                data: dailyStats.map(day => day.cache_hits),
                backgroundColor: 'rgba(72, 187, 120, 0.8)',
                borderColor: '#48bb78',
                borderWidth: 1
              },
              {
                label: 'Cache Misses',
                data: dailyStats.map(day => day.cache_misses),
                backgroundColor: 'rgba(245, 101, 101, 0.8)',
                borderColor: '#f56565',
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: '#a0aec0',
                  usePointStyle: true
                }
              }
            },
            scales: {
              x: {
                grid: { color: '#2d3748' },
                ticks: { color: '#a0aec0' }
              },
              y: {
                grid: { color: '#2d3748' },
                ticks: { color: '#a0aec0' }
              }
            }
          }
        });
      } else {
        // Show original doughnut chart
        this.initializeUsageChart();
      }
      
    } catch (error) {
      console.error('[ADMIN] Failed to toggle chart type:', error);
    }
  }

  /**
   * Update performance chart with new time range
   */
  async updatePerformanceChart(days) {
    if (!this.performanceChart) return;
    
    try {
      const stats = await this.fetchCacheStats(days);
      const dailyStats = stats.daily_stats || [];
      
      const labels = dailyStats.map(day => this.formatDate(new Date(day.date)));
      const hitRates = dailyStats.map(day => parseFloat(day.total_requests > 0 ? ((day.cache_hits / day.total_requests) * 100).toFixed(2) : 0));
      const responseTimes = dailyStats.map(day => parseFloat(day.avg_response_time_ms.toFixed(1)));
      const totalRequests = dailyStats.map(day => day.total_requests);
      
      this.performanceChart.data.labels = labels;
      this.performanceChart.data.datasets[0].data = hitRates;
      this.performanceChart.data.datasets[1].data = responseTimes;
      this.performanceChart.data.datasets[2].data = totalRequests;
      this.performanceChart.update();
      
    } catch (error) {
      console.error('[ADMIN] Failed to update performance chart:', error);
    }
  }

  /**
   * Show chart error message
   */
  showChartError(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    const container = canvas.parentElement;
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--text-muted); flex-direction: column; gap: 1rem;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--error);"></i>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Setup auto-refresh functionality
   */
  setupAutoRefresh() {
    this.clearAutoRefresh();
    
    if (this.autoRefreshEnabled) {
      this.refreshInterval = setInterval(() => {
        this.refreshDashboard(false);
      }, 30000); // 30 seconds
    }
  }

  /**
   * Clear auto-refresh interval
   */
  clearAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Refresh dashboard data
   */
  async refreshDashboard(showLoading = true) {
    if (showLoading) {
      this.logActivity('Refreshing dashboard...', 'info');
    }
    
    try {
      await this.loadDashboardData();
      
      // Update charts if they exist
      if (this.performanceChart) {
        const days = parseInt(document.getElementById('performanceTimeRange').value);
        await this.updatePerformanceChart(days);
      }
      
      if (this.usageChart && !this.isChartTypeToggled) {
        this.usageChart.destroy();
        await this.initializeUsageChart();
      }
      
      this.logActivity('Dashboard refreshed successfully', 'success');
      
    } catch (error) {
      console.error('[ADMIN] Failed to refresh dashboard:', error);
      this.logActivity(`Refresh failed: ${error.message}`, 'error');
    }
  }

  /**
   * Modal management functions
   */
  openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
  }

  closeModal(modal) {
    if (typeof modal === 'string') {
      document.getElementById(modal).classList.add('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }

  /**
   * Load system information
   */
  async loadSystemInfo() {
    try {
      const [config, health] = await Promise.all([
        fetch(`${this.baseUrl}/api/cache/config`).then(r => r.json()),
        this.fetchHealthStatus()
      ]);
      
      document.getElementById('cacheConfig').innerHTML = this.formatJsonDisplay(config.configuration);
      document.getElementById('performanceMetrics').innerHTML = this.formatJsonDisplay(health);
      
    } catch (error) {
      document.getElementById('cacheConfig').innerHTML = `Error loading configuration: ${error.message}`;
      document.getElementById('performanceMetrics').innerHTML = `Error loading metrics: ${error.message}`;
    }
  }

  /**
   * Perform cache management actions
   */
  async performCacheAction(action) {
    const resultsDiv = document.getElementById('managementResults');
    const resultsContent = document.getElementById('resultsContent');
    
    resultsDiv.classList.remove('hidden');
    resultsContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
      let response;
      
      switch (action) {
        case 'clear-expired':
          response = await fetch(`${this.baseUrl}/api/cache/clear-expired`, { method: 'POST' });
          break;
        case 'warm':
          const warmData = {
            queries: ['passport application', 'voter id', 'aadhaar card', 'driving license', 'pan card'],
            states: ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh']
          };
          response = await fetch(`${this.baseUrl}/api/cache/warm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(warmData)
          });
          break;
        case 'clear-all':
          if (!confirm('Are you sure you want to clear ALL cache entries? This cannot be undone.')) {
            resultsDiv.classList.add('hidden');
            return;
          }
          response = await fetch(`${this.baseUrl}/api/cache/clear-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirm: 'CLEAR_ALL_CACHE' })
          });
          break;
        case 'test':
          response = await fetch(`${this.baseUrl}/api/cache/test`, { method: 'POST' });
          break;
      }
      
      const result = await response.json();
      
      if (result.success) {
        resultsContent.innerHTML = `
          <div style="color: var(--success);">
            <i class="fas fa-check-circle"></i> <strong>Success!</strong><br>
            ${result.message || 'Operation completed successfully'}
          </div>
        `;
        this.logActivity(`Cache action '${action}' completed successfully`, 'success');
        
        // Refresh dashboard after successful action
        setTimeout(() => this.refreshDashboard(), 1000);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      resultsContent.innerHTML = `
        <div style="color: var(--error);">
          <i class="fas fa-exclamation-triangle"></i> <strong>Error!</strong><br>
          ${error.message}
        </div>
      `;
      this.logActivity(`Cache action '${action}' failed: ${error.message}`, 'error');
    }
  }

  /**
   * Export statistics to JSON file
   */
  async exportStats() {
    try {
      const stats = await this.fetchCacheStats(30); // Last 30 days
      const popularQueries = await this.fetchPopularQueries(50);
      const health = await this.fetchHealthStatus();
      
      const exportData = {
        export_date: new Date().toISOString(),
        cache_statistics: stats,
        popular_queries: popularQueries,
        health_status: health,
        dashboard_version: '1.0.0'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portal-finder-stats-${this.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.logActivity('Statistics exported successfully', 'success');
      
    } catch (error) {
      console.error('[ADMIN] Export failed:', error);
      this.logActivity(`Export failed: ${error.message}`, 'error');
    }
  }

  /**
   * Activity logging
   */
  logActivity(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logItem = {
      timestamp,
      message,
      type,
      id: Date.now()
    };
    
    this.activityLog.unshift(logItem);
    
    // Keep only last 50 entries
    if (this.activityLog.length > 50) {
      this.activityLog = this.activityLog.slice(0, 50);
    }
    
    this.updateActivityLog();
  }

  /**
   * Update activity log display
   */
  updateActivityLog() {
    const logContainer = document.getElementById('activityLog');
    
    logContainer.innerHTML = this.activityLog.map(item => {
      let icon = 'fa-info-circle';
      let color = 'var(--text-secondary)';
      
      switch (item.type) {
        case 'success':
          icon = 'fa-check-circle';
          color = 'var(--success)';
          break;
        case 'error':
          icon = 'fa-exclamation-triangle';
          color = 'var(--error)';
          break;
        case 'warning':
          icon = 'fa-exclamation-circle';
          color = 'var(--warning)';
          break;
      }
      
      return `
        <div class="log-item">
          <div class="log-time">${item.timestamp}</div>
          <div class="log-message">
            <i class="fas ${icon}" style="color: ${color}; margin-right: 0.5rem;"></i>
            ${item.message}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Clear activity log
   */
  clearActivityLog() {
    this.activityLog = [];
    this.updateActivityLog();
    this.logActivity('Activity log cleared', 'info');
  }

  /**
   * Show dashboard after loading
   */
  showDashboard() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
  }

  /**
   * Show error message
   */
  showError(message) {
    document.getElementById('loadingScreen').innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-exclamation-triangle" style="color: var(--error);"></i>
        <p style="color: var(--error);">${message}</p>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--accent-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }

  /**
   * Utility functions
   */
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    
    return date.toLocaleDateString();
  }

  formatDate(date, format = 'MMM DD') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (format === 'YYYY-MM-DD') {
      return date.toISOString().split('T')[0];
    }
    
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  formatJsonDisplay(obj) {
    return `<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 0.8rem;">${JSON.stringify(obj, null, 2)}</pre>`;
  }
  
  /**
   * Make authenticated fetch request
   */
  async authenticatedFetch(url, options = {}) {
    try {
      if (window.adminAuth && window.adminAuth.isUserAuthenticated()) {
        return await window.adminAuth.authenticatedFetch(url, options);
      } else {
        this.handleAuthError();
        return null;
      }
    } catch (error) {
      if (error.message.includes('Not authenticated')) {
        this.handleAuthError();
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Handle authentication errors
   */
  handleAuthError() {
    console.warn('[ADMIN] Authentication error, redirecting to login');
    this.logActivity('Authentication failed - redirecting to login', 'warning');
    
    if (window.adminAuth) {
      window.adminAuth.logout();
    } else {
      window.location.href = '/admin/login.html';
    }
  }
  
  /**
   * Logout functionality
   */
  logout() {
    this.logActivity('Admin logging out', 'info');
    
    // Clear any intervals
    this.clearAutoRefresh();
    
    if (window.adminAuth) {
      window.adminAuth.logout();
    } else {
      window.location.href = '/admin/login.html';
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard();
});

// Handle page visibility change to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
  if (window.adminDashboard) {
    if (document.hidden) {
      window.adminDashboard.clearAutoRefresh();
    } else if (window.adminDashboard.autoRefreshEnabled) {
      window.adminDashboard.setupAutoRefresh();
    }
  }
});