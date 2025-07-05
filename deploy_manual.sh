#!/bin/bash
"""
Manual Deployment Script for Anki Stats Dashboard

This script handles the complete workflow for updating your Anki stats dashboard:
1. Exports fresh data from your local Anki database
2. Updates the activity log with new changes
3. Commits and pushes changes to GitHub
4. GitHub Pages will automatically deploy the updated frontend

Usage:
    ./deploy_manual.sh

Prerequisites:
    - Git repository configured with GitHub remote
    - Python 3 installed
    - Anki database accessible on this machine
    - GitHub Pages enabled for this repository
"""

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Default paths - adjust these for your system
ANKI_DB_PATH="${ANKI_DB_PATH:-/Users/levas/Library/Application Support/Anki2/User 1/collection.anki2}"
EXPORT_SCRIPT_PATH="${EXPORT_SCRIPT_PATH:-/Users/levas/Library/Application Support/Anki2/User 1/export_anki_notes.py}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "SUCCESS") echo -e "${GREEN}[$timestamp] ✓ $message${NC}" ;;
        "INFO")    echo -e "${BLUE}[$timestamp] ℹ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}[$timestamp] ⚠ $message${NC}" ;;
        "ERROR")   echo -e "${RED}[$timestamp] ✗ $message${NC}" ;;
        *)         echo "[$timestamp] $level: $message" ;;
    esac
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not in a git repository. Please run from project root."
        exit 1
    fi
    
    # Check if Anki database exists
    if [ ! -f "$ANKI_DB_PATH" ]; then
        log "ERROR" "Anki database not found: $ANKI_DB_PATH"
        log "INFO" "Please set ANKI_DB_PATH environment variable or update the script"
        exit 1
    fi
    
    # Check if export script exists
    if [ ! -f "$EXPORT_SCRIPT_PATH" ]; then
        log "ERROR" "Export script not found: $EXPORT_SCRIPT_PATH"
        log "INFO" "Please set EXPORT_SCRIPT_PATH environment variable or update the script"
        exit 1
    fi
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        log "ERROR" "Python3 is required but not installed"
        exit 1
    fi
    
    # Check if we have a GitHub remote
    if ! git remote get-url origin &> /dev/null; then
        log "ERROR" "No 'origin' remote configured. Please add GitHub repository as origin."
        exit 1
    fi
    
    log "SUCCESS" "All prerequisites met"
}

backup_current_data() {
    log "INFO" "Backing up current data..."
    
    # Create backups directory if it doesn't exist
    mkdir -p backups
    
    # Backup current CSV if it exists
    if [ -f "public/anki_stats.csv" ]; then
        cp "public/anki_stats.csv" "backups/anki_stats_backup_$TIMESTAMP.csv"
        log "SUCCESS" "Backed up current CSV data"
    fi
    
    # Backup current activity log if it exists
    if [ -f "public/activity_log.json" ]; then
        cp "public/activity_log.json" "backups/activity_log_backup_$TIMESTAMP.json"
        log "SUCCESS" "Backed up current activity log"
    fi
}

export_fresh_data() {
    log "INFO" "Exporting fresh data from Anki..."
    
    # Export new data to temporary file
    local temp_export="temp_export_$DATE.csv"
    
    if python3 "$EXPORT_SCRIPT_PATH" "$temp_export" "$ANKI_DB_PATH"; then
        # Move to public folder
        mv "$temp_export" "public/anki_stats.csv"
        log "SUCCESS" "Fresh data exported successfully"
        
        # Show basic stats
        local card_count=$(wc -l < "public/anki_stats.csv")
        card_count=$((card_count - 1))  # Subtract header line
        log "INFO" "Exported $card_count cards"
    else
        log "ERROR" "Failed to export fresh data"
        exit 1
    fi
}

update_activity_log() {
    log "INFO" "Updating activity log..."
    
    # Check if we have a previous export for comparison
    local yesterday_export="backups/anki_stats_backup_*.csv"
    local latest_backup=$(ls -t backups/anki_stats_backup_*.csv 2>/dev/null | head -1)
    
    if [ -n "$latest_backup" ] && [ -f "$latest_backup" ]; then
        log "INFO" "Detecting changes since last backup..."
        
        # Detect changes
        local changes_file="temp_changes_$DATE.json"
        if python3 "scripts/detect_changes.py" "$latest_backup" "public/anki_stats.csv" "$changes_file"; then
            log "SUCCESS" "Changes detected"
            
            # Update activity log
            if python3 "scripts/update_activity_log.py" "$changes_file" "public/activity_log.json"; then
                log "SUCCESS" "Activity log updated"
            else
                log "WARNING" "Failed to update activity log, continuing anyway..."
            fi
            
            # Cleanup temp file
            rm -f "$changes_file"
        else
            log "WARNING" "Could not detect changes, continuing anyway..."
        fi
    else
        log "WARNING" "No previous export found for comparison"
        log "INFO" "Creating fresh activity log..."
        
        # Create minimal activity log if none exists
        if [ ! -f "public/activity_log.json" ]; then
            cat > "public/activity_log.json" << EOF
{
  "metadata": {
    "created": "$(date -Iseconds)",
    "last_updated": "$(date -Iseconds)",
    "total_days_tracked": 0,
    "version": "1.0"
  },
  "daily_activity": {}
}
EOF
            log "SUCCESS" "Created fresh activity log"
        fi
    fi
}

