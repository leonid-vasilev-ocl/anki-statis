/**
 * Main Application Controller for Anki Stats Dashboard
 * Orchestrates all components and handles application lifecycle
 */

class AnkiStatsApp {
  constructor() {
    // Initialize core components
    this.stateManager = new StateManager();
    this.i18n = new I18n();
    this.dataParser = new DataParser();
    this.chartsManager = new ChartsManager(this.stateManager, this.i18n, this.dataParser);
    
    // Application state
    this.isLoading = false;
    this.lastDataUpdate = null;
    this.cardsData = null;
    this.activityData = null;
    
    // Initialization will be called manually after DOM is ready
  }
  
  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('Initializing Anki Stats Dashboard...');
      
      // Check if required libraries are loaded
      if (typeof Chart === 'undefined') {
        throw new Error('Chart.js library not loaded');
      }
      
      // Apply saved theme immediately
      this.applyTheme(this.stateManager.getState('theme'));
      
      // Set up internationalization
      this.i18n.setLanguage(this.stateManager.getState('language'));
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup state subscriptions
      this.setupStateSubscriptions();
      
      // Show loading state
      this.setLoadingState(true);
      
      // Load data
      await this.loadData();
      
      // Initialize charts and table
      await this.initializeComponents();
      
      // Apply saved filters
      this.applySavedFilters();
      
      // Hide loading state
      this.setLoadingState(false);
      
      // Update last data update timestamp
      this.lastDataUpdate = new Date();
      this.stateManager.updateUIState({ lastDataUpdate: this.lastDataUpdate.toISOString() });
      
