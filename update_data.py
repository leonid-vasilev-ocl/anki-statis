#!/usr/bin/env python3
"""
Daily Anki Data Update Script
Extracts card and activity data from Anki's default User 1 database
"""

import sqlite3
import csv
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import platform

def get_anki_data_path():
    """Get the default Anki data path for User 1 based on OS"""
    system = platform.system()
    
    if system == "Darwin":  # macOS
        return Path.home() / "Library" / "Application Support" / "Anki2" / "User 1"
    elif system == "Windows":
        return Path.home() / "AppData" / "Roaming" / "Anki2" / "User 1"
    elif system == "Linux":
        return Path.home() / ".local" / "share" / "Anki2" / "User 1"
    else:
        raise Exception(f"Unsupported operating system: {system}")

def find_collection_db(anki_path):
    """Find the collection.anki2 database file"""
    collection_db = anki_path / "collection.anki2"
    if collection_db.exists():
        return collection_db
    
    # Try backup if main DB doesn't exist
    backups_path = anki_path / "backups"
    if backups_path.exists():
        backup_files = list(backups_path.glob("backup-*.colpkg"))
        if backup_files:
            # This would need additional handling for .colpkg files
            print("Warning: Only backup files found. Please ensure Anki is closed and collection.anki2 exists.")
    
    raise FileNotFoundError(f"Could not find collection.anki2 in {anki_path}")

def extract_cards_data(db_path, output_path):
    """Extract card data to CSV"""
    print(f"Extracting card data from {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Query to get card data with deck names and note info
    query = """
    SELECT 
        c.id as card_id,
        n.id as note_id,
        d.name as deck_name,
        c.type as card_type,
        c.queue as queue,
        c.due as due,
        c.ivl as interval_days,
        c.factor as ease_factor,
        c.reps as reviews,
        c.lapses as lapses,
        c.left as left_today,
        n.flds as fields,
        n.tags as tags,
        c.mod as last_modified,
        (SELECT COUNT(*) FROM revlog r WHERE r.cid = c.id) as review_count,
        (SELECT MAX(r.id) FROM revlog r WHERE r.cid = c.id) as last_review_time,
        CASE 
            WHEN c.queue = -1 THEN 'Suspended'
            WHEN c.queue = 0 THEN 'New'
            WHEN c.queue = 1 THEN 'Learning'
            WHEN c.queue = 2 THEN 'Review'
            WHEN c.queue = 3 THEN 'Day Learning'
            ELSE 'Unknown'
        END as status,
        CASE 
            WHEN c.ivl < 1 THEN 'New'
            WHEN c.ivl < 7 THEN 'Learning'
            WHEN c.ivl < 30 THEN 'Young'
            WHEN c.ivl < 180 THEN 'Mature'
            ELSE 'Very Mature'
        END as anki_level
    FROM cards c
    JOIN notes n ON c.nid = n.id
    JOIN decks d ON c.did = d.id
    WHERE c.queue >= 0  -- Exclude deleted cards
    ORDER BY n.id, c.ord
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    
    # Write to CSV
    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Header
        writer.writerow([
            'card_id', 'note_id', 'deck_name', 'card_type', 'queue', 'due',
            'interval_days', 'ease_factor', 'reviews', 'lapses', 'left_today',
            'fields', 'tags', 'last_modified', 'review_count', 'last_review_time',
            'status', 'anki_level', 'finnish', 'translation', 'last_review_date'
        ])
        
        # Data rows
        for row in results:
            # Parse fields (assuming first two fields are Finnish and translation)
            fields = row[11].split('\x1f') if row[11] else ['', '']
            finnish = fields[0] if len(fields) > 0 else ''
            translation = fields[1] if len(fields) > 1 else ''
            
            # Convert last review time to readable date
            last_review_date = ''
            if row[15]:  # last_review_time
                try:
                    # Anki timestamps are in milliseconds
                    last_review_date = datetime.fromtimestamp(row[15] / 1000).strftime('%Y-%m-%d')
                except:
                    last_review_date = ''
            
            # Write row with parsed fields
            writer.writerow(list(row) + [finnish, translation, last_review_date])
    
    conn.close()
    print(f"Exported {len(results)} cards to {output_path}")
    return len(results)

def extract_activity_data(db_path, output_path):
    """Extract review activity data to JSON"""
    print(f"Extracting activity data from {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get review log data for the last year
    one_year_ago = int((datetime.now() - timedelta(days=365)).timestamp() * 1000)
    
    query = """
    SELECT 
        DATE(r.id/1000, 'unixepoch') as review_date,
        COUNT(*) as reviews_count,
        SUM(CASE WHEN r.ease > 0 THEN 1 ELSE 0 END) as successful_reviews,
        AVG(r.time) as avg_time_ms,
        SUM(r.time) as total_time_ms
    FROM revlog r
    WHERE r.id > ?
    GROUP BY DATE(r.id/1000, 'unixepoch')
    ORDER BY review_date
    """
    
    cursor.execute(query, (one_year_ago,))
    results = cursor.fetchall()
    
    # Convert to the format expected by the dashboard
    daily_activity = {}
    for row in results:
        date_str = row[0]
        daily_activity[date_str] = {
            'reviews': row[1],
            'successful': row[2],
            'avg_time': row[3] or 0,
            'total_time': row[4] or 0
        }
    
    activity_data = {
        'daily_activity': daily_activity,
        'last_updated': datetime.now().isoformat(),
        'total_days': len(daily_activity)
    }
    
    # Write to JSON
    with open(output_path, 'w', encoding='utf-8') as jsonfile:
        json.dump(activity_data, jsonfile, indent=2, ensure_ascii=False)
    
    conn.close()
    print(f"Exported activity data for {len(daily_activity)} days to {output_path}")
    return len(daily_activity)

def main():
    """Main function to update Anki data"""
    try:
        # Get Anki data path
        anki_path = get_anki_data_path()
        print(f"Looking for Anki data in: {anki_path}")
        
        if not anki_path.exists():
            print(f"Error: Anki data directory not found at {anki_path}")
            print("Please make sure Anki is installed and has been run at least once.")
            sys.exit(1)
        
        # Find collection database
        db_path = find_collection_db(anki_path)
        print(f"Found Anki database: {db_path}")
        
        # Output paths
        script_dir = Path(__file__).parent
        cards_output = script_dir / "public" / "anki_stats.csv"
        activity_output = script_dir / "public" / "activity_log.json"
        
        # Create public directory if it doesn't exist
        cards_output.parent.mkdir(exist_ok=True)
        
        # Extract data
        cards_count = extract_cards_data(db_path, cards_output)
        activity_days = extract_activity_data(db_path, activity_output)
        
        print(f"\n✅ Data update completed successfully!")
        print(f"📊 Exported {cards_count} cards")
        print(f"📈 Exported {activity_days} days of activity")
        print(f"📁 Files saved to: {cards_output.parent}")
        print(f"\nYou can now run 'npm run dev' to see the updated data.")
        
    except Exception as e:
        print(f"❌ Error updating data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()