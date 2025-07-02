/**
 * State Management System for Anki Stats Dashboard
 * Handles localStorage persistence, state updates, and event notifications
 */

/**
 * Default application state structure
 */
const defaultState = {
  // Theme preferences
  theme: 'dark', // 'dark' | 'light'
  
  // Language preferences  
  language: 'en', // 'en' | 'ru'
  
  // Filter states
  filters: {
    selectedDecks: [], // Array of deck names
    selectedLevels: [], // Array of anki levels
    searchQuery: '', // Search text
    dateRange: {
      start: null, // Date string or null
      end: null // Date string or null
    }
  },
  
  // Chart-specific states
  chartStates: {
    // Timeline chart
    timelineZoom: 'month', // 'week' | 'month' | 'year'
    timelineMetrics: ['reviews', 'newCards', 'matured'], // Visible metrics
    
    // Heatmap
    heatmapYear: new Date().getFullYear(), // Current year
    
    // Pie chart
    pieChartExpanded: false, // Whether showing detailed view
    
    // Deck chart
    deckChartSortBy: 'name', // 'name' | 'count' | 'performance'
    deckChartSortOrder: 'asc' // 'asc' | 'desc'
  },
  
  // Table states
  tableStates: {
    sortColumn: 'lastReview', // Column to sort by
    sortOrder: 'desc', // 'asc' | 'desc'
    pageSize: 50, // Number of rows per page
    currentPage: 1 // Current page number
  },
  
  // UI states
  uiStates: {
    sidebarCollapsed: false,
    lastDataUpdate: null, // Timestamp of last data update
    selectedCard: null // Currently selected card ID
  }
};

/**
 * StateManager class for handling application state with localStorage persistence
 */
class StateManager {
  constructor() {
    this.storageKey = 'anki-stats-state';
    this.state = this.loadState();
    this.listeners = new Map(); // Map of event types to Set of listeners
    this.middlewares = []; // Array of middleware functions
    
    // Bind methods to preserve context
    this.setState = this.setState.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
  }
  
  /**
   * Load state from localStorage with fallback to defaults
   * @returns {Object} Application state
   */
  loadState() {
    try {
      const savedState = localStorage.getItem(this.storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Merge with defaults to handle new state properties
        return this.deepMerge(defaultState, parsed);
      }
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
    }
    
    return { ...defaultState };
  }
  
