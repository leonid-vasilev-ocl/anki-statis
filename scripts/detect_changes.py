#!/usr/bin/env python3
"""
Change Detection Script for Anki Stats Dashboard

Compares yesterday's export with today's export to detect:
- Cards with updated last_review_date (new reviews)
- Cards with updated first_study_date (new studies)  
- Cards that changed anki_level (level transitions)

Usage:
    python detect_changes.py yesterday_export.csv today_export.csv [output.json]
"""

import csv
import json
import sys
from datetime import datetime
from pathlib import Path

def load_csv_data(csv_path):
    """
    Load CSV data into a dictionary keyed by note_id
    
    Args:
        csv_path: Path to CSV file
        
    Returns:
        dict: Dictionary of note_id -> card data
    """
    data = {}
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                note_id = row['note_id']
                data[note_id] = {
                    'note_id': note_id,
                    'anki_level': row['anki_level'],
                    'deck_name': row['deck_name'],
                    'first_study_date': row['first_study_date'],
                    'last_review_date': row['last_review_date'],
                    'finnish': row['finnish'],
                    'translation': row['translation']
                }
    except FileNotFoundError:
        print(f"Warning: Could not find {csv_path}")
        return {}
    except Exception as e:
        print(f"Error reading {csv_path}: {e}")
        return {}
    
    return data

def detect_changes(yesterday_data, today_data):
    """
    Detect changes between yesterday and today's data
    
    Args:
        yesterday_data: Dictionary of yesterday's card data
        today_data: Dictionary of today's card data
        
    Returns:
        dict: Changes detected
    """
    changes = {
        'reviews': [],          # Cards with updated last_review_date
        'new_studies': [],      # Cards with updated first_study_date (new cards)
        'level_changes': [],    # Cards that changed anki_level
        'metadata': {
            'detection_date': datetime.now().isoformat(),
            'yesterday_cards': len(yesterday_data),
            'today_cards': len(today_data),
            'new_cards_added': len(set(today_data.keys()) - set(yesterday_data.keys())),
            'cards_removed': len(set(yesterday_data.keys()) - set(today_data.keys()))
        }
    }
    
    # Check each card in today's data
    for note_id, today_card in today_data.items():
        if note_id in yesterday_data:
            yesterday_card = yesterday_data[note_id]
            
            # Check for review updates (last_review_date changed)
            yesterday_last_review = yesterday_card['last_review_date']
            today_last_review = today_card['last_review_date']
            
            if yesterday_last_review != today_last_review and today_last_review:
                changes['reviews'].append({
                    'note_id': note_id,
                    'deck_name': today_card['deck_name'],
                    'anki_level': today_card['anki_level'],
                    'finnish': today_card['finnish'],
                    'translation': today_card['translation'],
                    'previous_review': yesterday_last_review,
                    'new_review': today_last_review
                })
            
            # Check for first study updates (new cards started)
            yesterday_first_study = yesterday_card['first_study_date']
            today_first_study = today_card['first_study_date']
            
            if yesterday_first_study != today_first_study and today_first_study:
                changes['new_studies'].append({
                    'note_id': note_id,
                    'deck_name': today_card['deck_name'],
                    'anki_level': today_card['anki_level'],
                    'finnish': today_card['finnish'],
                    'translation': today_card['translation'],
                    'first_study_date': today_first_study
                })
            
            # Check for level changes
            yesterday_level = yesterday_card['anki_level']
            today_level = today_card['anki_level']
            
            if yesterday_level != today_level:
                changes['level_changes'].append({
                    'note_id': note_id,
                    'deck_name': today_card['deck_name'],
                    'finnish': today_card['finnish'],
                    'translation': today_card['translation'],
                    'previous_level': yesterday_level,
                    'new_level': today_level
                })
        
        else:
            # Completely new card
            if today_card['first_study_date']:
                changes['new_studies'].append({
                    'note_id': note_id,
                    'deck_name': today_card['deck_name'],
                    'anki_level': today_card['anki_level'],
                    'finnish': today_card['finnish'],
                    'translation': today_card['translation'],
                    'first_study_date': today_card['first_study_date']
                })
    
    return changes

def get_date_from_export_filename(filename):
    """
    Extract date from export filename if it follows a pattern
    
    Args:
        filename: Filename to parse
        
    Returns:
        str: Date string in YYYY-MM-DD format or None
    """
    import re
    
    # Try to find date pattern in filename
    date_pattern = r'(\d{4}-\d{2}-\d{2})'
    match = re.search(date_pattern, filename)
    
    if match:
        return match.group(1)
    
    # Fallback to file modification time
    try:
        file_path = Path(filename)
        if file_path.exists():
            mtime = file_path.stat().st_mtime
            return datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
    except:
        pass
    
    return datetime.now().strftime('%Y-%m-%d')

def main():
    """Main function for command line usage"""
    
    if len(sys.argv) < 3:
        print("Usage: python detect_changes.py yesterday_export.csv today_export.csv [output.json]")
        print("  yesterday_export.csv: Previous day's export file")
        print("  today_export.csv: Current day's export file")
        print("  output.json: Output file for detected changes (default: changes_YYYY-MM-DD.json)")
        sys.exit(1)
    
    yesterday_file = sys.argv[1]
    today_file = sys.argv[2]
    
    # Determine output file
    if len(sys.argv) > 3:
        output_file = sys.argv[3]
    else:
        today_date = get_date_from_export_filename(today_file)
        output_file = f"changes_{today_date}.json"
    
    print(f"Comparing {yesterday_file} -> {today_file}")
    
    # Load data
    yesterday_data = load_csv_data(yesterday_file)
    today_data = load_csv_data(today_file)
    
    if not today_data:
        print("Error: Could not load today's data")
        sys.exit(1)
    
    # Detect changes
    changes = detect_changes(yesterday_data, today_data)
    
    # Save changes to JSON file
    try:
        with open(output_file, 'w', encoding='utf-8') as file:
            json.dump(changes, file, indent=2, ensure_ascii=False)
        
        print(f"Changes detected and saved to {output_file}")
        print(f"  Reviews: {len(changes['reviews'])}")
        print(f"  New Studies: {len(changes['new_studies'])}")
        print(f"  Level Changes: {len(changes['level_changes'])}")
        print(f"  Total Cards Today: {changes['metadata']['today_cards']}")
        
    except Exception as e:
        print(f"Error saving changes: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()