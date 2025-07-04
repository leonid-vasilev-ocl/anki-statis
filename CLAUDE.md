# Anki Statistics Dashboard - Project Memory

## Project Overview
This is a modern, interactive web dashboard for visualizing Anki learning statistics with Russian/English internationalization, dark/light themes, and comprehensive study activity tracking.

## Important Architecture Decisions

### File Path Resolution Issues (CRITICAL)
The application has different file serving behavior between dev and production modes:
- **Dev mode** (`npm run dev`): Serves files from root directory
- **Preview mode** (`npm run preview`): Serves from `dist/` with different path resolution

**Fix implemented**: Multiple fallback paths for asset loading:
```javascript
const activityPaths = [
  '/activity_log.json',     // Production build path
  './activity_log.json',    // Relative path fallback
  'activity_log.json'       // Root fallback
];
```

### Data Processing Pipeline

#### 1. Data Sources
- **Primary**: `anki_stats.csv` - Current Anki card export with fields:
  - `note_id` (unique identifier)
  - `anki_level` (New, Learning, Young, Mature, Relearning, Suspended, etc.)
  - `deck_name` (hierarchical deck names with `::` separators)
  - `first_study_date` (when card was first studied)
  - `last_review_date` (most recent review)
  - `finnish` (front of card)
  - `translation` (back of card)
  - `fields` (JSON string with additional card data)

- **Secondary**: `activity_log.json` - Historical study activity tracking:
  ```json
  {
    "metadata": {
      "created": "ISO timestamp",
      "last_updated": "ISO timestamp", 
      "total_days_tracked": number,
      "version": "1.0"
    },
    "daily_activity": {
      "YYYY-MM-DD": {
        "reviews": [...],      // Cards reviewed that day
        "new_studies": [...],  // Cards studied for first time
        "level_changes": [...], // Cards that changed levels
        "stats": {...}         // Daily summary stats
      }
    }
  }
  ```

#### 2. Data Update Automation
**Daily Update Script** (`scripts/daily_update.sh`):
1. Exports fresh data from Anki database using custom Python script
2. Compares with previous export to detect changes (`detect_changes.py`)
3. Updates activity log with new study activity (`update_activity_log.py`)
4. Creates backups and deploys to frontend

**Change Detection** (`scripts/detect_changes.py`):
- Compares yesterday's export with today's to detect:
  - New reviews (updated `last_review_date`)
  - New studies (updated `first_study_date`)
  - Level changes (changed `anki_level`)

**Activity Log Updates** (`scripts/update_activity_log.py`):
- Maintains comprehensive history of all study activity
- Groups activities by date for timeline and heatmap visualizations
- Handles deduplication and data cleanup

### Frontend Architecture

#### Core Components
1. **App.js** - Main application controller and state coordinator
2. **DataParser.js** - CSV parsing, data processing, and filtering logic
3. **ChartsManager.js** - Chart.js integration and visualization management
4. **StateManager.js** - localStorage persistence and reactive state updates
5. **Translations.js** - Complete i18n system with English/Russian support

#### Key Features Implemented

**Clickable Stat Counters** (Recently Added):
- Click "New Words Today" to filter cards studied for first time today
- Click "New Words This Week" to filter cards studied for first time this week
- Click "Studied Today" to filter cards reviewed today
- Click "Total Cards" to clear stat-based filters
- Visual feedback with active state styling

**Smart Filtering System**:
- Deck filtering (supports hierarchical deck names)
- Level filtering (all Anki learning states)
- Text search (searches both Finnish and translation fields)
- Date range filtering
- Stat-based filtering (new feature)
- Cross-chart filtering (all visualizations update together)

**Production Build Considerations**:
- **Asset handling**: CSV/JSON files must be properly included in build
- **Path resolution**: Different behavior between dev/preview modes fixed
- **Data validation**: Fallback handling for missing/undefined fields
- **Error handling**: Graceful degradation when data loading fails