  /**
   * Save current state to localStorage
   */
  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }
  
  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  /**
   * Get current state or specific state property
   * @param {string} path - Optional dot-notation path to specific property
   * @returns {*} State value
   */
  getState(path = null) {
    if (!path) return { ...this.state };
    
    return path.split('.').reduce((current, prop) => current?.[prop], this.state);
  }
  
  /**
   * Update state with new values
   * @param {Object|Function} updates - Object with updates or function that returns updates
   * @param {string} eventType - Optional event type for targeted notifications
   */
  setState(updates, eventType = 'stateChange') {
    // Support functional updates
    const actualUpdates = typeof updates === 'function' ? updates(this.state) : updates;
    
    // Apply middleware
    const processedUpdates = this.applyMiddleware(actualUpdates, this.state);
    
    // Update state
    const newState = this.deepMerge(this.state, processedUpdates);
    
    // Check if state actually changed
    if (JSON.stringify(newState) !== JSON.stringify(this.state)) {
      const previousState = { ...this.state };
      this.state = newState;
      
      // Save to localStorage
      this.saveState();
      
      // Notify listeners
      this.notifyListeners(eventType, {
        newState: this.state,
        previousState,
        updates: processedUpdates
      });
    }
  }
  
  /**
   * Apply middleware functions to state updates
   * @param {Object} updates - State updates
   * @param {Object} currentState - Current state
   * @returns {Object} Processed updates
   */
  applyMiddleware(updates, currentState) {
    return this.middlewares.reduce((processedUpdates, middleware) => {
      return middleware(processedUpdates, currentState) || processedUpdates;
    }, updates);
  }
  
  /**
   * Add middleware function
   * @param {Function} middleware - Middleware function
   */
  addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }
  
  /**
   * Subscribe to state changes
   * @param {string} eventType - Event type to listen for ('stateChange', 'filterChange', etc.)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => this.unsubscribe(eventType, callback);
  }
  
  /**
   * Unsubscribe from state changes
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function to remove
   */
  unsubscribe(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }
  
  /**
   * Notify listeners of state changes
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   */
  notifyListeners(eventType, eventData) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          console.error(`Error in state listener for ${eventType}:`, error);
        }
      });
    }
    
    // Also notify generic 'stateChange' listeners
    if (eventType !== 'stateChange' && this.listeners.has('stateChange')) {
      this.listeners.get('stateChange').forEach(callback => {
        try {
          callback({ ...eventData, eventType });
        } catch (error) {
          console.error('Error in generic state listener:', error);
        }
      });
    }
  }
  
  /**
   * Reset state to defaults
   * @param {boolean} preserveUserPrefs - Whether to preserve theme and language
   */
  resetState(preserveUserPrefs = true) {
    const newState = { ...defaultState };
    
    if (preserveUserPrefs) {
      newState.theme = this.state.theme;
      newState.language = this.state.language;
    }
    
    this.state = newState;
    this.saveState();
    this.notifyListeners('stateReset', { newState: this.state });
  }
  
  /**
   * Clear localStorage data
   */
  clearStorage() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
  
  /**
   * Export current state as JSON
   * @returns {string} JSON string of current state
   */
  exportState() {
    return JSON.stringify(this.state, null, 2);
  }
  
  /**
   * Import state from JSON string
   * @param {string} jsonState - JSON state string
   * @returns {boolean} Success status
   */
  importState(jsonState) {
    try {
      const imported = JSON.parse(jsonState);
      this.setState(imported, 'stateImported');
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }
  
  // Convenience methods for common state operations
  
  /**
   * Update filter state
   * @param {Object} filterUpdates - Filter updates
   */
  updateFilters(filterUpdates) {
    this.setState({ 
      filters: { ...this.state.filters, ...filterUpdates } 
    }, 'filterChange');
  }
  
  /**
   * Update chart state
   * @param {Object} chartUpdates - Chart state updates
   */
  updateChartState(chartUpdates) {
    this.setState({ 
      chartStates: { ...this.state.chartStates, ...chartUpdates } 
    }, 'chartStateChange');
  }
  
  /**
   * Update table state
   * @param {Object} tableUpdates - Table state updates
   */
  updateTableState(tableUpdates) {
    this.setState({ 
      tableStates: { ...this.state.tableStates, ...tableUpdates } 
    }, 'tableStateChange');
  }
  
  /**
   * Update UI state
   * @param {Object} uiUpdates - UI state updates
   */
  updateUIState(uiUpdates) {
    this.setState({ 
      uiStates: { ...this.state.uiStates, ...uiUpdates } 
    }, 'uiStateChange');
  }
  
  /**
   * Set theme
   * @param {string} theme - Theme name ('dark' | 'light')
   */
  setTheme(theme) {
    this.setState({ theme }, 'themeChange');
  }
  
  /**
   * Set language
   * @param {string} language - Language code ('en' | 'ru')
   */
  setLanguage(language) {
    this.setState({ language }, 'languageChange');
  }
  
  /**
   * Toggle theme between dark and light
   */
  toggleTheme() {
    const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
  
  /**
   * Add or remove deck from selected filters
   * @param {string} deckName - Deck name
   */
  toggleDeckFilter(deckName) {
    const selectedDecks = [...this.state.filters.selectedDecks];
    const index = selectedDecks.indexOf(deckName);
    
    if (index === -1) {
      selectedDecks.push(deckName);
    } else {
      selectedDecks.splice(index, 1);
    }
    
    this.updateFilters({ selectedDecks });
  }
  
  /**
   * Add or remove level from selected filters
   * @param {string} level - Anki level
   */
  toggleLevelFilter(level) {
    const selectedLevels = [...this.state.filters.selectedLevels];
    const index = selectedLevels.indexOf(level);
    
    if (index === -1) {
      selectedLevels.push(level);
    } else {
      selectedLevels.splice(index, 1);
    }
    
    this.updateFilters({ selectedLevels });
  }
  
  /**
   * Clear all filters
   */
  clearFilters() {
    this.updateFilters({
      selectedDecks: [],
      selectedLevels: [],
      searchQuery: '',
      dateRange: { start: null, end: null }
    });
  }
  
  /**
   * Get debug information
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      stateSize: JSON.stringify(this.state).length,
      listenerCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
      middlewareCount: this.middlewares.length,
      storageKey: this.storageKey,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StateManager, defaultState };
}