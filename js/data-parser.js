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
   * Parse CSV text into structured data
   * @param {string} csvText - Raw CSV text
   * @returns {Array} Array of card objects
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const card = {};
        headers.forEach((header, index) => {
          card[header] = values[index];
        });
        data.push(this.processCard(card));
      }
    }

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

    return {
      ...card,
      noteId: card.note_id,
      ankiLevel: card.anki_level,
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
    const processedActivity = {};

    for (const [date, activities] of Object.entries(activityLog)) {
      processedActivity[date] = {
        date: new Date(date),
        reviews: activities.reviews || [],
        newStudies: activities.new_studies || [],
        totalActivity: (activities.reviews?.length || 0) + (activities.new_studies?.length || 0)
      };
    }

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
      const level = card.ankiLevel || card.anki_level;
      distribution[level] = (distribution[level] || 0) + 1;
    });

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
      const level = card.ankiLevel || card.anki_level;
      deckData[deckName].levels[level] = (deckData[deckName].levels[level] || 0) + 1;
    });

    return Object.values(deckData).sort((a, b) => b.total - a.total);
  }

  /**
   * Get timeline data from activity log
   * @param {string} timeframe - 'week', 'month', or 'year'
   * @returns {Object} Timeline data
   */
  getTimelineData(timeframe = 'month') {
    if (!this.historyData) return { labels: [], datasets: [] };

    const now = new Date();
    const timelineData = {};

    // Generate date range based on timeframe
    const dates = this.generateDateRange(timeframe, now);

    dates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const activity = this.historyData[dateStr];

      timelineData[dateStr] = {
        date,
        reviews: activity?.reviews.length || 0,
        newCards: activity?.newStudies.length || 0,
        matured: 0 // This would need more complex logic to determine
      };
    });

    const labels = dates.map(date => this.formatDateForTimeline(date, timeframe));

    return {
      labels,
      datasets: [
        {
          label: 'Reviews',
          data: dates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            return timelineData[dateStr].reviews;
          }),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: 'New Cards',
          data: dates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
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
   * @returns {string} Formatted date
   */
  formatDateForTimeline(date, timeframe) {
    switch (timeframe) {
      case 'week':
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'year':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  /**
   * Get heatmap data for a specific year
   * @param {number} year - Year to generate heatmap for
   * @returns {Array} Heatmap data
   */
  getHeatmapData(year = new Date().getFullYear()) {
    if (!this.historyData) return [];

    const heatmapData = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
      const dateStr = current.toISOString().split('T')[0];
      const activity = this.historyData[dateStr];
      const totalActivity = activity?.totalActivity || 0;

      heatmapData.push({
        date: new Date(current),
        dateStr,
        activity: totalActivity,
        intensity: this.getIntensityLevel(totalActivity)
      });
    }

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
        const level = card.ankiLevel || card.anki_level;
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

      return true;
    });
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
        currentStreak: 0
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

    return {
      totalCards: cards.length,
      studiedToday,
      averageDaily,
      longestStreak: 0, // Would need more complex calculation
      currentStreak: 0  // Would need more complex calculation
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataParser };
}
