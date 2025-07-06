/**
 * Data parsing and processing functions for Anki Stats Dashboard
 * Handles CSV parsing, data transformation, and filtering
 */

/**
 * CSV Parser class for handling Anki export data
 */
class DataParser {
  constructor() {
    this.rawData = null;
    this.processedData = null;
    this.historyData = null;
  }

  /**
   * Convert date to local date string (YYYY-MM-DD) without timezone conversion
   * @param {Date} date - Date object
   * @returns {string} Local date string in YYYY-MM-DD format
   */
  toLocalDateString(date) {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  }

  /**
   * Parse CSV text into structured data
   * @param {string} csvText - Raw CSV text
   * @returns {Array} Array of card objects
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const data = [];

    console.log('CSV Headers found:', headers);
    console.log('Total CSV lines to process:', lines.length - 1);

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const card = {};
        headers.forEach((header, index) => {
          card[header] = values[index];
        });
        data.push(this.processCard(card));
      } else {
        console.warn(`Line ${i + 1} has ${values.length} values but expected ${headers.length} - skipping`);
      }
    }

    console.log(`Successfully parsed ${data.length} cards from CSV`);
    this.rawData = data;
    return data;
  }

  /**
   * Parse a single CSV line, handling quoted values
   * @param {string} line - CSV line
   * @returns {Array} Array of values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Process individual card data
   * @param {Object} card - Raw card data
   * @returns {Object} Processed card data
   */
  processCard(card) {
    // Debug log first few cards to understand data structure
    if (this.rawData && this.rawData.length < 3) {
      console.log('Card structure debug:', card);
    }
    
    // Parse JSON fields if present
    let fieldsData = {};
    try {
      if (card.fields) {
        fieldsData = JSON.parse(card.fields);
      }
    } catch (error) {
      console.warn('Failed to parse fields JSON:', error);
    }

    // Process dates
    const firstStudyDate = card.first_study_date ? new Date(card.first_study_date) : null;
    const lastReviewDate = card.last_review_date ? new Date(card.last_review_date) : null;

    // Handle level field with multiple fallbacks
    let ankiLevel = card.anki_level || card.ankiLevel || card.level || card.Level;
    if (!ankiLevel || ankiLevel === undefined || ankiLevel === null || ankiLevel === '') {
      console.warn('Missing anki_level for card:', card.note_id, 'Available fields:', Object.keys(card));
      ankiLevel = 'Unknown';
    }

    return {
      ...card,
      noteId: card.note_id,
      ankiLevel: ankiLevel,
      deckName: card.deck_name,
      firstStudyDate,
      lastReviewDate,
      finnish: card.finnish || '',
      translation: card.translation || '',
      fields: fieldsData,

      // Additional computed properties
      daysSinceFirstStudy: firstStudyDate ? Math.floor((new Date() - firstStudyDate) / (1000 * 60 * 60 * 24)) : null,
      daysSinceLastReview: lastReviewDate ? Math.floor((new Date() - lastReviewDate) / (1000 * 60 * 60 * 24)) : null,
      deckHierarchy: card.deck_name ? card.deck_name.split('::') : [],
      isOverdue: this.isCardOverdue(card.anki_level, lastReviewDate),
      studyStreak: this.calculateStudyStreak(firstStudyDate, lastReviewDate)
    };
  }

  /**
   * Determine if a card is overdue based on level and last review
   * @param {string} level - Anki level
   * @param {Date} lastReview - Last review date
   * @returns {boolean} Whether card is overdue
   */
  isCardOverdue(level, lastReview) {
    if (!lastReview) return false;

    const daysSince = Math.floor((new Date() - lastReview) / (1000 * 60 * 60 * 24));

    switch (level) {
      case 'New': return false;
      case 'Learning': return daysSince > 1;
      case 'Young': return daysSince > 7;
      case 'Mature': return daysSince > 21;
      case 'Relearning': return daysSince > 1;
      default: return false;
    }
  }

  /**
   * Calculate study streak (simplified)
   * @param {Date} firstStudy - First study date
   * @param {Date} lastReview - Last review date  
   * @returns {number} Study streak in days
   */
  calculateStudyStreak(firstStudy, lastReview) {
    if (!firstStudy || !lastReview) return 0;
    return Math.floor((lastReview - firstStudy) / (1000 * 60 * 60 * 24));
  }

