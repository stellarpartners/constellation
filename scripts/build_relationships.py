#!/usr/bin/env python3
"""
Constellation Database - Build Media-Journalist Relationships
Parses the 'People' column from media outlets CSV and creates relationships.
"""

import csv
import os
import subprocess
import re

# Configuration
DB_USER = "constellation_user"
DB_NAME = "constellation_db"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(SCRIPT_DIR, 'media')

def extract_journalist_names(people_column):
    """Extract individual journalist names from the People column."""
    if not people_column or people_column.strip() == '':
        return []
    
    # Split by comma and clean up names
    names = [n.strip().strip('"').strip() for n in people_column.split(',')]
    
    # Filter out empty strings and non-names (like "Newsroom Efsyn")
    filtered_names = []
    for name in names:
        if name and len(name) > 2 and not any(x in name.lower() for x in ['newsroom', 'media companies', 'description']):
            # Remove special characters that might be formatting artifacts
            clean_name = re.sub(r'[^\w\s\u00C0-\u017F\-\'"]', '', name)
            if len(clean_name) > 3:
                filtered_names.append(clean_name.strip())
    
    return filtered_names

def build_relationships(csv_path):
    """Build relationships between media outlets and journalists."""
    print(f"\n🔗 Building Media-Journalist Relationships from {os.path.basename(csv_path)}...")
    
    count = 0
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                # Get media outlet ID and name
                outlet_id = row.get('id', '').strip().strip('"')
                outlet_name = row.get('Name', '').strip().strip('"')
                
                if not outlet_id:
                    continue
                
                # Extract journalist names from People column (column 19)
                people_column = row.get('People', '') or ''
                journalist_names = extract_journalist_names(people_column)
                
                for journalist_name in journalist_names:
                    # Check if journalist exists in database
                    check_sql = f"""SELECT id FROM journalists WHERE name = '{journalist_name.replace("'", "''")}' LIMIT 1;"""
                    
                    result = subprocess.run([
                        'docker', 'exec', 'constellation-postgres',
                        'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-c', check_sql
                    ], capture_output=True, text=True)
                    
                    existing_id = None
                    if result.returncode == 0:
                        try:
                            existing_id = result.stdout.strip()
                        except:
                            pass
                    
                    if existing_id:
                        # Journalist exists - create relationship
                        role_sql = f"""INSERT INTO outlet_journalist_relations (media_outlet_id, journalist_id, role) 
                                      VALUES ('{outlet_id}', '{existing_id}', 'Staff') ON CONFLICT DO NOTHING;"""
                        
                        subprocess.run([
                            'docker', 'exec', 'constellation-postgres',
                            'psql', '-U', DB_USER, '-d', DB_NAME, '-c', role_sql
                        ], capture_output=True)
                        
                        count += 1
                    
                    else:
                        # Journalist doesn't exist - try to create them first
                        print(f"  ⚠️ Journalist '{journalist_name}' not found in database for outlet {outlet_id}")
                
            except Exception as e:
                print(f"  ⚠️ Error processing row {count}: {e}")
    
    print(f"✓ Created/Updated {count} relationships")

def main():
    """Main routine."""
    print("=" * 60)
    print("Constellation - Build Media-Journalist Relationships")
    print("=" * 60)
    
    media_csv = os.path.join(CSV_DIR, 'export - Media - Grid view.csv')
    
    if not os.path.exists(media_csv):
        print(f"❌ Media CSV file not found: {media_csv}")
        return
    
    build_relationships(media_csv)
    
    # Verify relationships
    result = subprocess.run([
        'docker', 'exec', 'constellation-postgres',
        'psql', '-U', DB_USER, '-d', DB_NAME, '-t',
        "SELECT COUNT(*) as total_relations FROM outlet_journalist_relations;"
    ], capture_output=True, text=True)
    
    print("\n" + "=" * 60)
    print("✅ Verification:")
    for line in result.stdout.strip().split('\n'):
        if line:
            print(f"   {line}")
    print("=" * 60)

if __name__ == '__main__':
    main()
