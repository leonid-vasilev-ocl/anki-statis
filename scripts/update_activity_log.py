#!/usr/bin/env python3
"""
Activity Log Update Script for Anki Stats Dashboard

Updates the master activity log with detected changes from daily exports.
Maintains a comprehensive history of all study activity for timeline and heatmap visualizations.

Usage:
    python update_activity_log.py changes.json [activity_log.json]
"""

import json
import sys
from datetime import datetime
from pathlib import Path

def load_activity_log(log_path):
    """
    Load existing activity log or create new one
    
    Args:
        log_path: Path to activity log JSON file
        
    Returns:
        dict: Activity log data
    """
    if not Path(log_path).exists():
        return {
            'metadata': {
                'created': datetime.now().isoformat(),
                'last_updated': None,
                'total_days_tracked': 0,
                'version': '1.0'
            },
            'daily_activity': {}
        }
    
    try:
        with open(log_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading activity log: {e}")
        return {
            'metadata': {
                'created': datetime.now().isoformat(),
                'last_updated': None,
                'total_days_tracked': 0,
                'version': '1.0'
            },
            'daily_activity': {}
        }

def load_changes(changes_path):
    """
    Load detected changes from JSON file
    
    Args:
        changes_path: Path to changes JSON file
        
    Returns:
        dict: Changes data
    """
    try:
        with open(changes_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        print(f"Error: Changes file not found: {changes_path}")
        return None
    except Exception as e:
        print(f"Error loading changes: {e}")
        return None

def extract_date_from_timestamp(timestamp_str):
    """
    Extract date string from timestamp
    
    Args:
        timestamp_str: Timestamp string (e.g., "2025-07-02 10:30:15")
        
    Returns:
        str: Date string in YYYY-MM-DD format
    """
    if not timestamp_str:
        return datetime.now().strftime('%Y-%m-%d')
    
    try:
        # Handle various timestamp formats
        if 'T' in timestamp_str:
            # ISO format
            dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        else:
            # Space-separated format
            dt = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
        
        return dt.strftime('%Y-%m-%d')
    except:
        # Fallback to today
        return datetime.now().strftime('%Y-%m-%d')

def update_activity_log(activity_log, changes):
    """
    Update activity log with new changes
    
    Args:
        activity_log: Current activity log data
        changes: Detected changes data
        
    Returns:
        dict: Updated activity log
    """
    daily_activity = activity_log.get('daily_activity', {})
    
    # Check if we have a date field in changes to prevent duplicate processing
    changes_date = changes.get('date')
    if changes_date and changes_date in daily_activity:
        # Check if this date already has data - if so, warn but continue
        existing_data = daily_activity[changes_date]
        if (existing_data.get('reviews') or existing_data.get('new_studies') or 
            existing_data.get('level_changes')):
            print(f"Warning: Date {changes_date} already has activity data. Merging...")
    
    
    # Group reviews by date first, then replace entire day's data
    reviews_by_date = {}
    for review in changes.get('reviews', []):
        review_date = extract_date_from_timestamp(review.get('new_review') or review.get('last_review_date'))
        
        if review_date not in reviews_by_date:
            reviews_by_date[review_date] = []
        
        review_entry = {
            'note_id': review['note_id'],
            'deck_name': review['deck_name'],
            'anki_level': review['anki_level'],
            'finnish': review['finnish'],
            'translation': review['translation'],
            'timestamp': review.get('new_review')
        }
        reviews_by_date[review_date].append(review_entry)
    
    # Add reviews to existing data (don't replace entire day)
    for review_date, reviews in reviews_by_date.items():
        if review_date not in daily_activity:
            daily_activity[review_date] = {
                'reviews': [],
                'new_studies': [],
                'level_changes': [],
                'stats': {
                    'total_reviews': 0,
                    'total_new_studies': 0,
                    'total_level_changes': 0,
                    'decks_studied': set()
                }
            }
        
        # Add new reviews, avoiding duplicates
        existing_review_ids = {r['note_id'] for r in daily_activity[review_date]['reviews']}
        new_reviews = [r for r in reviews if r['note_id'] not in existing_review_ids]
        daily_activity[review_date]['reviews'].extend(new_reviews)
        print(f"Added {len(new_reviews)} new reviews for {review_date} (total: {len(daily_activity[review_date]['reviews'])})")
    
    # Group new studies by date first, then replace entire day's data
    studies_by_date = {}
    for study in changes.get('new_studies', []):
        study_date = extract_date_from_timestamp(study.get('first_study_date'))
        
        if study_date not in studies_by_date:
            studies_by_date[study_date] = []
        
        study_entry = {
            'note_id': study['note_id'],
            'deck_name': study['deck_name'],
            'anki_level': study['anki_level'],
            'finnish': study['finnish'],
            'translation': study['translation'],
            'timestamp': study.get('first_study_date')
        }
        studies_by_date[study_date].append(study_entry)
    
    # Add new studies to existing data (don't replace entire day)
    for study_date, studies in studies_by_date.items():
        if study_date not in daily_activity:
            daily_activity[study_date] = {
                'reviews': [],
                'new_studies': [],
                'level_changes': [],
                'stats': {
                    'total_reviews': 0,
                    'total_new_studies': 0,
                    'total_level_changes': 0,
                    'decks_studied': set()
                }
            }
        
        # Add new studies, avoiding duplicates
        existing_study_ids = {s['note_id'] for s in daily_activity[study_date]['new_studies']}
        new_studies = [s for s in studies if s['note_id'] not in existing_study_ids]
        daily_activity[study_date]['new_studies'].extend(new_studies)
        print(f"Added {len(new_studies)} new studies for {study_date} (total: {len(daily_activity[study_date]['new_studies'])})")
    
    # Group level changes by date first, then replace entire day's data
    level_changes_by_date = {}
    for level_change in changes.get('level_changes', []):
        # Use today's date for level changes since they represent current state
        change_date = datetime.now().strftime('%Y-%m-%d')
        
        if change_date not in level_changes_by_date:
            level_changes_by_date[change_date] = []
        
        level_change_entry = {
            'note_id': level_change['note_id'],
            'deck_name': level_change['deck_name'],
            'finnish': level_change['finnish'],
            'translation': level_change['translation'],
            'previous_level': level_change['previous_level'],
            'new_level': level_change['new_level'],
            'timestamp': datetime.now().isoformat()
        }
        level_changes_by_date[change_date].append(level_change_entry)
    
    # Add level changes to existing data (don't replace entire day)
    for change_date, level_changes in level_changes_by_date.items():
        if change_date not in daily_activity:
            daily_activity[change_date] = {
                'reviews': [],
                'new_studies': [],
                'level_changes': [],
                'stats': {
                    'total_reviews': 0,
                    'total_new_studies': 0,
                    'total_level_changes': 0,
                    'decks_studied': set()
                }
            }
        
        # Add new level changes, avoiding duplicates
        existing_change_ids = {lc['note_id'] for lc in daily_activity[change_date]['level_changes']}
        new_level_changes = [lc for lc in level_changes if lc['note_id'] not in existing_change_ids]
        daily_activity[change_date]['level_changes'].extend(new_level_changes)
        print(f"Added {len(new_level_changes)} level changes for {change_date} (total: {len(daily_activity[change_date]['level_changes'])})")
    
    # Update statistics for each day
    for date, day_data in daily_activity.items():
        # Convert set to list for JSON serialization
        if isinstance(day_data['stats']['decks_studied'], set):
            day_data['stats']['decks_studied'] = list(day_data['stats']['decks_studied'])
        
        # Update counts
        day_data['stats']['total_reviews'] = len(day_data['reviews'])
        day_data['stats']['total_new_studies'] = len(day_data['new_studies'])
        day_data['stats']['total_level_changes'] = len(day_data['level_changes'])
        
        # Update decks studied
        decks = set()
        for review in day_data['reviews']:
            decks.add(review['deck_name'])
        for study in day_data['new_studies']:
            decks.add(study['deck_name'])
        day_data['stats']['decks_studied'] = list(decks)
    
    # Update metadata
    activity_log['daily_activity'] = daily_activity
    activity_log['metadata']['last_updated'] = datetime.now().isoformat()
    activity_log['metadata']['total_days_tracked'] = len(daily_activity)
    
    return activity_log

def cleanup_old_entries(activity_log, days_to_keep=365):
    """
    Clean up old entries to keep file size manageable
    
    Args:
        activity_log: Activity log data
        days_to_keep: Number of days to keep (default: 365)
        
    Returns:
        dict: Cleaned activity log
    """
    from datetime import datetime, timedelta
    
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    cutoff_str = cutoff_date.strftime('%Y-%m-%d')
    
    daily_activity = activity_log.get('daily_activity', {})
    cleaned_activity = {}
    
    for date_str, day_data in daily_activity.items():
        if date_str >= cutoff_str:
            cleaned_activity[date_str] = day_data
    
    activity_log['daily_activity'] = cleaned_activity
    activity_log['metadata']['total_days_tracked'] = len(cleaned_activity)
    
    return activity_log

def save_activity_log(activity_log, log_path):
    """
    Save activity log to JSON file
    
    Args:
        activity_log: Activity log data
        log_path: Path to save file
        
    Returns:
        bool: Success status
    """
    try:
        # Create backup of existing log
        if Path(log_path).exists():
            backup_path = f"{log_path}.backup"
            Path(log_path).rename(backup_path)
        
        with open(log_path, 'w', encoding='utf-8') as file:
            json.dump(activity_log, file, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"Error saving activity log: {e}")
        return False

def get_summary_stats(activity_log):
    """
    Get summary statistics from activity log
    
    Args:
        activity_log: Activity log data
        
    Returns:
        dict: Summary statistics
    """
    daily_activity = activity_log.get('daily_activity', {})
    
    total_reviews = 0
    total_new_studies = 0
    total_level_changes = 0
    unique_decks = set()
    active_days = 0
    
    for day_data in daily_activity.values():
        day_total = len(day_data['reviews']) + len(day_data['new_studies'])
        if day_total > 0:
            active_days += 1
        
        total_reviews += len(day_data['reviews'])
        total_new_studies += len(day_data['new_studies'])
        total_level_changes += len(day_data['level_changes'])
        
        for deck in day_data['stats']['decks_studied']:
            unique_decks.add(deck)
    
    return {
        'total_days_tracked': len(daily_activity),
        'active_days': active_days,
        'total_reviews': total_reviews,
        'total_new_studies': total_new_studies,
        'total_level_changes': total_level_changes,
        'unique_decks': len(unique_decks),
        'average_daily_reviews': round(total_reviews / max(active_days, 1), 1),
        'average_daily_new_studies': round(total_new_studies / max(active_days, 1), 1)
    }

def main():
    """Main function for command line usage"""
    
    if len(sys.argv) < 2:
        print("Usage: python update_activity_log.py changes.json [activity_log.json]")
        print("  changes.json: Detected changes from detect_changes.py")
        print("  activity_log.json: Activity log file (default: activity_log.json)")
        sys.exit(1)
    
    changes_file = sys.argv[1]
    activity_log_file = sys.argv[2] if len(sys.argv) > 2 else "activity_log.json"
    
    print(f"Updating activity log: {activity_log_file}")
    print(f"Processing changes from: {changes_file}")
    
    # Load data
    changes = load_changes(changes_file)
    if not changes:
        sys.exit(1)
    
    activity_log = load_activity_log(activity_log_file)
    
    # Update activity log
    updated_log = update_activity_log(activity_log, changes)
    
    # Cleanup old entries (keep last year)
    updated_log = cleanup_old_entries(updated_log, days_to_keep=365)
    
    # Save updated log
    if save_activity_log(updated_log, activity_log_file):
        print(f"Activity log updated successfully!")
        
        # Print summary
        stats = get_summary_stats(updated_log)
        print(f"\nSummary Statistics:")
        print(f"  Total days tracked: {stats['total_days_tracked']}")
        print(f"  Active days: {stats['active_days']}")
        print(f"  Total reviews: {stats['total_reviews']}")
        print(f"  Total new studies: {stats['total_new_studies']}")
        print(f"  Unique decks: {stats['unique_decks']}")
        print(f"  Average daily reviews: {stats['average_daily_reviews']}")
        print(f"  Average daily new studies: {stats['average_daily_new_studies']}")
        
    else:
        print("Failed to save activity log!")
        sys.exit(1)

if __name__ == "__main__":
    main()