# Anki Statistics Dashboard

A modern, interactive web dashboard for visualizing your Anki learning statistics with Russian/English internationalization, dark/light themes, and persistent user preferences.

## Features

### 📊 Interactive Charts
- **Level Distribution Pie Chart** - See breakdown of card levels (New, Learning, Young, Mature, etc.)
- **Deck Performance Bar Chart** - Compare performance across different decks
- **Study Timeline** - Track your study activity over time (week/month/year view)
- **Activity Heatmap** - Calendar-style visualization of daily study intensity

### 🌐 Internationalization
- **Bilingual Support** - Full English and Russian translations
- **Instant Language Switching** - Toggle between languages with preserved state
- **Localized Number/Date Formatting** - Proper formatting for each locale

### 🎨 Modern Design
- **Dark/Light Themes** - Beautiful themes with smooth transitions
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Interactive Filtering** - Click charts to filter data, search cards, select decks/levels
- **Persistent State** - All preferences and filters saved in localStorage

### 📈 Data Management
- **Historical Tracking** - Maintains complete study activity history
- **Smart Change Detection** - Tracks new reviews, studies, and level changes
- **CSV Export Integration** - Works with your existing Anki export script
- **Automatic Backups** - Keeps backups of previous data

## Quick Start

### 1. Setup Repository
```bash
# Clone or download this repository
git clone https://github.com/yourusername/anki-stats.git
cd anki-stats

# Make scripts executable
chmod +x scripts/*.sh deploy_manual.sh
```

### 2. Configure Paths
Edit the paths in `deploy_manual.sh` to match your system:
```bash
# Update these paths for your system
ANKI_DB_PATH="/Users/levas/Library/Application Support/Anki2/User 1/collection.anki2"
EXPORT_SCRIPT_PATH="/Users/levas/Library/Application Support/Anki2/User 1/export_anki_notes.py"
```

### 3. Initial Setup
```bash
# Test your export script first
python3 "/path/to/your/export_anki_notes.py" test_export.csv

# Run initial deployment
./deploy_manual.sh
```

### 4. GitHub Pages Setup
1. Go to your GitHub repository settings
2. Navigate to "Pages" section
3. Set source to "GitHub Actions"
4. Your dashboard will be available at `https://yourusername.github.io/anki-stats`

## Daily Usage

### Updating Your Dashboard
Simply run the deployment script whenever you want to update your dashboard with fresh Anki data:
```bash
./deploy_manual.sh
```

This script will:
1. Export fresh data from your Anki database
2. Detect changes since last update
3. Update the activity log with new study activity
4. Commit and push changes to GitHub
5. GitHub Pages will automatically deploy the updates

### Manual Data Update (Alternative)
If you prefer to update data manually:
```bash
# 1. Export fresh data
python3 "path/to/export_anki_notes.py" public/anki_stats.csv

# 2. Update activity log (optional)
python3 scripts/detect_changes.py old_export.csv public/anki_stats.csv changes.json
python3 scripts/update_activity_log.py changes.json public/activity_log.json

# 3. Commit and push
git add public/
git commit -m "Update Anki stats"
git push origin main
```

## File Structure

```
anki-stats/
├── public/                 # Frontend files (deployed to GitHub Pages)
│   ├── index.html         # Main dashboard page
│   ├── anki_stats.csv     # Current Anki data export
│   └── activity_log.json  # Historical study activity
├── css/
│   └── styles.css         # Responsive styles with theme system
├── js/
│   ├── app.js            # Main application controller
│   ├── charts.js         # Chart.js integration and management
│   ├── data-parser.js    # CSV parsing and data processing
│   ├── state-manager.js  # localStorage state management
│   └── translations.js   # i18n system with EN/RU translations
├── scripts/
│   ├── detect_changes.py    # Compare exports to find changes
│   ├── update_activity_log.py # Maintain historical activity data
│   └── daily_update.sh      # Complete automation script
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages deployment
├── deploy_manual.sh        # Manual deployment script
└── README.md
```

## Dashboard Features

### Interactive Charts
- **Click pie chart segments** to filter by card level
- **Click deck bars** to filter by deck
- **Click heatmap cells** to filter by date
- **Cross-chart filtering** - all visualizations update together

### Filters & Search
- **Deck Filter** - Select specific decks to analyze
- **Level Filter** - Focus on specific card learning levels
- **Text Search** - Find cards by Finnish or Russian text
- **Date Range** - Filter by study/review dates
- **Clear Filters** - Reset all filters instantly

### User Preferences
- **Theme Toggle** - Switch between dark and light modes
- **Language Toggle** - Switch between English and Russian
- **Persistent State** - All settings saved automatically
- **Chart Preferences** - Timeline zoom, heatmap year, etc.

### Card Explorer
- **Sortable Table** - Click headers to sort by any column
- **Searchable** - Real-time search through all cards
- **Clickable Rows** - Select cards to view details
- **Pagination** - Handle large datasets efficiently

## Technical Details

### Data Flow
1. **Anki Database** → `export_anki_notes.py` → **CSV Export**
2. **Change Detection** → Compare with previous export
3. **Activity Log** → Accumulate historical study data
4. **Frontend** → Load CSV + Activity Log → **Interactive Dashboard**

### State Management
- **LocalStorage Persistence** - All user preferences saved
- **Reactive Updates** - Changes propagate across all components
- **State Middleware** - Extensible state processing pipeline
- **Event System** - Subscribe to specific state changes

### Internationalization
- **Translation System** - Structured JSON translations
- **Dynamic Updates** - Instant language switching
- **Locale Formatting** - Numbers, dates, relative times
- **Fallback Support** - English fallback for missing translations

### Theme System
- **CSS Custom Properties** - Efficient theme switching
- **Chart Integration** - Charts adapt to theme changes
- **Smooth Transitions** - Animated theme transitions
- **System Preference** - Respects user's OS theme preference

## Customization

### Adding New Languages
1. Add translations to `js/translations.js`
2. Update language switcher in HTML
3. Add locale formatting in I18n class

### Custom Charts
1. Add chart creation method to `ChartsManager`
2. Update HTML with new chart container
3. Add chart update logic for filters/themes

### Additional Data Sources
1. Modify `DataParser` to handle new data formats
2. Update `detect_changes.py` for new change types
3. Extend activity log structure as needed

## Troubleshooting

### Common Issues

**"Export script not found"**
- Update `EXPORT_SCRIPT_PATH` in `deploy_manual.sh`
- Ensure `export_anki_notes.py` is executable

**"No changes detected"**
- Check if Anki data actually changed
- Verify backup files exist in `backups/` folder

**"GitHub Pages not updating"**
- Check GitHub Actions tab for deployment status
- Ensure Pages is enabled in repository settings
- Wait 2-3 minutes for deployment to complete

**"Charts not displaying"**
- Check browser console for JavaScript errors
- Verify CSV data format matches expected structure
- Ensure Chart.js library loads correctly

### Debug Information
Open browser console and run:
```javascript
app.getDebugInfo()  // Get application status
```

## Requirements

- **Python 3.6+** - For data processing scripts
- **Modern Web Browser** - For dashboard viewing
- **Git** - For version control and deployment
- **GitHub Account** - For hosting via GitHub Pages
- **Anki Desktop** - Source of study data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use and modify for your own Anki statistics needs!

## Support

- **Issues** - Report bugs or request features via GitHub Issues
- **Discussions** - Share ideas and ask questions in GitHub Discussions
- **Documentation** - This README contains comprehensive setup and usage information

---

**Happy studying! 📚✨**