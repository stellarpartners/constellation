#!/usr/bin/env python3
"""
Constellation Navigation Demo
Demonstrates bidirectional navigation between journalists and media outlets using database views.
"""

import subprocess
import json

def run_query(query):
    """Execute a SQL query in PostgreSQL."""
    cmd = [
        'docker', 'exec', 
        'constellation-postgres',
        'psql', '-U', 'constellation_user', 
        '-d', 'constellation_db',
        '-c', query
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()

def show_relationship_stats():
    """Show overall statistics."""
    print("\n" + "="*60)
    print("RELATIONSHIP STATISTICS")
    print("="*60)
    
    query = "SELECT * FROM v_relationship_stats;"
    output = run_query(query)
    for line in output.split('\n'):
        if line:
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 3:
                print(f"{parts[0]:<25} {parts[1]:<20} {parts[2]}")

def show_cross_platform_journalists():
    """Show journalists working at multiple outlets."""
    print("\n" + "="*60)
    print("CROSS-PLATFORM JOURNALISTS (working at multiple outlets)")
    print("="*60)
    
    query = "SELECT journalist_name, outlet_count FROM v_cross_platform_journalists;"
    output = run_query(query)
    if output:
        for line in output.split('\n'):
            if line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 2:
                    print(f"{parts[0]:<30} {parts[1]} outlets")

def show_top_outlets():
    """Show top media outlets by journalist count."""
    print("\n" + "="*60)
    print("TOP MEDIA OUTLETS BY JOURNALIST COUNT")
    print("="*60)
    
    query = "SELECT outlet_name, journalist_count FROM v_top_media_outlets ORDER BY journalist_count DESC LIMIT 15;"
    output = run_query(query)
    if output:
        for line in output.split('\n'):
            if line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 2:
                    print(f"{parts[0]:<30} {parts[1]} journalists")

def navigate_journalist_to_outlets(journalist_id):
    """Navigate from a journalist to their media outlets."""
    print("\n" + "="*60)
    print(f"Navigating: Journalist ID {journalist_id}")
    print("="*60)
    
    # Get journalist info
    query = f"""
        SELECT j.name as journalist_name, 
               COUNT(DISTINCT ojrl.media_outlet_id) as outlet_count
        FROM journalists j
        JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
        WHERE j.id = {journalist_id}
        GROUP BY j.id, j.name;
    """
    output = run_query(query)
    
    if output:
        for line in output.split('\n'):
            if line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 2:
                    print(f"Journalist: {parts[0]}")
                    print(f"Works at: {parts[1]} outlets")
                    
                    # Show outlet names
                    query2 = f"""
                        SELECT mo.name 
                        FROM journalists j
                        JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
                        JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id
                        WHERE j.id = {journalist_id}
                        ORDER BY mo.name;
                    """
                    outlets = run_query(query2)
                    if outlets:
                        print("Outlets:")
                        for outlet in outlets.split('\n'):
                            if outlet and '|' not in outlet:
                                print(f"  • {outlet.strip()}")

def navigate_outlet_to_journalists(outlet_id):
    """Navigate from a media outlet to their journalists."""
    print("\n" + "="*60)
    print(f"Navigating: Media Outlet ID {outlet_id}")
    print("="*60)
    
    # Get outlet info
    query = f"""
        SELECT mo.name as outlet_name, 
               COUNT(DISTINCT ojrl.journalist_id) as journalist_count
        FROM media_outlets mo
        JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
        WHERE mo.id = {outlet_id}
        GROUP BY mo.id, mo.name;
    """
    output = run_query(query)
    
    if output:
        for line in output.split('\n'):
            if line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 2:
                    print(f"Outlet: {parts[0]}")
                    print(f"Has: {parts[1]} journalists")
                    
                    # Show journalist names
                    query2 = f"""
                        SELECT j.name 
                        FROM media_outlets mo
                        JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
                        JOIN journalists j ON ojrl.journalist_id = j.id
                        WHERE mo.id = {outlet_id}
                        ORDER BY j.name;
                    """
                    journalists = run_query(query2)
                    if journalists:
                        print("Journalists:")
                        for journalist in journalists.split('\n'):
                            if journalist and '|' not in journalist:
                                print(f"  • {journalist.strip()}")

def main():
    """Main demo function."""
    print("\n" + "#"*60)
    print("# CONSTELLATION DATABASE NAVIGATION DEMO")
    print("#"*60)
    
    # Show statistics
    show_relationship_stats()
    
    # Show cross-platform journalists
    show_cross_platform_journalists()
    
    # Show top outlets
    show_top_outlets()
    
    # Demo navigation: Journalist → Outlets
    print("\n" + "#"*60)
    print("# NAVIGATION DEMO: Journalist to Media Outlets")
    print("#"*60)
    navigate_journalist_to_outlets(11)  # Συμέλα Τουχτίδου
    
    # Demo navigation: Outlet → Journalists  
    print("\n" + "#"*60)
    print("# NAVIGATION DEMO: Media Outlet to Journalists")
    print("#"*60)
    navigate_outlet_to_journalists(3)  # Vima

if __name__ == '__main__':
    main()
