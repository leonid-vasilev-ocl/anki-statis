/**
 * Charts System for Anki Stats Dashboard
 * Handles Chart.js chart creation, updates, and interactions
 */

class ChartsManager {
  constructor(stateManager, i18n, dataParser) {
    this.stateManager = stateManager;
    this.i18n = i18n;
    this.dataParser = dataParser;
    this.charts = new Map(); // Store chart instances
    this.chartConfigs = new Map(); // Store chart configurations
    
    // Bind methods
    this.initializeCharts = this.initializeCharts.bind(this);
    this.updateCharts = this.updateCharts.bind(this);
    this.destroyCharts = this.destroyCharts.bind(this);
    
    // Subscribe to state changes
    this.stateManager.subscribe('languageChange', () => this.updateChartsLanguage());
    this.stateManager.subscribe('themeChange', () => this.updateChartsTheme());
    this.stateManager.subscribe('filterChange', () => this.updateChartsData());
  }
  
  /**
   * Initialize all charts
   * @param {Array} cardsData - Parsed card data
   * @param {Object} activityData - Activity log data
   */
  async initializeCharts(cardsData, activityData) {
    try {
      this.cardsData = cardsData;
      this.activityData = activityData;
      
      // Create charts in order
      await this.createLevelDistributionChart();
      await this.createDeckPerformanceChart();
      await this.createStudyTimelineChart();
      await this.createActivityHeatmap();
      
      console.log('All charts initialized successfully');
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  }
  
  /**
   * Create Level Distribution Pie Chart
   */
  async createLevelDistributionChart() {
    const canvas = document.getElementById('levelChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const filteredData = this.getFilteredData();
    const levelDistribution = this.dataParser.getLevelDistribution(filteredData);
    
    // Prepare data for Chart.js
    const labels = Object.keys(levelDistribution).map(level => this.i18n.t(`levels.${level}`));
    const data = Object.values(levelDistribution);
    const colors = this.getLevelColors();
    
    const config = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: Object.keys(levelDistribution).map(level => colors[level] || colors.default),
          borderColor: this.getThemeColors().border,
          borderWidth: 2,
          hoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: this.i18n.t('charts.levelDistribution'),
            color: this.getThemeColors().text,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              color: this.getThemeColors().text,
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: this.getThemeColors().tooltipBg,
            titleColor: this.getThemeColors().text,
            bodyColor: this.getThemeColors().text,
            borderColor: this.getThemeColors().border,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const element = elements[0];
            const label = config.data.labels[element.index];
            const originalLevel = Object.keys(levelDistribution)[element.index];
            this.handleLevelChartClick(originalLevel);
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000
        }
      }
    };
    
    // Destroy existing chart if it exists
    if (this.charts.has('levelChart')) {
      this.charts.get('levelChart').destroy();
    }
    
