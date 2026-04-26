#!/usr/bin/env python3
"""
Constellation Studio CMS - Backend API
"""

import subprocess
import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__,
            static_folder=os.path.join(PROJECT_ROOT, 'static'),
            template_folder=os.path.join(PROJECT_ROOT, 'templates'))

CORS(app)

DB_USER = os.getenv('DB_USER', 'constellation_user')
DB_NAME = os.getenv('DB_NAME', 'constellation_db')
DB_CONTAINER = os.getenv('DB_CONTAINER', 'constellation-postgres')


def run_sql(query: str) -> list[list[str]]:
    """Execute SQL via docker exec psql; return list of rows (each row is a list of column values)."""
    cmd = ['docker', 'exec', DB_CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c', query]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        print(f"SQL Error: {result.stderr}")
        return []
    lines = [line for line in result.stdout.strip().split('\n') if line.strip()]
    return [line.split('|') for line in lines]


@app.route('/api/stats')
def get_stats():
    rows = run_sql("SELECT * FROM v_relationship_stats;")
    if not rows or len(rows[0]) < 3:
        return jsonify({'error': 'Failed to fetch stats'}), 500
    r = rows[0]
    return jsonify({
        'total_journalists': int(r[0]),
        'total_outlets': int(r[1]),
        'total_relationships': int(r[2]),
    })


@app.route('/api/cross-platform-journalists')
def get_cross_platform_journalists():
    rows = run_sql("SELECT * FROM v_cross_platform_journalists ORDER BY outlet_count DESC;")
    journalists = []
    for r in rows:
        if len(r) >= 3:
            journalists.append({
                'id': int(r[0]),
                'name': r[1].strip(),
                'outlet_count': int(r[2].strip()),
            })
    return jsonify({'journalists': journalists})


@app.route('/api/top-outlets/<int:limit>')
def get_top_outlets(limit=15):
    rows = run_sql(f"SELECT * FROM v_top_media_outlets ORDER BY journalist_count DESC LIMIT {limit};")
    outlets = []
    for r in rows:
        if len(r) >= 3:
            outlets.append({
                'id': int(r[0]),
                'name': r[1].strip(),
                'journalist_count': int(r[2].strip()),
            })
    return jsonify({'outlets': outlets})


@app.route('/api/journalists/<int:journalist_id>')
def get_journalist_profile(journalist_id):
    rows = run_sql(f"SELECT * FROM v_journalist_profile WHERE id = {journalist_id};")
    if not rows or len(rows[0]) < 3:
        return jsonify({'error': 'Journalist not found'}), 404

    r = rows[0]
    profile = {
        'id': int(r[0]),
        'name': r[1].strip(),
        'total_outlets': int(r[2].strip()),
    }

    nav_rows = run_sql(f"""
        SELECT mo.id, mo.name
        FROM journalists j
        JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
        JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id
        WHERE j.id = {journalist_id}
        ORDER BY mo.name;
    """)
    nav_links = []
    for nr in nav_rows:
        if len(nr) >= 2:
            nav_links.append({'outlet_id': int(nr[0]), 'outlet_name': nr[1].strip()})

    return jsonify({'profile': profile, 'navigation_links': nav_links})


@app.route('/api/outlets/<int:outlet_id>')
def get_outlet_profile(outlet_id):
    rows = run_sql(f"SELECT * FROM v_media_profile WHERE id = {outlet_id};")
    if not rows or len(rows[0]) < 3:
        return jsonify({'error': 'Outlet not found'}), 404

    r = rows[0]
    profile = {
        'id': int(r[0]),
        'name': r[1].strip(),
        'total_journalists': int(r[2].strip()),
    }

    nav_rows = run_sql(f"""
        SELECT j.id, j.name
        FROM media_outlets mo
        JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
        JOIN journalists j ON ojrl.journalist_id = j.id
        WHERE mo.id = {outlet_id}
        ORDER BY j.name;
    """)
    nav_links = []
    for nr in nav_rows:
        if len(nr) >= 2:
            nav_links.append({'journalist_id': int(nr[0]), 'journalist_name': nr[1].strip()})

    return jsonify({'profile': profile, 'navigation_links': nav_links})


@app.route('/api/search/journalists/<query>')
def search_journalists(query):
    safe = query.replace("'", "''")
    rows = run_sql(f"""
        SELECT j.id, j.name, COUNT(DISTINCT ojrl.media_outlet_id) AS outlet_count
        FROM journalists j
        LEFT JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
        WHERE j.name ILIKE '%{safe}%'
        GROUP BY j.id, j.name
        ORDER BY outlet_count DESC;
    """)
    journalists = []
    for r in rows:
        if len(r) >= 3:
            journalists.append({
                'id': int(r[0]),
                'name': r[1].strip(),
                'outlet_count': int(r[2].strip()),
            })
    return jsonify({'journalists': journalists})


@app.route('/api/search/outlets/<query>')
def search_outlets(query):
    safe = query.replace("'", "''")
    rows = run_sql(f"""
        SELECT mo.id, mo.name, COUNT(DISTINCT ojrl.journalist_id) AS journalist_count
        FROM media_outlets mo
        LEFT JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
        WHERE mo.name ILIKE '%{safe}%'
        GROUP BY mo.id, mo.name
        ORDER BY journalist_count DESC;
    """)
    outlets = []
    for r in rows:
        if len(r) >= 3:
            outlets.append({
                'id': int(r[0]),
                'name': r[1].strip(),
                'journalist_count': int(r[2].strip()),
            })
    return jsonify({'outlets': outlets})


@app.route('/api/relationships/journalist/<int:journalist_id>')
def get_journalist_relationships(journalist_id):
    rows = run_sql(f"""
        SELECT mo.id, mo.name, ojrl.role
        FROM journalists j
        JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
        JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id
        WHERE j.id = {journalist_id}
        ORDER BY mo.name;
    """)
    relationships = []
    for r in rows:
        if len(r) >= 3:
            relationships.append({
                'outlet_id': int(r[0]),
                'outlet_name': r[1].strip(),
                'role': r[2].strip(),
            })
    return jsonify({'relationships': relationships})


@app.route('/api/relationships/outlet/<int:outlet_id>')
def get_outlet_relationships(outlet_id):
    rows = run_sql(f"""
        SELECT j.id, j.name, ojrl.role
        FROM media_outlets mo
        JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
        JOIN journalists j ON ojrl.journalist_id = j.id
        WHERE mo.id = {outlet_id}
        ORDER BY j.name;
    """)
    relationships = []
    for r in rows:
        if len(r) >= 3:
            relationships.append({
                'journalist_id': int(r[0]),
                'journalist_name': r[1].strip(),
                'role': r[2].strip(),
            })
    return jsonify({'relationships': relationships})


@app.route('/')
def serve_ui():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'templates'), 'index.html')


if __name__ == '__main__':
    print("🌟 Constellation Studio CMS - Backend API")
    print("API running at http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
