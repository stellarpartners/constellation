#!/usr/bin/env python3
"""
Constellation Data Migration Script
Exports data from Docker Postgres → Neon Postgres

Usage:
    python3 migrate_to_neon.py

Before running:
    1. Set NEON_CONNECTION_STRING env var (get from Neon dashboard)
    2. Make sure Docker Postgres is running and accessible
    3. Run the schema: psql < neon/schema.sql

What it does:
    1. Reads journalists + media_outlets + relations from Docker Postgres
    2. Exports to CSV
    3. Imports into Neon
"""

import os
import csv
import subprocess
import psycopg2
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

DOCKER_DB = "constellation_db"
DOCKER_USER = "constellation_user"
NEON_URI = os.environ.get("NEON_CONNECTION_STRING", "")

EXPORT_DIR = Path(__file__).parent / "export"
EXPORT_DIR.mkdir(exist_ok=True)

# ── Helpers ───────────────────────────────────────────────────────────────────

def docker_sql(query: str):
    """Run query in Docker Postgres, return rows."""
    result = subprocess.run(
        [
            "docker", "exec", "constellation-postgres",
            "psql", "-U", DOCKER_USER, "-d", DOCKER_DB,
            "-t", "-A", "-F", "\t", "-c", query
        ],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"Docker SQL error: {result.stderr}")
    rows = [tuple(line.split("\t")) for line in result.stdout.strip().split("\n") if line]
    return rows

def export_table(name: str, query: str, headers: list[str]):
    """Export query results to CSV."""
    rows = docker_sql(query)
    path = EXPORT_DIR / f"{name}.tsv"
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter="\t")
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"  Exported {len(rows)} rows → {path}")
    return path

# ── Export ─────────────────────────────────────────────────────────────────────

print("\n=== EXPORTING FROM DOCKER POSTGRES ===\n")

# Media outlets
outlets_path = export_table(
    "media_outlets",
    "SELECT id, name, type_of_media, website, country, location, notes FROM media_outlets ORDER BY id",
    ["id", "name", "type_of_media", "website", "country", "location", "notes"]
)

# Journalists
journalists_path = export_table(
    "journalists",
    "SELECT id, name, COALESCE(media_outlet_name,''), COALESCE(primary_beat,''), COALESCE(article_urls,'') FROM journalists ORDER BY id",
    ["id", "name", "media_outlet_name", "primary_beat", "article_urls"]
)

# Relations
relations_path = export_table(
    "outlet_journalist_relations",
    "SELECT journalist_id, media_outlet_id, COALESCE(role,'') FROM outlet_journalist_relations",
    ["journalist_id", "media_outlet_id", "role"]
)

print(f"\nExported to {EXPORT_DIR}")
print("\n=== DONE EXPORTING ===")
print("\nNext steps:")
print("  1. Create Neon project at https://neon.tech")
print("  2. Run the schema: psql < neon/schema.sql")
print("  3. Import data into Neon:")
print("     psql $NEON_CONNECTION_STRING -c \"\\i export/media_outlets.tsv\"")
print("     psql $NEON_CONNECTION_STRING -c \"\\i export/journalists.tsv\"")
print("     psql $NEON_CONNECTION_STRING -c \"\\i export/outlet_journalist_relations.tsv\"")
print("  Or use the import script: python3 import_from_tsv.py")
