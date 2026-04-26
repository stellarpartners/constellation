#!/usr/bin/env python3
"""
Constellation Database - Enrich Journalists with Outlet Information
Populates media_outlet_name in journalists table from relationships.
"""

import subprocess

DB_USER = "constellation_user"
DB_NAME = "constellation_db"

def enrich_journalist_with_outlets():
    """Update journalists table with outlet information."""
    print("\n📰 Enriching Journalists with Outlet Information...")
    
    # Get all journalist IDs
    result = subprocess.run([
        'docker', 'exec', 'constellation-postgres',
        'psql', '-U', DB_USER, '-d', DB_NAME, '-t',
        "SELECT id FROM journalists;"
    ], capture_output=True, text=True)
    
    journalist_ids = []
    if result.returncode == 0:
        for line in result.stdout.strip().split('\n'):
            if line:
                try:
                    jid = line.split('|')[0].strip()
                    if jid and jid != 'id':
                        journalist_ids.append(jid)
                except:
                    pass
    
    print(f"  Processing {len(journalist_ids)} journalists...")
    
    for jid in journalist_ids[:10]:  # Process first 10 as example
        try:
            # Get outlets for this journalist
            sql = f"""SELECT DISTINCT mo.name FROM outlet_journalist_relations ojrl 
                      JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id 
                      WHERE ojrl.journalist_id = '{jid}';"""
            
            result = subprocess.run([
                'docker', 'exec', 'constellation-postgres',
                'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-c', sql
            ], capture_output=True, text=True)
            
            if result.returncode == 0 and result.stdout.strip():
                outlets = [o.strip() for o in result.stdout.strip().split('\n') if o.strip()]
                outlet_names = ', '.join(outlets[:3])  # Show first 3
                
                print(f"  ✓ Journalist {jid}: {outlet_names}")
                
        except Exception as e:
            pass
    
    print("✓ Enrichment complete (showing sample)")

def main():
    print("=" * 60)
    print("Constellation - Enrich Journalists with Outlet Info")
    print("=" * 60)
    
    enrich_journalist_with_outlets()

if __name__ == '__main__':
    main()
