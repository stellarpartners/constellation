#!/usr/bin/env python3
"""
Constellation Database Import Script (Minimal, working version)
Imports only essential columns to avoid SQL parsing issues.
"""

import csv
import os
import subprocess
import sys

# Configuration
DB_USER = "constellation_user"
DB_PASS = "constellation_pass"
DB_NAME = "constellation_db"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(SCRIPT_DIR, '../import/media')

def import_media_outlets(csv_path):
    """Import media outlets data - essential columns only."""
    print(f"\n📰 Importing Media Outlets from {os.path.basename(csv_path)}...")
    
    count = 0
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                # Get essential values only
                id_val = row.get('id', '').strip().strip('"')
                name_val = row.get('Name', '').strip().strip('"')
                
                if not id_val or not name_val:
                    continue
                
                # Escape single quotes in SQL strings
                id_val = id_val.replace("'", "''")
                name_val = name_val.replace("'", "''")
                
                sql = f"""INSERT INTO media_outlets (id, name) VALUES ('{id_val}', '{name_val}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;"""
                
                subprocess.run([
                    'docker', 'exec', 'constellation-postgres',
                    'psql', '-U', DB_USER, '-d', DB_NAME, '-c', sql
                ], capture_output=True)
                
                count += 1
                
            except Exception as e:
                print(f"  ⚠️ Error processing row {count}: {e}")
    
    print(f"✓ Imported/Updated {count} media outlets")

def import_journalists(csv_path):
    """Import journalists data - essential columns only."""
    print(f"\n👤 Importing Journalists from {os.path.basename(csv_path)}...")
    
    count = 0
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                id_val = row.get('ID', '').strip().strip('"') or row.get('id', '').strip().strip('"')
                name_val = row.get('Name', '').strip().strip('"')
                
                if not id_val or not name_val:
                    continue
                
                # Escape single quotes in SQL strings
                id_val = id_val.replace("'", "''")
                name_val = name_val.replace("'", "''")
                
                sql = f"""INSERT INTO journalists (id, name) VALUES ('{id_val}', '{name_val}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;"""
                
                subprocess.run([
                    'docker', 'exec', 'constellation-postgres',
                    'psql', '-U', DB_USER, '-d', DB_NAME, '-c', sql
                ], capture_output=True)
                
                count += 1
                
            except Exception as e:
                print(f"  ⚠️ Error processing row {count}: {e}")
    
    print(f"✓ Imported/Updated {count} journalists")

def main():
    """Main import routine."""
    print("=" * 60)
    print("Constellation Database Import Script (Minimal)")
    print("=" * 60)
    
    media_csv = os.path.join(CSV_DIR, 'export - Media - Grid view.csv')
    journalist_csv = os.path.join(CSV_DIR, 'export - Journalists - Grid view.csv')
    
    if not os.path.exists(media_csv):
        print(f"❌ Media CSV file not found: {media_csv}")
        sys.exit(1)
    
    if not os.path.exists(journalist_csv):
        print(f"❌ Journalist CSV file not found: {journalist_csv}")
        sys.exit(1)
    
    import_media_outlets(media_csv)
    import_journalists(journalist_csv)
    
    # Verify counts using psql
    result = subprocess.run([
        'docker', 'exec', 'constellation-postgres',
        'psql', '-U', DB_USER, '-d', DB_NAME, '-t',
        "SELECT 'media_outlets' as tbl, COUNT(*) FROM media_outlets UNION ALL SELECT 'journalists', COUNT(*) FROM journalists;"
    ], capture_output=True, text=True)
    
    print("\n" + "=" * 60)
    print("✅ Verification:")
    for line in result.stdout.strip().split('\n'):
        if line:
            print(f"   {line}")
    print("=" * 60)

if __name__ == '__main__':
    main()
