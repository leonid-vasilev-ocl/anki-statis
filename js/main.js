/**
 * Main entry point for Anki Stats Dashboard
 * Uses proper ES6 imports for Vite
 */

import Chart from 'chart.js/auto';

// Make Chart available globally for the existing code
window.Chart = Chart;

// Import all modules directly - we'll need to convert them to ES6 modules
// For now, let's inline the essential classes to get it working

// I18n class (complete version)
class I18n {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {
      en: {
        title: 'Anki Statistics Dashboard',
        'charts.levelDistribution': 'Card Level Distribution',
        'charts.deckPerformance': 'Deck Performance',
        'charts.studyTimeline': 'Study Timeline',
        'charts.activityHeatmap': 'Study Activity Heatmap',
        'charts.cardExplorer': 'Card Explorer',
        'levels.New': 'New',
        'levels.Learning': 'Learning',
        'levels.Young': 'Young',
        'levels.Mature': 'Mature',
        'levels.Relearning': 'Relearning',
        'levels.Suspended': 'Suspended',
        'levels.Scheduler Buried': 'Buried',
        'levels.User Buried': 'User Buried',
        'filters.allDecks': 'All Decks',
        'filters.allLevels': 'All Levels',
        'filters.searchCards': 'Search cards...',
        'filters.clear': 'Clear',
        'timeline.week': 'Week',
        'timeline.month': 'Month', 
        'timeline.year': 'Year',
        'table.finnish': 'Finnish',
        'table.translation': 'Translation',
        'table.level': 'Level',
        'table.deck': 'Deck',
        'table.lastReview': 'Last Review'
      },
      ru: {
        title: 'Панель статистики Anki',
        'charts.levelDistribution': 'Распределение уровней карт',
        'charts.deckPerformance': 'Производительность колод',
        'charts.studyTimeline': 'График изучения',
        'charts.activityHeatmap': 'Тепловая карта активности',
        'charts.cardExplorer': 'Исследователь карт',
        'levels.New': 'Новые',
        'levels.Learning': 'Изучение',
        'levels.Young': 'Молодые',
        'levels.Mature': 'Зрелые',
        'levels.Relearning': 'Переизучение',
        'levels.Suspended': 'Приостановленные',
        'levels.Scheduler Buried': 'Скрытые',
        'levels.User Buried': 'Скрытые пользователем',
        'filters.allDecks': 'Все колоды',
        'filters.allLevels': 'Все уровни',
        'filters.searchCards': 'Поиск карт...',
        'filters.clear': 'Очистить',
        'timeline.week': 'Неделя',
        'timeline.month': 'Месяц',
        'timeline.year': 'Год',
        'table.finnish': 'Финский',
        'table.translation': 'Перевод',
        'table.level': 'Уровень',
        'table.deck': 'Колода',
        'table.lastReview': 'Последний просмотр'
      }
    };
  }
  
  t(key) {
    return this.translations[this.currentLanguage][key] || key;
  }
  
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
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
    this.state = {
      theme: 'dark',
      language: 'en',
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
  
  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
  }
  
  notifySubscribers(event) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach(callback => callback());
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
    // Make the basic classes available globally first
    window.I18n = I18n;
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
        
        // Check if elements exist
        const levelChart = document.getElementById('levelChart');
        const deckChart = document.getElementById('deckChart');
        const timelineChart = document.getElementById('timelineChart');
        const heatmapChart = document.getElementById('heatmapChart');
        
        console.log('DOM Elements check:', {
            levelChart: !!levelChart,
            deckChart: !!deckChart,
            timelineChart: !!timelineChart,
            heatmapChart: !!heatmapChart
        });
        
        if (!levelChart || !deckChart || !timelineChart || !heatmapChart) {
            console.error('Chart elements not found in DOM');
            console.log('Available elements with ID:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
            return;
        }
        
        // Initialize the app
        window.app = new window.AnkiStatsApp();
        await window.app.init();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

// Start the application
initializeApp().catch(console.error);