  /**
   * Load and parse activity log data
   * @param {Object} activityLog - Activity log JSON
   * @returns {Object} Processed activity data
   */
  parseActivityLog(activityLog) {
    console.log('parseActivityLog called with:', Object.keys(activityLog || {}).length, 'days');
    
    const processedActivity = {};

    for (const [date, activities] of Object.entries(activityLog)) {
      const reviewsCount = activities.reviews?.length || 0;
      const newStudiesCount = activities.new_studies?.length || 0;
      const totalActivity = reviewsCount + newStudiesCount;
      
      processedActivity[date] = {
        date: new Date(date),
        reviews: activities.reviews || [],
        newStudies: activities.new_studies || [],
        totalActivity: totalActivity
      };
      
      if (totalActivity > 0) {
        console.log(`Activity for ${date}: ${reviewsCount} reviews + ${newStudiesCount} new studies = ${totalActivity} total`);
      }
    }

    console.log('Processed activity data:', Object.keys(processedActivity).length, 'days');

    this.historyData = processedActivity;
    return processedActivity;
  }

  /**
   * Get level distribution data
   * @param {Array} cards - Card data
   * @returns {Object} Level distribution
   */
  getLevelDistribution(cards = this.rawData) {
    if (!cards) return {};

    const distribution = {};
    cards.forEach(card => {
      // Try multiple field names and provide fallback
      let level = card.ankiLevel || card.anki_level || card.level || card.Level;
      
      // If still undefined, use a fallback based on other fields or default
      if (!level || level === undefined || level === null) {
        console.warn('Card missing level field:', card);
        level = 'Unknown';
      }
      
      distribution[level] = (distribution[level] || 0) + 1;
    });

    console.log('Level distribution calculated:', distribution);
    return distribution;
  }

  /**
   * Get deck performance data
   * @param {Array} cards - Card data
   * @returns {Array} Deck performance data
   */
  getDeckPerformance(cards = this.rawData) {
    if (!cards) return [];

    const deckData = {};

    cards.forEach(card => {
      const deckName = card.deckName || card.deck_name;
      if (!deckData[deckName]) {
        deckData[deckName] = {
          name: deckName,
          total: 0,
          levels: {}
        };
      }

      deckData[deckName].total++;
      let level = card.ankiLevel || card.anki_level || card.level || card.Level;
      if (!level || level === undefined || level === null) {
        level = 'Unknown';
      }
      deckData[deckName].levels[level] = (deckData[deckName].levels[level] || 0) + 1;
    });

    return Object.values(deckData).sort((a, b) => b.total - a.total);
  }

  /**
   * Get timeline data from activity log
   * @param {string} timeframe - 'week', 'month', or 'year'
   * @param {string} locale - Locale for date formatting
   * @returns {Object} Timeline data
   */
  getTimelineData(timeframe = 'month', locale = 'en-US') {
    if (!this.historyData) return { labels: [], datasets: [] };

    const now = new Date();
    const timelineData = {};

    // Generate date range based on timeframe
    const dates = this.generateDateRange(timeframe, now);

    dates.forEach(date => {
      const dateStr = this.toLocalDateString(date);
      const activity = this.historyData[dateStr];

      timelineData[dateStr] = {
        date,
        reviews: activity?.reviews.length || 0,
        newCards: activity?.newStudies.length || 0,
        matured: 0 // This would need more complex logic to determine
      };
    });

    const labels = dates.map(date => this.formatDateForTimeline(date, timeframe, locale));

    return {
      labels,
      datasets: [
        {
          label: 'Reviews', // Will be translated in ChartsManager
          data: dates.map(date => {
            const dateStr = this.toLocalDateString(date);
            return timelineData[dateStr].reviews;
          }),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: 'New Cards', // Will be translated in ChartsManager
          data: dates.map(date => {
            const dateStr = this.toLocalDateString(date);
            return timelineData[dateStr].newCards;
          }),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }
      ]
    };
  }

  /**
   * Generate date range for timeline
   * @param {string} timeframe - Time period
   * @param {Date} endDate - End date
   * @returns {Array} Array of dates
   */
  generateDateRange(timeframe, endDate) {
    const dates = [];
    const end = new Date(endDate);

    let start, increment;

    switch (timeframe) {
      case 'week':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        increment = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
        increment = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'year':
        start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
        increment = 7 * 24 * 60 * 60 * 1000; // 1 week
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        increment = 24 * 60 * 60 * 1000;
    }

    for (let current = new Date(start); current <= end; current = new Date(current.getTime() + increment)) {
      dates.push(new Date(current));
    }

    return dates;
  }

