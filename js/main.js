/**
 * Main entry point for Anki Stats Dashboard
 * Uses proper ES6 imports for Vite
 */

import Chart from 'chart.js/auto';
import DataTable from 'datatables.net';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';

// Make Chart and DataTable available globally for the existing code
window.Chart = Chart;
window.DataTable = DataTable;

// Import all modules directly - we'll need to convert them to ES6 modules
// For now, let's inline the essential classes to get it working

// I18n class (complete version)
class I18n {
  constructor() {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('ankiStats_language') || localStorage.getItem('anki-stats-language') || 'en';
    this.currentLanguage = ['en', 'ru'].includes(savedLanguage) ? savedLanguage : 'en';
    // Basic translations - full translations will be loaded from translations.js
    this.translations = {
      en: {
        title: 'Anki Statistics Dashboard',
        'stats.cards': 'cards',
        'stats.words': 'words'
      },
      ru: {
        title: 'Панель статистики Anki', 
        'stats.cards': 'карт',
        'stats.words': 'слов'
      }
    };
  }
  
  t(key) {
    return this.translations[this.currentLanguage][key] || key;
  }
  
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      // Save to localStorage
      localStorage.setItem('ankiStats_language', lang);
    }
  }
  
  getCurrentLanguage() {
    return this.currentLanguage;
  }
  
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }
  
  formatDate(date) {
    if (!date) return '';
    if (typeof date === 'string') {
      date = new Date(date);
    }
    if (!(date instanceof Date) || isNaN(date)) return '';
    
    return date.toLocaleDateString(this.currentLanguage === 'ru' ? 'ru-RU' : 'en-US');
  }
  
  formatDateTime(date) {
    if (!date) return '';
    if (typeof date === 'string') {
      date = new Date(date);
    }
    if (!(date instanceof Date) || isNaN(date)) return '';
    
    return date.toLocaleString(this.currentLanguage === 'ru' ? 'ru-RU' : 'en-US');
  }
  
  formatNumber(num) {
    if (typeof num !== 'number') return num;
    return num.toLocaleString(this.currentLanguage === 'ru' ? 'ru-RU' : 'en-US');
  }
}

// Complete StateManager
class StateManager {
  constructor() {
    // Load saved settings from localStorage
    const savedTheme = localStorage.getItem('ankiStats_theme') || localStorage.getItem('anki-stats-theme') || 'dark';
    const savedLanguage = localStorage.getItem('ankiStats_language') || localStorage.getItem('anki-stats-language') || 'en';
    
    this.state = {
      theme: ['dark', 'light'].includes(savedTheme) ? savedTheme : 'dark',
      language: ['en', 'ru'].includes(savedLanguage) ? savedLanguage : 'en',
      filters: {
        selectedDecks: [],
        selectedLevels: [],
        searchQuery: '',
        dateRange: {
          start: null,
          end: null
        }
      },
      chartStates: {
        timelineZoom: 'month',
        timelineMetrics: ['reviews', 'newCards', 'matured'],
        heatmapYear: new Date().getFullYear(),
        pieChartExpanded: false,
        deckChartSortBy: 'name',
        deckChartSortOrder: 'asc'
      },
      tableStates: {
        sortColumn: 'lastReview',
        sortOrder: 'desc',
        pageSize: 50,
        currentPage: 1
      },
      uiStates: {
        sidebarCollapsed: false,
        activeTab: 'overview',
        lastDataUpdate: null
      }
    };
    this.subscribers = {};
  }
  
  getState(path) {
    const keys = path.split('.');
    let value = this.state;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    return value;
  }
  
  updateFilters(filters) {
    this.state.filters = { ...this.state.filters, ...filters };
    this.notifySubscribers('filterChange');
  }
  
  updateChartState(chartState) {
    this.state.chartStates = { ...this.state.chartStates, ...chartState };
    this.notifySubscribers('chartStateChange');
  }
  
  updateUIState(uiState) {
    this.state.uiStates = { ...this.state.uiStates, ...uiState };
  }
  
  toggleLevelFilter(level) {
    const selectedLevels = this.state.filters.selectedLevels || [];
    const index = selectedLevels.indexOf(level);
    if (index > -1) {
      selectedLevels.splice(index, 1);
    } else {
      selectedLevels.push(level);
    }
    this.updateFilters({ selectedLevels });
  }
  
  toggleDeckFilter(deck) {
    const selectedDecks = this.state.filters.selectedDecks || [];
    const index = selectedDecks.indexOf(deck);
    if (index > -1) {
      selectedDecks.splice(index, 1);
    } else {
      selectedDecks.push(deck);
    }
    this.updateFilters({ selectedDecks });
  }
  
  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.notifySubscribers('themeChange');
    // Save to localStorage
    localStorage.setItem('ankiStats_theme', this.state.theme);
    return this.state.theme;
  }
  
  setLanguage(language) {
    if (['en', 'ru'].includes(language)) {
      this.state.language = language;
      this.notifySubscribers('languageChange');
      // Save to localStorage
      localStorage.setItem('ankiStats_language', this.state.language);
    }
  }
  
  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
  }
  
  notifySubscribers(event) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach(callback => {
        try {
          // Pass state information based on event type
          if (event === 'themeChange') {
            callback({ newState: { theme: this.state.theme } });
          } else if (event === 'languageChange') {
            callback({ newState: { language: this.state.language } });
          } else if (event === 'filterChange') {
            callback({ newState: { filters: this.state.filters } });
          } else {
            callback({ newState: this.state });
          }
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }
  
  getDebugInfo() {
    return {
      state: this.state,
      subscriberCount: Object.keys(this.subscribers).length
    };
  }
}

// Load the other classes by importing their text content and creating them
async function loadModules() {
    // Import full I18n class with complete translations
    const { I18n: FullI18n } = await import('./translations.js');
    window.I18n = FullI18n;
    
    // Make the basic classes available globally
    window.StateManager = StateManager;
    
    // Import DataParser class
    const { DataParser } = await import('./data-parser.js');
    window.DataParser = DataParser;
    
    // Import ChartsManager class  
    const { ChartsManager } = await import('./charts.js');
    window.ChartsManager = ChartsManager;
    
    // Import AnkiStatsApp class
    const { AnkiStatsApp } = await import('./app.js');
    window.AnkiStatsApp = AnkiStatsApp;
}

// Import and initialize the application
async function initializeApp() {
    console.log('Starting AnkiStatsApp...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    try {
        // Load modules
        await loadModules();
        
        // Initialize the app immediately - let it handle missing elements gracefully
        window.app = new window.AnkiStatsApp();
        await window.app.init();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Show user-friendly error
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #e74c3c;">
                <h2>Error Loading Application</h2>
                <p>There was an error loading the Anki Stats Dashboard.</p>
                <p>Error: ${error.message}</p>
                <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer;">Reload Page</button>
            </div>
        `;
    }
}

// Start the application
initializeApp().catch(console.error);