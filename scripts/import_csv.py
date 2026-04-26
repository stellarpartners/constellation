#!/usr/bin/env python3
"""
Constellation Database Import Script
Imports CSV data from GOPA ECI and SIMA sources into PostgreSQL tables.
"""

import csv
import os
import sys
from sqlalchemy import create_engine, text

# Configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'constellation_user',
    'password': 'constellation_pass',
    'database': 'constellation_db'
}

CSV_DIR = os.path.dirname(os.path.abspath(__file__)) + '/media'

def connect():
    """Create database connection."""
    url = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    engine = create_engine(url)
    return engine

def import_media_outlets(csv_path):
    """Import media outlets data."""
    print(f"\n📰 Importing Media Outlets from {csv_path}...")
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        with connect() as engine:
            with engine.begin() as conn:
                for row in reader:
                    try:
                        # Adjust column names based on actual CSV headers
                        stmt = text("""
                            INSERT INTO media_outlets (id, name, url, country, type, notes)
                            VALUES (:id, :name, :url, :country, :type, :notes)
                            ON CONFLICT (id) DO UPDATE SET 
                                name = EXCLUDED.name,
                                url = EXCLUDED.url,
                                country = EXCLUDED.country,
                                type = EXCLUDED.type,
                                notes = COALESCE(media_outlets.notes, EXCLUDED.notes)
                        """)
                        
                        conn.execute(stmt, {
                            'id': row.get('ID') or row.get('Id') or row.get('id'),
                            'name': row.get('Name') or row.get('name'),
                            'url': row.get('URL') or row.get('Url') or row.get('url'),
                            'country': row.get('Country') or row.get('country'),
                            'type': row.get('Type') or row.get('type'),
                            'notes': row.get('Notes') or row.get('notes')
                        })
                    except Exception as e:
                        print(f"  ⚠️ Error processing row: {e}")
    
    print("✓ Media outlets imported successfully")

def import_journalists(csv_path):
    """Import journalists data."""
    print(f"\n👤 Importing Journalists from {csv_path}...")
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        with connect() as engine:
            with engine.begin() as conn:
                for row in reader:
                    try:
                        stmt = text("""
                            INSERT INTO journalists (id, name, outlet_id, role, notes)
                            VALUES (:id, :name, :outlet_id, :role, :notes)
                            ON CONFLICT (id) DO UPDATE SET 
                                name = EXCLUDED.name,
                                outlet_id = COALESCE(journalists.outlet_id, EXCLUDED.outlet_id),
                                role = EXCLUDED.role,
                                notes = COALESCE(journalists.notes, EXCLUDED.notes)
                        """)
                        
                        conn.execute(stmt, {
                            'id': row.get('ID') or row.get('Id') or row.get('id'),
                            'name': row.get('Name') or row.get('name'),
                            'outlet_id': row.get('Outlet_ID') or row.get('Outlet_Id') or row.get('outlet_id'),
                            'role': row.get('Role') or row.get('role'),
                            'notes': row.get('Notes') or row.get('notes')
                        })
                    except Exception as e:
                        print(f"  ⚠️ Error processing row: {e}")
    
    print("✓ Journalists imported successfully")

def main():
    """Main import routine."""
    print("=" * 60)
    print("Constellation Database Import Script")
    print("=" * 60)
    
    # Check if CSV files exist
    media_csv = os.path.join(CSV_DIR, 'export - Media - Grid view.csv')
    journalist_csv = os.path.join(CSV_DIR, 'export - Journalists - Grid view.csv')
    
    if not os.path.exists(media_csv):
        print(f"❌ Media CSV file not found: {media_csv}")
        sys.exit(1)
    
    if not os.path.exists(journalist_csv):
        print(f"❌ Journalist CSV file not found: {journalist_csv}")
        sys.exit(1)
    
    # Import data
    import_media_outlets(media_csv)
    import_journalists(journalist_csv)
    
    # Verify counts
    with connect() as engine:
        with engine.begin() as conn:
            outlets_count = conn.execute(text("SELECT COUNT(*) FROM media_outlets")).scalar()
            journalists_count = conn.execute(text("SELECT COUNT(*) FROM journalists")).scalar()
            
            print("\n" + "=" * 60)
            print(f"✅ Import Complete!")
            print(f"   Media Outlets: {outlets_count}")
            print(f"   Journalists: {journalists_count}")
            print("=" * 60)

if __name__ == '__main__':
    main()