  /**
   * Format date for timeline labels
   * @param {Date} date - Date to format
   * @param {string} timeframe - Time period
   * @param {string} locale - Locale for formatting
   * @returns {string} Formatted date
   */
  formatDateForTimeline(date, timeframe, locale = 'en-US') {
    switch (timeframe) {
      case 'week':
        return date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      case 'year':
        return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
      default:
        return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    }
  }

  /**
   * Get heatmap data for a specific year
   * @param {number} year - Year to generate heatmap for
   * @returns {Array} Heatmap data
   */
  getHeatmapData(year = new Date().getFullYear()) {
    console.log('getHeatmapData called for year:', year);
    console.log('historyData available:', !!this.historyData);
    console.log('historyData keys:', Object.keys(this.historyData || {}));
    
    if (!this.historyData) {
      console.log('No historyData available for heatmap');
      return [];
    }

    const heatmapData = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    let activeDaysFound = 0;

    for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
      const dateStr = this.toLocalDateString(current);
      const activity = this.historyData[dateStr];
      const totalActivity = activity?.totalActivity || 0;
      
      if (totalActivity > 0) {
        activeDaysFound++;
        console.log(`Found activity for ${dateStr}: ${totalActivity}`);
      }

      heatmapData.push({
        date: new Date(current),
        dateStr,
        activity: totalActivity,
        intensity: this.getIntensityLevel(totalActivity)
      });
    }
    
