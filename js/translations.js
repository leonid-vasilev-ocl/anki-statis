/**
 * Internationalization system for Anki Stats Dashboard
 * Supports English (en) and Russian (ru) languages
 */

const translations = {
  en: {
    // Page Title
    title: "Anki Statistics Dashboard",
    
    // Navigation & Controls
    language: {
      english: "English",
      russian: "Русский"
    },
    
    // Filters
    filters: {
      allDecks: "All Decks",
      allLevels: "All Levels",
      searchCards: "Search cards...",
      clear: "Clear Filters",
      dateRange: "Date Range",
      from: "From",
      to: "To"
    },
    
    // Chart Titles
    charts: {
      levelDistribution: "Card Level Distribution",
      deckPerformance: "Deck Performance",
      studyTimeline: "Study Timeline",
      activityHeatmap: "Study Activity Heatmap",
      cardExplorer: "Card Explorer"
    },
    
    // Anki Levels
    levels: {
      "New": "New",
      "Learning": "Learning",
      "Young": "Young", 
      "Mature": "Mature",
      "Relearning": "Relearning",
      "Suspended": "Suspended",
      "Scheduler Buried": "Buried (Scheduler)",
      "User Buried": "Buried (User)"
    },
    
    // Timeline Controls
    timeline: {
      week: "Week",
      month: "Month",
      year: "Year",
      reviews: "Reviews",
      newCards: "New Cards",
      matured: "Became Mature"
    },
    
    // Table Headers
    table: {
      finnish: "Finnish",
      translation: "Translation", 
      level: "Level",
      deck: "Deck",
      lastReview: "Last Review",
      firstStudy: "First Study",
      actions: "Actions"
    },
    
    // Statistics
    stats: {
      totalCards: "Total Cards",
      studiedToday: "Studied Today",
      averageDaily: "Daily Average",
      longestStreak: "Longest Streak",
      currentStreak: "Current Streak",
      newWordsToday: "New Words Today",
      newWordsThisWeek: "New Words This Week",
      cards: "cards",
      days: "days",
      words: "words"
    },
    
    // Messages
    messages: {
      loading: "Loading data...",
      noData: "No data available",
      error: "Error loading data",
      noResults: "No cards match your filters",
      cardDetails: "Card Details",
      exportData: "Export Data"
    },
    
    // Pagination
    pagination: {
      first: "First",
      previous: "Previous",
      next: "Next",
      last: "Last",
      page: "Page",
      of: "of",
      showing: "Showing",
      to: "to",
      entries: "entries",
      search: "Search:",
      lengthMenu: "Show _MENU_ entries",
      info: "Showing _START_ to _END_ of _TOTAL_ entries",
      infoEmpty: "Showing 0 to 0 of 0 entries",
      infoFiltered: "(filtered from _MAX_ total entries)",
      emptyTable: "No data available in table",
      all: "All"
    },
    
    // Tooltips
    tooltips: {
      darkMode: "Toggle dark mode",
      lightMode: "Toggle light mode",
      refresh: "Refresh data",
      export: "Export chart",
      filter: "Filter data"
    },
    
    // Time Periods
    time: {
      today: "Today",
      yesterday: "Yesterday",
      thisWeek: "This Week",
      lastWeek: "Last Week",
      thisMonth: "This Month",
      lastMonth: "Last Month"
    }
  },
  
  ru: {
    // Page Title
    title: "Панель статистики Anki",
    
    // Navigation & Controls  
    language: {
      english: "English",
      russian: "Русский"
    },
    
    // Filters
    filters: {
      allDecks: "Все колоды",
      allLevels: "Все уровни", 
      searchCards: "Поиск карт...",
      clear: "Очистить фильтры",
      dateRange: "Диапазон дат",
      from: "С",
      to: "До"
    },
    
    // Chart Titles
    charts: {
      levelDistribution: "Распределение по уровням карт",
      deckPerformance: "Производительность колод",
      studyTimeline: "График изучения",
      activityHeatmap: "Карта активности изучения",
      cardExplorer: "Обозреватель карт"
    },
    
    // Anki Levels
    levels: {
      "New": "Новые",
      "Learning": "Изучение",
      "Young": "Молодые",
      "Mature": "Зрелые", 
      "Relearning": "Переизучение",
      "Suspended": "Приостановленные",
      "Scheduler Buried": "Скрытые (планировщик)",
      "User Buried": "Скрытые (пользователь)"
    },
    
    // Timeline Controls
    timeline: {
      week: "Неделя",
      month: "Месяц", 
      year: "Год",
      reviews: "Повторения",
      newCards: "Новые карты",
      matured: "Стали зрелыми"
    },
    
    // Table Headers
    table: {
      finnish: "Финский",
      translation: "Перевод",
      level: "Уровень", 
      deck: "Колода",
      lastReview: "Последнее повторение",
      firstStudy: "Первое изучение",
      actions: "Действия"
    },
    
    // Statistics
    stats: {
      totalCards: "Всего карт",
      studiedToday: "Изучено сегодня",
      averageDaily: "Среднее в день",
      longestStreak: "Самая длинная серия",
      currentStreak: "Текущая серия",
      newWordsToday: "Новых слов сегодня",
      newWordsThisWeek: "Новых слов на этой неделе",
      cards: "карт",
      days: "дней",
      words: "слов"
    },
    
    // Messages
    messages: {
      loading: "Загрузка данных...",
      noData: "Нет доступных данных",
      error: "Ошибка загрузки данных",
      noResults: "Карты не найдены по вашим фильтрам",
      cardDetails: "Детали карты",
      exportData: "Экспорт данных"
    },
    
    // Pagination
    pagination: {
      first: "Первая",
      previous: "Предыдущая",
      next: "Следующая",
      last: "Последняя",
      page: "Страница",
      of: "из",
      showing: "Показано",
      to: "до",
      entries: "записей",
      search: "Поиск:",
      lengthMenu: "Показать _MENU_ записей",
      info: "Показано с _START_ по _END_ из _TOTAL_ записей",
      infoEmpty: "Показано с 0 по 0 из 0 записей",
      infoFiltered: "(отфильтровано из _MAX_ записей)",
      emptyTable: "В таблице нет данных",
      all: "Все"
    },
    
    // Tooltips
    tooltips: {
      darkMode: "Переключить тёмную тему",
      lightMode: "Переключить светлую тему", 
      refresh: "Обновить данные",
      export: "Экспорт графика",
      filter: "Фильтр данных"
    },
    
    // Time Periods
    time: {
      today: "Сегодня",
      yesterday: "Вчера",
      thisWeek: "На этой неделе",
      lastWeek: "На прошлой неделе", 
      thisMonth: "В этом месяце",
      lastMonth: "В прошлом месяце"
    }
  }
};