#### State Management
Uses custom StateManager with localStorage persistence:
```javascript
const defaultState = {
  theme: 'dark',
  language: 'en', 
  filters: {
    selectedDecks: [],
    selectedLevels: [],
    searchQuery: '',
    dateRange: { start: null, end: null },
    statFilter: null  // New: stat-based filtering
  },
  chartStates: { /* chart-specific settings */ },
  tableStates: { /* pagination and sorting */ },
  uiStates: { /* UI preferences */ }
};
```

#### Internationalization System
Complete bilingual support (English/Russian):
- Structured translation keys with dot notation (`stats.newWordsToday`)
- Locale-specific number and date formatting
- Dynamic UI updates without page reload
- Fallback to English for missing translations

### Build Configuration (Vite)
```javascript
// Critical for production consistency
build: {
  copyPublicDir: true,  // Ensures static assets copied to dist
  rollupOptions: {
    output: {
      assetFileNames: (assetInfo) => {
        // Preserve original names for CSV/JSON for easier debugging
        if (assetInfo.name?.endsWith('.csv') || assetInfo.name?.endsWith('.json')) {
          return '[name][extname]';
        }
        return 'assets/[name]-[hash][extname]';
      }
    }
  }
}
```

## Common Issues and Solutions

### Production vs Development Inconsistencies
**Problem**: Different behavior between `npm run dev` and `npm run preview`
**Root Causes**:
1. File path resolution differences
2. Asset serving behavior
3. Build process variations

**Solutions Implemented**:
1. Multiple fallback paths for asset loading
2. Better error handling and logging
3. Data validation with fallback values
4. Improved Vite build configuration

### Data Field Access Issues
**Problem**: `undefined` values showing in UI (e.g., "LEVELS.UNDEFINED")
**Solution**: Multi-level fallback field access:
```javascript
let level = card.ankiLevel || card.anki_level || card.level || card.Level;
if (!level || level === undefined || level === null) {
  level = 'Unknown';
}
```

### New Words Counter Accuracy
**Problem**: Counters showed 0 when they should show actual counts
**Root Cause**: `charts.js` was calling `parseActivityLog` again with wrong data structure
**Solution**: Removed duplicate parsing call, rely on already processed data

## Development Commands

### Essential Commands
```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run preview      # Test production build (http://localhost:4173)

# Data Management
./deploy_manual.sh   # Complete data update and deployment
./scripts/daily_update.sh  # Update data only (no deployment)

# Manual data processing
python3 scripts/detect_changes.py old.csv new.csv changes.json
python3 scripts/update_activity_log.py changes.json activity_log.json
```

### Testing Production Consistency
Always test both environments before deployment:
1. `npm run dev` - Verify functionality in development
2. `npm run build && npm run preview` - Test production build
3. Check console for any file loading errors
4. Verify data counts and visualizations match

## File Structure Importance
```
anki-stats/
   public/              # Static assets (copied to dist in build)
      anki_stats.csv   # Main data file
      activity_log.json # Historical activity data
   js/                  # Frontend application code
   scripts/             # Data processing automation
   css/                 # Styling with theme system
   dist/               # Production build output (generated)
```

## Critical Debugging Information

### Console Debugging
The application logs detailed information to help debug issues:
- File loading paths and success/failure
- Data structure validation
- Activity log parsing details
- Chart initialization status

### Key Debug Commands
```javascript
// In browser console
app.getDebugInfo()           // Application state
stateManager.getDebugInfo()  // State management info
dataParser.rawData.length    // Verify data loading
```

## Future Considerations

### Scalability
- Activity log cleanup (currently keeps 365 days)
- Large dataset handling (pagination, virtualization)
- Performance optimization for many cards

### Features to Watch
- Additional language support
- More chart types
- Advanced filtering options
- Export functionality

### Maintenance
- Regular backup verification
- Data integrity checks
- Performance monitoring
- User feedback integration