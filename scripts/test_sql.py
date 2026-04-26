#!/usr/bin/env python3
"""Test script for SQL query execution."""

import subprocess

DB_CONFIG = {
    'user': 'constellation_user',
    'database': 'constellation_db'
}

def run_sql_query(query):
    """Execute SQL query and return results."""
    cmd = [
        'docker', 'exec', 
        'constellation-postgres',
        'psql', '-U', DB_CONFIG['user'],
        '-d', DB_CONFIG['database'],
        '-t', '-A', '-c'  # Use -c flag to pass query as argument
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text='utf-8')
    
    print(f"Return code: {result.returncode}")
    print(f"STDOUT: {repr(result.stdout)}")
    print(f"STDERR: {repr(result.stderr)}")
    
    if result.returncode != 0:
        return []
    
    # Parse pipe-separated output (psql default with -t -A)
    lines = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
    
    print(f"Parsed {len(lines)} lines")
    
    if not lines:
        return []
    
    # Split by pipe and convert to list of values
    try:
        return [lines[0].split('|')]  # Return as single-row array with column values
    except Exception as e:
        print(f"Error parsing: {e}")
        return []

if __name__ == '__main__':
    query = "SELECT * FROM v_relationship_stats;"
    results = run_sql_query(query)
    print(f"\nFinal results: {results}")