build_frontend() {
    log "INFO" "Building frontend application..."
    
    # Define variables for file copying
    local TODAY_EXPORT="temp_export_${DATE}.csv"
    local CURRENT_EXPORT="anki_stats.csv"
    local ACTIVITY_LOG="activity_log.json"
    
    # Copy data files to public folder for build process if they exist
    if [ -f "$TODAY_EXPORT" ]; then
        cp "$TODAY_EXPORT" "public/$CURRENT_EXPORT"
        log "SUCCESS" "Copied fresh CSV data to public folder"
    else
        log "WARNING" "Fresh export file not found: $TODAY_EXPORT"
    fi
    
    if [ -f "$ACTIVITY_LOG" ]; then
        cp "$ACTIVITY_LOG" "public/$ACTIVITY_LOG"
        log "SUCCESS" "Copied activity log to public folder"
    else
        log "WARNING" "Activity log not found: $ACTIVITY_LOG"
    fi
    
    # Check if npm is available and package.json exists
    if command -v npm &> /dev/null && [ -f "package.json" ]; then
        log "INFO" "Installing dependencies..."
        npm install
        
        log "INFO" "Building project with Vite..."
        if npm run build; then
            log "SUCCESS" "Build completed successfully"
            
            # Replace public folder contents with built files
            if [ -d "dist" ]; then
                rm -rf public/*
                cp -r dist/* public/
                log "SUCCESS" "Deployed built files to public folder"
            else
                log "ERROR" "Build output directory 'dist' not found"
                exit 1
            fi
        else
            log "ERROR" "Build failed"
            exit 1
        fi
    else
        log "WARNING" "npm not found or package.json missing, skipping build process..."
        log "INFO" "Using files directly without build optimization"
    fi
}

commit_and_push() {
    log "INFO" "Committing and pushing changes to GitHub..."
    
    # Check if there are any changes to commit
    if git diff --quiet && git diff --cached --quiet; then
        log "WARNING" "No changes detected. Nothing to commit."
        return 0
    fi
    
    # Stage all changes in public folder
    git add public/
    
    # Create commit message
    local commit_message="Update Anki stats data - $DATE

- Fresh export from Anki database
- Updated activity log with recent changes
- $TIMESTAMP

🤖 Generated with Anki Stats Dashboard
"
    
    # Commit changes
    if git commit -m "$commit_message"; then
        log "SUCCESS" "Changes committed"
        
        # Push to GitHub
        if git push origin main; then
            log "SUCCESS" "Changes pushed to GitHub"
            log "INFO" "GitHub Pages will deploy automatically in a few minutes"
            
            # Try to get the GitHub Pages URL
            local repo_url=$(git remote get-url origin)
            local repo_name=$(basename "$repo_url" .git)
            local username=$(basename "$(dirname "$repo_url")")
            local pages_url="https://${username}.github.io/${repo_name}"
            
            log "INFO" "Your dashboard will be available at: $pages_url"
        else
            log "ERROR" "Failed to push to GitHub"
            exit 1
        fi
    else
        log "ERROR" "Failed to commit changes"
        exit 1
    fi
}

cleanup() {
    log "INFO" "Cleaning up temporary files..."
    
    # Remove old backups (keep last 10)
    if [ -d "backups" ]; then
        local backup_count=$(ls -1 backups/anki_stats_backup_*.csv 2>/dev/null | wc -l)
        if [ "$backup_count" -gt 10 ]; then
            ls -t backups/anki_stats_backup_*.csv | tail -n +11 | xargs rm -f
            log "INFO" "Cleaned up old backup files"
        fi
    fi
    
    # Remove any remaining temp files
    rm -f temp_*.csv temp_*.json
    
    log "SUCCESS" "Cleanup completed"
}

show_summary() {
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    log "SUCCESS" "Deployment completed successfully!"
    log "INFO" "Completed at: $end_time"
    log "INFO" ""
    log "INFO" "Next steps:"
    log "INFO" "1. Wait 2-3 minutes for GitHub Pages to deploy"
    log "INFO" "2. Check your dashboard URL for updates"
    log "INFO" "3. Run this script again whenever you want to update with fresh Anki data"
}

# Help function
show_help() {
    echo "Manual Deployment Script for Anki Stats Dashboard"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ANKI_DB_PATH        Path to Anki collection.anki2 database"
    echo "  EXPORT_SCRIPT_PATH  Path to export_anki_notes.py script"
    echo ""
    echo "This script will:"
    echo "  1. Export fresh data from your Anki database"
    echo "  2. Update the activity log with changes"
    echo "  3. Commit and push changes to GitHub"
    echo "  4. GitHub Pages will automatically deploy the updates"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  ANKI_DB_PATH=/custom/path/collection.anki2 $0"
}

# Main execution
main() {
    log "INFO" "Starting manual deployment process..."
    log "INFO" "Date: $DATE"
    log "INFO" "Anki DB: $ANKI_DB_PATH"
    log "INFO" "Export Script: $EXPORT_SCRIPT_PATH"
    
    check_prerequisites
    backup_current_data
    export_fresh_data
    update_activity_log
    build_frontend
    commit_and_push
    cleanup
    show_summary
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Error handler
trap 'log "ERROR" "Script failed! Check the error messages above."' ERR

# Run main function
main "$@"