#!/usr/bin/env python3
"""
Convert Baserow CSV exports to properly structured JSON for NocoDB import.
Preserves JSONB columns and relationships.
"""

import csv
import json
from pathlib import Path


def convert_media_csv_to_json(csv_path: str, output_path: str):
    """Convert Media Outlets CSV to JSON with proper People column structure."""
    
    records = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Parse the People column (JSONB from Baserow)
            people_str = row.get('People', '{}')
            
            try:
                # Try to parse as JSON first
                people_data = json.loads(people_str) if people_str else {}
            except json.JSONDecodeError:
                # If it's just text, wrap it in a dict
                people_data = {"raw": people_str}
            
            record = {
                "id": int(row['id']) if row.get('id') else None,
                "Name": row.get('Name', ''),
                "Website": row.get('Website', ''),
                "Category": row.get('Category', ''),
                "People": people_data  # Now properly structured as JSON object
            }
            
            records.append(record)
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Converted {len(records)} media outlets to JSON")
    return records


def convert_journalists_csv_to_json(csv_path: str, output_path: str):
    """Convert Journalists CSV to JSON with proper Media column structure."""
    
    records = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Parse the Media column (JSONB from Baserow)
            media_str = row.get('Media', '{}')
            
            try:
                # Try to parse as JSON first
                media_data = json.loads(media_str) if media_str else {}
            except json.JSONDecodeError:
                # If it's just text, wrap it in a dict
                media_data = {"raw": media_str}
            
            record = {
                "id": int(row['id']) if row.get('id') else None,
                "Name": row.get('Name', ''),
                "Email": row.get('Email', ''),
                "Media": media_data  # Now properly structured as JSON object
            }
            
            records.append(record)
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Converted {len(records)} journalists to JSON")
    return records


if __name__ == "__main__":
    # Define paths (adjust for your Windows path)
    MEDIA_CSV = r"C:\Users\spytz\OneDrive\Stellar Code\Stellar Databases\media\export - Media - Grid view.csv"
    JOURNALIST_CSV = r"C:\Users\spytz\OneDrive\Stellar Code\Stellar Databases\media\export - Journalists - Grid view.csv"
    
    MEDIA_JSON = r"C:\Users\spytz\OneDrive\Stellar Code\Stellar Databases\media\media_outlets.json"
    JOURNALIST_JSON = r"C:\Users\spytz\OneDrive\Stellar Code\Stellar Databases\media\journalists.json"
    
    print("Converting CSV to JSON for NocoDB import...")
    print("=" * 50)
    
    if Path(MEDIA_CSV).exists():
        convert_media_csv_to_json(MEDIA_CSV, MEDIA_JSON)
    else:
        print(f"❌ Media CSV not found at {MEDIA_CSV}")
    
    if Path(JOURNALIST_CSV).exists():
        convert_journalists_csv_to_json(JOURNALIST_CSV, JOURNALIST_JSON)
    else:
        print(f"❌ Journalist CSV not found at {JOURNALIST_CSV}")
    
    print("=" * 50)
    print("✓ Conversion complete! Files ready for NocoDB import.")