    const chart = new Chart(ctx, config);
    this.charts.set('levelChart', chart);
    this.chartConfigs.set('levelChart', config);
  }
  
  /**
   * Create Deck Performance Bar Chart
   */
  async createDeckPerformanceChart() {
    const canvas = document.getElementById('deckChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const filteredData = this.getFilteredData();
    const deckPerformance = this.dataParser.getDeckPerformance(filteredData);
    
    // Prepare stacked bar data
    const deckNames = deckPerformance.map(deck => deck.name);
    const levelTypes = ['New', 'Learning', 'Young', 'Mature', 'Relearning', 'Suspended'];
    const colors = this.getLevelColors();
    
    const datasets = levelTypes.map(level => ({
      label: this.i18n.t(`levels.${level}`),
      data: deckPerformance.map(deck => deck.levels[level] || 0),
      backgroundColor: colors[level] || colors.default,
      borderColor: this.getThemeColors().border,
      borderWidth: 1
    }));
    
    const config = {
      type: 'bar',
      data: {
        labels: deckNames,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bars
        scales: {
          x: {
            stacked: true,
            grid: {
              color: this.getThemeColors().gridLines
            },
            ticks: {
              color: this.getThemeColors().text
            }
          },
          y: {
            stacked: true,
            grid: {
              color: this.getThemeColors().gridLines
            },
            ticks: {
              color: this.getThemeColors().text,
              maxTicksLimit: 10
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: this.i18n.t('charts.deckPerformance'),
            color: this.getThemeColors().text,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'top',
            labels: {
              color: this.getThemeColors().text,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: this.getThemeColors().tooltipBg,
            titleColor: this.getThemeColors().text,
            bodyColor: this.getThemeColors().text,
            borderColor: this.getThemeColors().border,
            borderWidth: 1,
            mode: 'index',
            intersect: false
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const element = elements[0];
            const deckName = deckNames[element.index];
            this.handleDeckChartClick(deckName);
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    };
    
    // Destroy existing chart if it exists
    if (this.charts.has('deckChart')) {
      this.charts.get('deckChart').destroy();
    }
    
    const chart = new Chart(ctx, config);
    this.charts.set('deckChart', chart);
    this.chartConfigs.set('deckChart', config);
  }
  
  /**
   * Create Study Timeline Chart
   */
  async createStudyTimelineChart() {
    const canvas = document.getElementById('timelineChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const timeframe = this.stateManager.getState('chartStates.timelineZoom');
    const timelineData = this.dataParser.getTimelineData(timeframe);
    
    const config = {
      type: 'line',
      data: timelineData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: this.getThemeColors().gridLines
            },
            ticks: {
              color: this.getThemeColors().text,
              maxTicksLimit: 15
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: this.getThemeColors().gridLines
            },
            ticks: {
              color: this.getThemeColors().text
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: this.i18n.t('charts.studyTimeline'),
            color: this.getThemeColors().text,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            labels: {
              color: this.getThemeColors().text,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: this.getThemeColors().tooltipBg,
            titleColor: this.getThemeColors().text,
            bodyColor: this.getThemeColors().text,
            borderColor: this.getThemeColors().border,
            borderWidth: 1,
            mode: 'index',
            intersect: false
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        animation: {
          duration: 1500,
          easing: 'easeInOutQuart'
        }
      }
    };
    
    // Update dataset colors to match theme
    config.data.datasets.forEach((dataset, index) => {
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0'];
      dataset.borderColor = colors[index % colors.length];
      dataset.backgroundColor = colors[index % colors.length] + '20'; // Add transparency
    });
    
    // Destroy existing chart if it exists
    if (this.charts.has('timelineChart')) {
      this.charts.get('timelineChart').destroy();
    }
    
    const chart = new Chart(ctx, config);
    this.charts.set('timelineChart', chart);
    this.chartConfigs.set('timelineChart', config);
  }
  
  /**
   * Create Study Activity Heatmap
   */
  async createActivityHeatmap() {
    const container = document.getElementById('heatmapChart');
    if (!container) return;
    
    const year = this.stateManager.getState('chartStates.heatmapYear');
    const heatmapData = this.dataParser.getHeatmapData(year);
    
    // Clear existing heatmap
    container.innerHTML = '';
    
    // Create heatmap grid
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(53, 1fr);
      gap: 2px;
      padding: 1rem 0;
      height: 200px;
      overflow-x: auto;
    `;
    
    heatmapData.forEach(dayData => {
      const cell = document.createElement('div');
      cell.className = `heatmap-cell activity-${dayData.intensity}`;
      cell.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 2px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      // Add tooltip
      cell.title = `${dayData.dateStr}: ${dayData.activity} activities`;
      
      // Add click handler
      cell.addEventListener('click', () => {
        this.handleHeatmapCellClick(dayData.dateStr);
      });
      
      // Add hover effect
      cell.addEventListener('mouseenter', () => {
        cell.style.transform = 'scale(1.2)';
        cell.style.border = '1px solid var(--accent-primary)';
      });
      
      cell.addEventListener('mouseleave', () => {
        cell.style.transform = 'scale(1)';
        cell.style.border = 'none';
      });
      
      grid.appendChild(cell);
    });
    
    container.appendChild(grid);
  }
  
  /**
   * Get filtered data based on current filters
   * @returns {Array} Filtered card data
   */
  getFilteredData() {
    const filters = this.stateManager.getState('filters');
    return this.dataParser.filterCards(this.cardsData, filters);
  }
  
  /**
   * Get level colors for charts
   * @returns {Object} Color mapping
   */
  getLevelColors() {
    return {
      'New': '#F44336',
      'Learning': '#FF9800',
      'Young': '#FFC107',
      'Mature': '#4CAF50',
      'Relearning': '#9C27B0',
      'Suspended': '#757575',
      'Scheduler Buried': '#616161',
      'User Buried': '#424242',
      'default': '#9E9E9E'
    };
  }
  
  /**
   * Get theme-specific colors
   * @returns {Object} Theme colors
   */
  getThemeColors() {
    const isDark = this.stateManager.getState('theme') === 'dark';
    
    return {
      text: isDark ? '#e0e0e0' : '#333333',
      border: isDark ? '#444444' : '#e0e0e0',
      gridLines: isDark ? '#333333' : '#f0f0f0',
      tooltipBg: isDark ? '#333333' : '#ffffff'
    };
  }
  
  /**
   * Handle level chart click
   * @param {string} level - Clicked level
   */
  handleLevelChartClick(level) {
    this.stateManager.toggleLevelFilter(level);
  }
  
  /**
   * Handle deck chart click
   * @param {string} deckName - Clicked deck name
   */
  handleDeckChartClick(deckName) {
    this.stateManager.toggleDeckFilter(deckName);
  }
  
  /**
   * Handle heatmap cell click
   * @param {string} date - Clicked date
   */
  handleHeatmapCellClick(date) {
    // Set date range filter to the clicked day
    this.stateManager.updateFilters({
      dateRange: {
        start: date,
        end: date
      }
    });
  }
  
  /**
   * Update charts when language changes
   */
  updateChartsLanguage() {
    // Recreate charts with new language
    if (this.cardsData && this.activityData) {
      this.initializeCharts(this.cardsData, this.activityData);
    }
  }
  
  /**
   * Update charts when theme changes
   */
  updateChartsTheme() {
    // Update chart colors for new theme
    this.charts.forEach((chart, chartId) => {
      const config = this.chartConfigs.get(chartId);
      if (config) {
        // Update theme colors in config and refresh chart
        this.updateChartThemeColors(chart, config);
        chart.update();
      }
    });
  }
  
  /**
   * Update chart theme colors
   * @param {Chart} chart - Chart instance
   * @param {Object} config - Chart configuration
   */
  updateChartThemeColors(chart, config) {
    const colors = this.getThemeColors();
    
    // Update title color
    if (config.options.plugins?.title) {
      config.options.plugins.title.color = colors.text;
    }
    
    // Update legend colors
    if (config.options.plugins?.legend?.labels) {
      config.options.plugins.legend.labels.color = colors.text;
    }
    
    // Update scale colors
    if (config.options.scales) {
      Object.values(config.options.scales).forEach(scale => {
        if (scale.grid) scale.grid.color = colors.gridLines;
        if (scale.ticks) scale.ticks.color = colors.text;
      });
    }
    
    // Update tooltip colors
    if (config.options.plugins?.tooltip) {
      config.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
      config.options.plugins.tooltip.titleColor = colors.text;
      config.options.plugins.tooltip.bodyColor = colors.text;
      config.options.plugins.tooltip.borderColor = colors.border;
    }
    
    chart.options = config.options;
  }
  
  /**
   * Update charts when data filters change
   */
  updateChartsData() {
    // Update level distribution chart
    if (this.charts.has('levelChart')) {
      this.updateLevelChart();
    }
    
    // Update deck performance chart
    if (this.charts.has('deckChart')) {
      this.updateDeckChart();
    }
    
    // Timeline and heatmap are not affected by card filters
  }
  
  /**
   * Update level distribution chart data
   */
  updateLevelChart() {
    const chart = this.charts.get('levelChart');
    const filteredData = this.getFilteredData();
    const levelDistribution = this.dataParser.getLevelDistribution(filteredData);
    
    chart.data.labels = Object.keys(levelDistribution).map(level => this.i18n.t(`levels.${level}`));
    chart.data.datasets[0].data = Object.values(levelDistribution);
    
    chart.update('none'); // Update without animation for responsiveness
  }
  
  /**
   * Update deck performance chart data
   */
  updateDeckChart() {
    const chart = this.charts.get('deckChart');
    const filteredData = this.getFilteredData();
    const deckPerformance = this.dataParser.getDeckPerformance(filteredData);
    
    chart.data.labels = deckPerformance.map(deck => deck.name);
    
    chart.data.datasets.forEach((dataset, index) => {
      const levelName = ['New', 'Learning', 'Young', 'Mature', 'Relearning', 'Suspended'][index];
      dataset.data = deckPerformance.map(deck => deck.levels[levelName] || 0);
    });
    
    chart.update('none');
  }
  
  /**
   * Update timeline chart zoom level
   * @param {string} zoom - New zoom level
   */
  updateTimelineZoom(zoom) {
    this.stateManager.updateChartState({ timelineZoom: zoom });
    this.createStudyTimelineChart(); // Recreate with new timeframe
  }
  
  /**
   * Update heatmap year
   * @param {number} year - New year
   */
  updateHeatmapYear(year) {
    this.stateManager.updateChartState({ heatmapYear: year });
    this.createActivityHeatmap(); // Recreate with new year
  }
  
  /**
   * Destroy all charts
   */
  destroyCharts() {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
    this.chartConfigs.clear();
  }
  
  /**
   * Export chart as image
   * @param {string} chartId - Chart ID to export
   * @param {string} format - Image format ('png' | 'jpeg')
   * @returns {string} Data URL of the chart image
   */
  exportChart(chartId, format = 'png') {
    const chart = this.charts.get(chartId);
    if (chart) {
      return chart.toBase64Image(format);
    }
    return null;
  }
  
  /**
   * Get chart summary statistics
   * @returns {Object} Summary statistics
   */
  getChartSummary() {
    const filteredData = this.getFilteredData();
    return this.dataParser.getSummaryStats(filteredData);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChartsManager };
}