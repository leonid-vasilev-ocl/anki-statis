#!/bin/bash
#
# Daily Update Script for Anki Stats Dashboard
#
# Automates the daily process of:
# 1. Backing up previous export
# 2. Generating new export from Anki database
# 3. Detecting changes between exports
# 4. Updating activity log with changes
# 5. Copying files to frontend public folder
# 6. Cleaning up old files
#
# Usage:
#     ./daily_update.sh [anki_db_path] [frontend_public_path]
#
# Environment Variables:
#     ANKI_DB_PATH: Path to Anki collection.anki2 database
#     FRONTEND_PUBLIC_PATH: Path to frontend public folder
#     EXPORT_SCRIPT_PATH: Path to export_anki_notes.py script
#     KEEP_BACKUPS_DAYS: Number of days to keep backup files (default: 30)
#

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Default paths (can be overridden by environment variables or arguments)
ANKI_DB_PATH="${ANKI_DB_PATH:-/Users/levas/Library/Application Support/Anki2/User 1/collection.anki2}"
FRONTEND_PUBLIC_PATH="${FRONTEND_PUBLIC_PATH:-$PROJECT_DIR/public}"
EXPORT_SCRIPT_PATH="${EXPORT_SCRIPT_PATH:-/Users/levas/Library/Application Support/Anki2/User 1/export_anki_notes.py}"
KEEP_BACKUPS_DAYS="${KEEP_BACKUPS_DAYS:-30}"

# Override with command line arguments if provided
if [ $# -ge 1 ]; then
    ANKI_DB_PATH="$1"
fi

if [ $# -ge 2 ]; then
    FRONTEND_PUBLIC_PATH="$2"
fi

# Working directories
WORK_DIR="$PROJECT_DIR/temp"
BACKUP_DIR="$PROJECT_DIR/backups"
LOGS_DIR="$PROJECT_DIR/logs"

# File names
TODAY_EXPORT="anki_export_$DATE.csv"
YESTERDAY_EXPORT="anki_export_$(date -v-1d +%Y-%m-%d).csv"
CURRENT_EXPORT="anki_stats.csv"
CHANGES_FILE="changes_$DATE.json"
ACTIVITY_LOG="activity_log.json"
LOG_FILE="$LOGS_DIR/daily_update_$DATE.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Color the output based on level
    case "$level" in
        "ERROR")   echo -e "${RED}[$timestamp] ERROR: $message${NC}" | tee -a "$LOG_FILE" ;;
        "SUCCESS") echo -e "${GREEN}[$timestamp] SUCCESS: $message${NC}" | tee -a "$LOG_FILE" ;;
        "WARNING") echo -e "${YELLOW}[$timestamp] WARNING: $message${NC}" | tee -a "$LOG_FILE" ;;
        "INFO")    echo -e "${BLUE}[$timestamp] INFO: $message${NC}" | tee -a "$LOG_FILE" ;;
        *)         echo "[$timestamp] $level: $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Create necessary directories
create_directories() {
    log "INFO" "Creating necessary directories..."
    mkdir -p "$WORK_DIR" "$BACKUP_DIR" "$LOGS_DIR" "$FRONTEND_PUBLIC_PATH"
}

# Check if required files exist
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    if [ ! -f "$ANKI_DB_PATH" ]; then
        log "ERROR" "Anki database not found: $ANKI_DB_PATH"
        exit 1
    fi
    
    if [ ! -f "$EXPORT_SCRIPT_PATH" ]; then
        log "ERROR" "Export script not found: $EXPORT_SCRIPT_PATH"
        exit 1
    fi
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        log "ERROR" "Python3 is required but not installed"
        exit 1
    fi
    
    log "SUCCESS" "All prerequisites met"
}

# Backup yesterday's export if it exists
backup_yesterday_export() {
    log "INFO" "Backing up yesterday's export..."
    
    local yesterday_path="$WORK_DIR/$YESTERDAY_EXPORT"
    local current_path="$FRONTEND_PUBLIC_PATH/$CURRENT_EXPORT"
    
    # If we have a current export, use it as yesterday's
    if [ -f "$current_path" ]; then
        cp "$current_path" "$yesterday_path"
        log "SUCCESS" "Backed up current export as yesterday's data"
    elif [ -f "$BACKUP_DIR/$YESTERDAY_EXPORT" ]; then
        cp "$BACKUP_DIR/$YESTERDAY_EXPORT" "$yesterday_path"
        log "SUCCESS" "Retrieved yesterday's export from backup"
    else
        log "WARNING" "No yesterday's export found - this may be the first run"
        touch "$yesterday_path"  # Create empty file to avoid errors
    fi
}

# Generate today's export
generate_today_export() {
    log "INFO" "Generating today's export..."
    
    local output_path="$WORK_DIR/$TODAY_EXPORT"
    
    # Run the export script
    if python3 "$EXPORT_SCRIPT_PATH" "$output_path" "$ANKI_DB_PATH"; then
        log "SUCCESS" "Export generated successfully: $output_path"
        
        # Show basic stats
        local card_count=$(wc -l < "$output_path")
        card_count=$((card_count - 1))  # Subtract header line
        log "INFO" "Exported $card_count cards"
    else
        log "ERROR" "Failed to generate export"
        exit 1
    fi
}