      console.log('Application initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.setLoadingState(false);
      this.showError(`Failed to load application: ${error.message}`);
    }
  }
  
  /**
   * Load CSV and activity data
   */
  async loadData() {
    try {
      console.log('Loading data...');
      
      // Load main CSV data
      const csvResponse = await fetch('./anki_stats.csv');
      if (!csvResponse.ok) {
        throw new Error(`Failed to load CSV data: ${csvResponse.status}`);
      }
      const csvText = await csvResponse.text();
      this.cardsData = this.dataParser.parseCSV(csvText);
      
      console.log(`Loaded ${this.cardsData.length} cards`);
      
      // Load activity log (optional)
      try {
        const activityResponse = await fetch('./activity_log.json');
        if (activityResponse.ok) {
          const activityJson = await activityResponse.json();
          this.activityData = this.dataParser.parseActivityLog(activityJson.daily_activity || {});
          console.log(`Loaded activity data for ${Object.keys(this.activityData).length} days`);
        } else {
          console.warn('Activity log not found, using empty data');
          this.activityData = {};
        }
      } catch (error) {
        console.warn('Could not load activity log:', error);
        this.activityData = {};
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }
  
  /**
   * Initialize charts and table components
   */
  async initializeComponents() {
    try {
      // DOM elements are guaranteed to exist at this point due to pre-check
      console.log('Initializing charts and components...');
      
      // Initialize charts
      await this.chartsManager.initializeCharts(this.cardsData, this.activityData);
      
      // Initialize card explorer table
      this.initializeCardTable();
      
      // Update filter options
      this.updateFilterOptions();
      
      // Update summary statistics
      this.updateSummaryStats();
      
    } catch (error) {
      console.error('Error initializing components:', error);
      throw error;
    }
  }
  
  /**
   * Initialize interactive card table
   */
  initializeCardTable() {
    const tableBody = document.querySelector('#cardTable tbody');
    if (!tableBody) return;
    
    this.updateCardTable();
  }
  
  /**
   * Update card table with current data and filters
   */
  updateCardTable() {
    const tableBody = document.querySelector('#cardTable tbody');
    const cardCount = document.getElementById('cardCount');
    if (!tableBody) return;
    
    const filters = this.stateManager.getState('filters');
    const tableState = this.stateManager.getState('tableStates');
    const filteredCards = this.dataParser.filterCards(this.cardsData, filters);
    
    // Sort cards
    const sortedCards = this.sortCards(filteredCards, tableState.sortColumn, tableState.sortOrder);
    
    // Paginate cards
    const startIndex = (tableState.currentPage - 1) * tableState.pageSize;
    const endIndex = startIndex + tableState.pageSize;
    const paginatedCards = sortedCards.slice(startIndex, endIndex);
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add rows
    paginatedCards.forEach(card => {
      const row = this.createTableRow(card);
      tableBody.appendChild(row);
    });
    
    // Update card count
    if (cardCount) {
      const countText = this.i18n.formatNumber(filteredCards.length) + ' ' + this.i18n.t('stats.cards');
      cardCount.textContent = countText;
    }
    
    // Update pagination (if implemented)
    this.updateTablePagination(filteredCards.length, tableState);
  }
  
  /**
   * Create table row for a card
   * @param {Object} card - Card data
   * @returns {HTMLElement} Table row element
   */
  createTableRow(card) {
    const row = document.createElement('tr');
    row.className = 'card-row';
    row.dataset.noteId = card.noteId;
    
    // Add click handler for row selection
    row.addEventListener('click', () => {
      this.selectCard(card);
    });
    
    row.innerHTML = `
      <td class="finnish-cell">${this.escapeHtml(card.finnish)}</td>
      <td class="translation-cell">${this.escapeHtml(card.translation)}</td>
      <td class="level-cell">
        <span class="level-badge level-${card.ankiLevel.toLowerCase().replace(/\s+/g, '-')}">${this.i18n.t(`levels.${card.ankiLevel}`)}</span>
      </td>
      <td class="deck-cell">${this.escapeHtml(card.deckName)}</td>
      <td class="date-cell">${card.lastReviewDate ? this.i18n.formatDate(card.lastReviewDate) : '-'}</td>
    `;
    
    return row;
  }
  
  /**
   * Sort cards by specified column and order
   * @param {Array} cards - Cards to sort
   * @param {string} column - Column to sort by
   * @param {string} order - Sort order ('asc' | 'desc')
   * @returns {Array} Sorted cards
   */
  sortCards(cards, column, order) {
    const multiplier = order === 'desc' ? -1 : 1;
    
    return [...cards].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'finnish':
          aVal = a.finnish || '';
          bVal = b.finnish || '';
          break;
        case 'translation':
          aVal = a.translation || '';
          bVal = b.translation || '';
          break;
        case 'level':
          aVal = a.ankiLevel || '';
          bVal = b.ankiLevel || '';
          break;
        case 'deck':
          aVal = a.deckName || '';
          bVal = b.deckName || '';
          break;
        case 'lastReview':
          aVal = a.lastReviewDate || new Date(0);
          bVal = b.lastReviewDate || new Date(0);
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
      return 0;
    });
  }
  
  /**
   * Update table pagination
   * @param {number} totalCards - Total number of filtered cards
   * @param {Object} tableState - Current table state
   */
  updateTablePagination(totalCards, tableState) {
    // Pagination implementation would go here
    // For now, we'll just update the page info
    const totalPages = Math.ceil(totalCards / tableState.pageSize);
    console.log(`Page ${tableState.currentPage} of ${totalPages}`);
  }
  
  /**
   * Select a card and show details
   * @param {Object} card - Selected card
   */
  selectCard(card) {
    this.stateManager.updateUIState({ selectedCard: card.noteId });
    
    // Remove previous selection
    document.querySelectorAll('.card-row.selected').forEach(row => {
      row.classList.remove('selected');
    });
    
    // Add selection to current row
    const row = document.querySelector(`[data-note-id="${card.noteId}"]`);
    if (row) {
      row.classList.add('selected');
    }
    
    // Show card details (could open a modal or side panel)
    this.showCardDetails(card);
  }
  
  /**
   * Show detailed card information
   * @param {Object} card - Card to show details for
   */
  showCardDetails(card) {
    // For now, just log the details
    // In a full implementation, this might open a modal or update a details panel
    console.log('Card details:', card);
  }
  
  /**
   * Update filter dropdown options
   */
  updateFilterOptions() {
    // Update deck filter options
    const deckFilter = document.getElementById('deckFilter');
    if (deckFilter && this.cardsData) {
      const uniqueDecks = this.dataParser.getUniqueDecks(this.cardsData);
      this.updateSelectOptions(deckFilter, uniqueDecks, 'filters.allDecks');
    }
    
    // Update level filter options
    const levelFilter = document.getElementById('levelFilter');
    if (levelFilter && this.cardsData) {
      const uniqueLevels = this.dataParser.getUniqueLevels(this.cardsData);
      this.updateSelectOptions(levelFilter, uniqueLevels, 'filters.allLevels', true);
    }
  }
  
  /**
   * Update select element options
   * @param {HTMLSelectElement} select - Select element
   * @param {Array} options - Option values
   * @param {string} defaultTextKey - Translation key for default option
   * @param {boolean} translateOptions - Whether to translate option labels
   */
  updateSelectOptions(select, options, defaultTextKey, translateOptions = false) {
    // Clear existing options except the first (default) one
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }
    
    // Update default option text
    if (select.firstChild) {
      select.firstChild.textContent = this.i18n.t(defaultTextKey);
    }
    
    // Add new options
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = translateOptions ? this.i18n.t(`levels.${option}`) : option;
      select.appendChild(optionElement);
    });
  }
  
  /**
   * Update summary statistics display
   */
  updateSummaryStats() {
    const filters = this.stateManager.getState('filters');
    const filteredCards = this.dataParser.filterCards(this.cardsData, filters);
    const stats = this.dataParser.getSummaryStats(filteredCards);
    
    // Update stats elements if they exist
    this.updateStatsElement('totalCards', stats.totalCards);
    this.updateStatsElement('studiedToday', stats.studiedToday);
    this.updateStatsElement('averageDaily', stats.averageDaily);
  }
  
  /**
   * Update a statistics element
   * @param {string} elementId - Element ID
   * @param {number} value - Statistic value
   */
  updateStatsElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.i18n.formatNumber(value);
    }
  }
  
  /**
   * Setup event listeners for UI interactions
   */
  setupEventListeners() {
    // Language switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.target.dataset.lang;
        this.changeLanguage(lang);
      });
    });
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    
    // Filter controls
    const deckFilter = document.getElementById('deckFilter');
    if (deckFilter) {
      deckFilter.addEventListener('change', (e) => {
        this.updateDeckFilter(e.target.value);
      });
    }
    
    const levelFilter = document.getElementById('levelFilter');
    if (levelFilter) {
      levelFilter.addEventListener('change', (e) => {
        this.updateLevelFilter(e.target.value);
      });
    }
    
    const searchFilter = document.getElementById('searchFilter');
    if (searchFilter) {
      searchFilter.addEventListener('input', (e) => {
        this.updateSearchFilter(e.target.value);
      });
    }
    
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }
    
    // Timeline zoom control
    const timelineZoom = document.getElementById('timelineZoom');
    if (timelineZoom) {
      timelineZoom.addEventListener('change', (e) => {
        this.chartsManager.updateTimelineZoom(e.target.value);
      });
    }
    
    // Heatmap year control
    const heatmapYear = document.getElementById('heatmapYear');
    if (heatmapYear) {
      heatmapYear.addEventListener('change', (e) => {
        this.chartsManager.updateHeatmapYear(parseInt(e.target.value));
      });
    }
  }
  
  /**
   * Setup state change subscriptions
   */
  setupStateSubscriptions() {
    // Subscribe to filter changes
    this.stateManager.subscribe('filterChange', () => {
      this.updateCardTable();
      this.updateSummaryStats();
    });
    
    // Subscribe to language changes
    this.stateManager.subscribe('languageChange', () => {
      this.updateFilterOptions();
      this.updateCardTable();
    });
    
    // Subscribe to theme changes
    this.stateManager.subscribe('themeChange', (eventData) => {
      this.applyTheme(eventData.newState.theme);
    });
  }
  
  /**
   * Apply saved filters from state
   */
  applySavedFilters() {
    const filters = this.stateManager.getState('filters');
    const chartStates = this.stateManager.getState('chartStates');
    
    // Apply deck filter
    const deckFilter = document.getElementById('deckFilter');
    if (deckFilter && filters.selectedDecks.length === 1) {
      deckFilter.value = filters.selectedDecks[0];
    }
    
    // Apply level filter
    const levelFilter = document.getElementById('levelFilter');
    if (levelFilter && filters.selectedLevels.length === 1) {
      levelFilter.value = filters.selectedLevels[0];
    }
    
    // Apply search filter
    const searchFilter = document.getElementById('searchFilter');
    if (searchFilter && filters.searchQuery) {
      searchFilter.value = filters.searchQuery;
    }
    
    // Apply timeline zoom
    const timelineZoom = document.getElementById('timelineZoom');
    if (timelineZoom) {
      timelineZoom.value = chartStates.timelineZoom;
    }
    
    // Apply heatmap year
    const heatmapYear = document.getElementById('heatmapYear');
    if (heatmapYear) {
      heatmapYear.value = chartStates.heatmapYear;
    }
    
    // Update language buttons
    this.updateLanguageButtons();
  }
  
  /**
   * Update language button states
   */
  updateLanguageButtons() {
    const currentLang = this.stateManager.getState('language');
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
  }
  
  /**
   * Change application language
   * @param {string} lang - Language code
   */
  changeLanguage(lang) {
    this.i18n.setLanguage(lang);
    this.stateManager.setLanguage(lang);
    this.updateLanguageButtons();
  }
  
  /**
   * Toggle application theme
   */
  toggleTheme() {
    this.stateManager.toggleTheme();
  }
  
  /**
   * Apply theme to document
   * @param {string} theme - Theme name
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme icon
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }
  
  /**
   * Update deck filter
   * @param {string} deckName - Selected deck name
   */
  updateDeckFilter(deckName) {
    const selectedDecks = deckName ? [deckName] : [];
    this.stateManager.updateFilters({ selectedDecks });
  }
  
  /**
   * Update level filter
   * @param {string} level - Selected level
   */
  updateLevelFilter(level) {
    const selectedLevels = level ? [level] : [];
    this.stateManager.updateFilters({ selectedLevels });
  }
  
  /**
   * Update search filter
   * @param {string} query - Search query
   */
  updateSearchFilter(query) {
    this.stateManager.updateFilters({ searchQuery: query });
  }
  
  /**
   * Clear all filters
   */
  clearAllFilters() {
    this.stateManager.clearFilters();
    
    // Reset UI controls
    const deckFilter = document.getElementById('deckFilter');
    const levelFilter = document.getElementById('levelFilter');
    const searchFilter = document.getElementById('searchFilter');
    
    if (deckFilter) deckFilter.value = '';
    if (levelFilter) levelFilter.value = '';
    if (searchFilter) searchFilter.value = '';
  }
  
  /**
   * Set loading state
   * @param {boolean} loading - Whether app is loading
   */
  setLoadingState(loading) {
    this.isLoading = loading;
    
    if (loading) {
      // Add loading overlay instead of replacing content
      const chartContainers = document.querySelectorAll('.chart-container');
      chartContainers.forEach(container => {
        // Only add loading if not already present
        if (!container.querySelector('.loading-overlay')) {
          const overlay = document.createElement('div');
          overlay.className = 'loading-overlay';
          overlay.innerHTML = '<div class="loading">Loading data...</div>';
          overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;';
          container.style.position = 'relative';
          container.appendChild(overlay);
        }
      });
    } else {
      // Remove loading overlays
      const loadingOverlays = document.querySelectorAll('.loading-overlay');
      loadingOverlays.forEach(overlay => overlay.remove());
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    console.error(message);
    // In a full implementation, this might show a toast notification or modal
    alert(message);
  }
  
  /**
   * Escape HTML for safe insertion
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Refresh data and update all components
   */
  async refresh() {
    try {
      this.setLoadingState(true);
      await this.loadData();
      await this.initializeComponents();
      this.setLoadingState(false);
      
      this.lastDataUpdate = new Date();
      this.stateManager.updateUIState({ lastDataUpdate: this.lastDataUpdate.toISOString() });
      
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      this.showError('Failed to refresh data. Please try again.');
      this.setLoadingState(false);
    }
  }
  
  /**
   * Get application debug information
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      cardsLoaded: this.cardsData?.length || 0,
      activityDays: Object.keys(this.activityData || {}).length,
      lastDataUpdate: this.lastDataUpdate?.toISOString(),
      chartsInitialized: this.chartsManager.charts.size,
      currentLanguage: this.i18n.getCurrentLanguage(),
      currentTheme: this.stateManager.getState('theme'),
      stateManager: this.stateManager.getDebugInfo()
    };
  }
}

// ES6 export
export { AnkiStatsApp };

// Note: Application is initialized in index.html after DOM is ready