    console.log(`Generated heatmap data: ${heatmapData.length} days, ${activeDaysFound} with activity`);
    return heatmapData;
  }

  /**
   * Get intensity level for heatmap coloring
   * @param {number} activity - Activity count
   * @returns {number} Intensity level (0-5)
   */
  getIntensityLevel(activity) {
    if (activity === 0) return 0;
    if (activity <= 5) return 1;
    if (activity <= 10) return 2;
    if (activity <= 20) return 3;
    if (activity <= 30) return 4;
    return 5;
  }

  /**
   * Filter cards based on criteria
   * @param {Array} cards - Cards to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered cards
   */
  filterCards(cards = this.rawData, filters = {}) {
    if (!cards) return [];

    return cards.filter(card => {
      // Deck filter
      if (filters.selectedDecks && filters.selectedDecks.length > 0) {
        const deckName = card.deckName || card.deck_name;
        if (!filters.selectedDecks.includes(deckName)) return false;
      }

      // Level filter
      if (filters.selectedLevels && filters.selectedLevels.length > 0) {
        let level = card.ankiLevel || card.anki_level || card.level || card.Level;
        if (!level || level === undefined || level === null) {
          level = 'Unknown';
        }
        if (!filters.selectedLevels.includes(level)) return false;
      }

      // Search filter
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const finnish = (card.finnish || '').toLowerCase();
        const translation = (card.translation || '').toLowerCase();

        if (!finnish.includes(query) && !translation.includes(query)) return false;
      }

      // Date range filter
      if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
        const cardDate = card.lastReviewDate || card.firstStudyDate;
        if (!cardDate) return false;

        if (filters.dateRange.start && cardDate < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange.end && cardDate > new Date(filters.dateRange.end)) return false;
      }

      // Stat-based filters
      if (filters.statFilter) {
        switch (filters.statFilter.type) {
          case 'newWordsToday':
            return this.isCardNewToday(card);
          case 'newWordsThisWeek':
            return this.isCardNewThisWeek(card);
          case 'studiedToday':
            return this.isCardStudiedToday(card);
          case 'totalCards':
            // No filter needed - all cards
            return true;
          default:
            return true;
        }
      }

      return true;
    });
  }

  /**
   * Check if card was studied for the first time today
   * @param {Object} card - Card data
   * @returns {boolean} True if card is new today
   */
  isCardNewToday(card) {
    if (!this.historyData) return false;
    
    const today = this.toLocalDateString(new Date());
    const todayActivity = this.historyData[today];
    
    if (!todayActivity || !todayActivity.newStudies) return false;
    
    const noteId = card.noteId || card.note_id;
    return todayActivity.newStudies.some(study => 
      (study.note_id || study.noteId) === noteId
    );
  }

  /**
   * Check if card was studied for the first time this week
   * @param {Object} card - Card data
   * @returns {boolean} True if card is new this week
   */
  isCardNewThisWeek(card) {
    if (!this.historyData) return false;
    
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const noteId = card.noteId || card.note_id;
    
    for (let date = new Date(startOfWeek); date <= today; date.setDate(date.getDate() + 1)) {
      const dateStr = this.toLocalDateString(date);
      const dayActivity = this.historyData[dateStr];
      
      if (dayActivity && dayActivity.newStudies) {
        const found = dayActivity.newStudies.some(study => 
          (study.note_id || study.noteId) === noteId
        );
        if (found) return true;
      }
    }
    
    return false;
  }

  /**
   * Check if card was studied (reviewed) today
   * @param {Object} card - Card data
   * @returns {boolean} True if card was studied today
   */
  isCardStudiedToday(card) {
    const today = new Date().toDateString();
    const lastReview = card.lastReviewDate;
    return lastReview && lastReview.toDateString() === today;
  }

  /**
   * Get unique deck names from cards
   * @param {Array} cards - Card data
   * @returns {Array} Unique deck names
   */
  getUniqueDecks(cards = this.rawData) {
    if (!cards) return [];

    const decks = new Set();
    cards.forEach(card => {
      const deckName = card.deckName || card.deck_name;
      if (deckName) decks.add(deckName);
    });

    return Array.from(decks).sort();
  }

  /**
   * Get unique levels from cards
   * @param {Array} cards - Card data
   * @returns {Array} Unique levels
   */
  getUniqueLevels(cards = this.rawData) {
    if (!cards) return [];

    const levels = new Set();
    cards.forEach(card => {
      const level = card.ankiLevel || card.anki_level;
      if (level) levels.add(level);
    });

    return Array.from(levels).sort();
  }

  /**
   * Get new words statistics from activity data
   * @returns {Object} New words statistics
   */
  getNewWordsStats() {
    if (!this.historyData) {
      return {
        newWordsToday: 0,
        newWordsThisWeek: 0
      };
    }

    const today = new Date();
    const todayStr = this.toLocalDateString(today);
    
    // Calculate start of this week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get today's new words
    const todayActivity = this.historyData[todayStr];
    const newWordsToday = todayActivity?.newStudies?.length || 0;

    // Get this week's new words
    let newWordsThisWeek = 0;
    for (let date = new Date(startOfWeek); date <= today; date.setDate(date.getDate() + 1)) {
      const dateStr = this.toLocalDateString(date);
      const dayActivity = this.historyData[dateStr];
      if (dayActivity?.newStudies) {
        newWordsThisWeek += dayActivity.newStudies.length;
      }
    }

    return {
      newWordsToday,
      newWordsThisWeek
    };
  }

  /**
   * Get summary statistics
   * @param {Array} cards - Card data
   * @returns {Object} Summary statistics
   */
  getSummaryStats(cards = this.rawData) {
    if (!cards || cards.length === 0) {
      return {
        totalCards: 0,
        studiedToday: 0,
        averageDaily: 0,
        longestStreak: 0,
        currentStreak: 0,
        newWordsToday: 0,
        newWordsThisWeek: 0
      };
    }

    const today = new Date().toDateString();
    const studiedToday = cards.filter(card => {
      const lastReview = card.lastReviewDate;
      return lastReview && lastReview.toDateString() === today;
    }).length;

    // Calculate average daily activity from history
    let averageDaily = 0;
    if (this.historyData) {
      const totalDays = Object.keys(this.historyData).length;
      const totalActivity = Object.values(this.historyData).reduce((sum, day) => sum + day.totalActivity, 0);
      averageDaily = totalDays > 0 ? Math.round(totalActivity / totalDays) : 0;
    }

    // Get new words statistics
    const newWordsStats = this.getNewWordsStats();

    return {
      totalCards: cards.length,
      studiedToday,
      averageDaily,
      longestStreak: 0, // Would need more complex calculation
      currentStreak: 0,  // Would need more complex calculation
      ...newWordsStats
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataParser };
}

// ES6 export
export { DataParser };