# Detect changes between exports
detect_changes() {
    log "INFO" "Detecting changes between exports..."
    
    local yesterday_path="$WORK_DIR/$YESTERDAY_EXPORT"
    local today_path="$WORK_DIR/$TODAY_EXPORT"
    local changes_path="$WORK_DIR/$CHANGES_FILE"
    
    if python3 "$SCRIPT_DIR/detect_changes.py" "$yesterday_path" "$today_path" "$changes_path"; then
        log "SUCCESS" "Changes detected and saved to: $changes_path"
        
        # Show summary of changes
        if [ -f "$changes_path" ]; then
            local reviews=$(python3 -c "import json; data=json.load(open('$changes_path')); print(len(data.get('reviews', [])))")
            local new_studies=$(python3 -c "import json; data=json.load(open('$changes_path')); print(len(data.get('new_studies', [])))")
            local level_changes=$(python3 -c "import json; data=json.load(open('$changes_path')); print(len(data.get('level_changes', [])))")
            
            log "INFO" "Changes summary: $reviews reviews, $new_studies new studies, $level_changes level changes"
        fi
    else
        log "ERROR" "Failed to detect changes"
        exit 1
    fi
}

# Update activity log
update_activity_log() {
    log "INFO" "Updating activity log..."
    
    local changes_path="$WORK_DIR/$CHANGES_FILE"
    local activity_log_path="$WORK_DIR/$ACTIVITY_LOG"
    local existing_log_path="$FRONTEND_PUBLIC_PATH/$ACTIVITY_LOG"
    
    # Copy existing activity log if it exists
    if [ -f "$existing_log_path" ]; then
        cp "$existing_log_path" "$activity_log_path"
    fi
    
    if python3 "$SCRIPT_DIR/update_activity_log.py" "$changes_path" "$activity_log_path"; then
        log "SUCCESS" "Activity log updated successfully"
    else
        log "ERROR" "Failed to update activity log"
        exit 1
    fi
}

# Copy files to frontend public folder
deploy_to_frontend() {
    log "INFO" "Deploying files to frontend..."
    
    # Copy current export
    cp "$WORK_DIR/$TODAY_EXPORT" "$FRONTEND_PUBLIC_PATH/$CURRENT_EXPORT"
    log "SUCCESS" "Copied current export to frontend"
    
    # Copy activity log
    cp "$WORK_DIR/$ACTIVITY_LOG" "$FRONTEND_PUBLIC_PATH/$ACTIVITY_LOG"
    log "SUCCESS" "Copied activity log to frontend"
    
    # Set appropriate permissions
    chmod 644 "$FRONTEND_PUBLIC_PATH/$CURRENT_EXPORT"
    chmod 644 "$FRONTEND_PUBLIC_PATH/$ACTIVITY_LOG"
}

# Create backup copies
create_backups() {
    log "INFO" "Creating backup copies..."
    
    # Backup today's export
    cp "$WORK_DIR/$TODAY_EXPORT" "$BACKUP_DIR/$TODAY_EXPORT"
    
    # Backup changes file
    cp "$WORK_DIR/$CHANGES_FILE" "$BACKUP_DIR/$CHANGES_FILE"
    
    # Backup activity log
    cp "$WORK_DIR/$ACTIVITY_LOG" "$BACKUP_DIR/activity_log_$DATE.json"
    
    log "SUCCESS" "Backup copies created"
}

# Clean up old files
cleanup_old_files() {
    log "INFO" "Cleaning up old files..."
    
    # Clean up old backups
    find "$BACKUP_DIR" -name "*.csv" -mtime +$KEEP_BACKUPS_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.json" -mtime +$KEEP_BACKUPS_DAYS -delete 2>/dev/null || true
    
    # Clean up old logs
    find "$LOGS_DIR" -name "*.log" -mtime +$KEEP_BACKUPS_DAYS -delete 2>/dev/null || true
    
    # Clean up work directory
    rm -f "$WORK_DIR"/*
    
    log "SUCCESS" "Cleanup completed"
}

# Error handler
error_handler() {
    local exit_code=$?
    log "ERROR" "Script failed with exit code $exit_code"
    
    # Try to preserve any partial work
    if [ -f "$WORK_DIR/$TODAY_EXPORT" ]; then
        cp "$WORK_DIR/$TODAY_EXPORT" "$BACKUP_DIR/failed_export_$TIMESTAMP.csv"
        log "INFO" "Preserved failed export for debugging"
    fi
    
    exit $exit_code
}

# Set up error handling
trap error_handler ERR

# Main execution
main() {
    log "INFO" "Starting daily update process..."
    log "INFO" "Date: $DATE"
    log "INFO" "Anki DB: $ANKI_DB_PATH"
    log "INFO" "Frontend: $FRONTEND_PUBLIC_PATH"
    
    create_directories
    check_prerequisites
    backup_yesterday_export
    generate_today_export
    detect_changes
    update_activity_log
    deploy_to_frontend
    create_backups
    cleanup_old_files
    
    log "SUCCESS" "Daily update completed successfully!"
    
    # Final summary
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    log "INFO" "Process completed at: $end_time"
    log "INFO" "Log file: $LOG_FILE"
}

# Help function
show_help() {
    echo "Daily Update Script for Anki Stats Dashboard"
    echo ""
    echo "Usage: $0 [anki_db_path] [frontend_public_path]"
    echo ""
    echo "Arguments:"
    echo "  anki_db_path         Path to Anki collection.anki2 database"
    echo "  frontend_public_path Path to frontend public folder"
    echo ""
    echo "Environment Variables:"
    echo "  ANKI_DB_PATH         Default Anki database path"
    echo "  FRONTEND_PUBLIC_PATH Default frontend public path"
    echo "  EXPORT_SCRIPT_PATH   Path to export_anki_notes.py script"
    echo "  KEEP_BACKUPS_DAYS    Days to keep backup files (default: 30)"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 /path/to/collection.anki2 /path/to/public"
    echo "  ANKI_DB_PATH=/custom/path $0"
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"