/**
 * Internationalization class for managing translations
 */
class I18n {
  constructor() {
    this.currentLang = this.loadLanguage();
    this.observers = new Set();
  }
  
  /**
   * Get translated text for a given key
   * @param {string} key - Translation key (e.g., 'charts.levelDistribution')
   * @param {Object} params - Parameters for string interpolation
   * @returns {string} Translated text
   */
  t(key, params = {}) {
    const translation = this.getTranslation(key);
    return this.interpolate(translation, params);
  }
  
  /**
   * Get translation for a key, with fallback to English
   * @param {string} key - Translation key
   * @returns {string} Translation text
   */
  getTranslation(key) {
    const currentTranslations = translations[this.currentLang];
    const englishTranslations = translations.en;
    
    // Navigate through nested object using dot notation
    const getValue = (obj, path) => {
      return path.split('.').reduce((current, prop) => current?.[prop], obj);
    };
    
    return getValue(currentTranslations, key) || 
           getValue(englishTranslations, key) || 
           key;
  }
  
  /**
   * Interpolate parameters into translation string
   * @param {string} text - Text with placeholders like {{param}}
   * @param {Object} params - Parameters to replace
   * @returns {string} Interpolated text
   */
  interpolate(text, params) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || match);
  }
  
  /**
   * Set current language and notify observers
   * @param {string} lang - Language code ('en' or 'ru')
   */
  setLanguage(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      this.saveLanguage(lang);
      this.notifyObservers();
      this.updateUI();
    }
  }
  
  /**
   * Get current language code
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLang;
  }
  
  /**
   * Get list of available languages
   * @returns {Array} Array of language objects
   */
  getAvailableLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' }
    ];
  }
  
  /**
   * Load language from localStorage
   * @returns {string} Saved language or default 'en'
   */
  loadLanguage() {
    return localStorage.getItem('anki-stats-language') || 'en';
  }
  
  /**
   * Save language to localStorage
   * @param {string} lang - Language code to save
   */
  saveLanguage(lang) {
    localStorage.setItem('anki-stats-language', lang);
  }
  
  /**
   * Subscribe to language changes
   * @param {Function} callback - Callback function to execute on language change
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }
  
  /**
   * Notify all observers of language change
   */
  notifyObservers() {
    this.observers.forEach(callback => callback(this.currentLang));
  }
  
  /**
   * Update UI elements with data-i18n attributes
   */
  updateUI() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });
    
    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });
    
    // Update elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
    
    // Update page title
    document.title = this.t('title');
    
    // Update language attribute
    document.documentElement.lang = this.currentLang;
  }
  
  /**
   * Format number according to current locale
   * @param {number} number - Number to format
   * @param {Object} options - Intl.NumberFormat options
   * @returns {string} Formatted number
   */
  formatNumber(number, options = {}) {
    const locale = this.currentLang === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.NumberFormat(locale, options).format(number);
  }
  
  /**
   * Format date according to current locale
   * @param {Date|string} date - Date to format
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date
   */
  formatDate(date, options = {}) {
    const locale = this.currentLang === 'ru' ? 'ru-RU' : 'en-US';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };
    
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
  }
  
  /**
   * Get relative time string (e.g., "2 days ago")
   * @param {Date|string} date - Date to compare
   * @returns {string} Relative time string
   */
  getRelativeTime(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now - dateObj;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return this.t('time.today');
    if (diffDays === 1) return this.t('time.yesterday');
    if (diffDays <= 7) return `${diffDays} ${this.t('stats.days')} ${this.currentLang === 'ru' ? 'назад' : 'ago'}`;
    
    return this.formatDate(dateObj);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18n, translations };
}

// ES6 module export
export { I18n, translations };