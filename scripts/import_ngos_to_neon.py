#!/usr/bin/env python3
"""
Constellation NGO Import → Neon PostgreSQL
==========================================
Idempotent: safe to re-run. Existing data preserved via ON CONFLICT.
All data preserved exactly as-is — no stripping, no reformatting.

Usage:
    export NEON_CONNECTION_STRING='postgresql://...'
    python3 scripts/import_ngos_to_neon.py
"""

import os
import csv
import re
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE       = Path(__file__).parent.parent.resolve()
IMPORT_DIR = BASE / "import" / "ngodatabase"
NEON_DIR   = BASE / "neon"

SOURCES = {
    "MASTER":          IMPORT_DIR / "MASTER-ALL (2).csv",
    "WebsiteAudits":   IMPORT_DIR / "Website Audits-Grid view.csv",
    "ngoHeroes":       IMPORT_DIR / "ngoHeroes-Grid view.csv",
    "YouBeHero":       IMPORT_DIR / "YouBeHero-Grid view.csv",
    "SocialDynamo":    IMPORT_DIR / "Social Dynamo-Grid view.csv",
    "ACF":             IMPORT_DIR / "ACF-Grid view.csv",
    "Ethelon":         IMPORT_DIR / "Ethelon-Grid view.csv",
    "Desmos":          IMPORT_DIR / "Desmos-Grid view.csv",
}

# ---------------------------------------------------------------------------
# DB Connection
# ---------------------------------------------------------------------------
def get_conn():
    conn_str = os.environ.get("NEON_CONNECTION_STRING", "")
    if not conn_str:
        env_file = NEON_DIR / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("NEON_CONNECTION_STRING="):
                    conn_str = line.split("=", 1)[1].strip().strip("'\"")
    if not conn_str:
        raise RuntimeError(
            "NEON_CONNECTION_STRING not set.\n"
            "  export NEON_CONNECTION_STRING='postgresql://user:pass@host/dbname?sslmode=require'"
        )
    import psycopg2
    return psycopg2.connect(conn_str)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def make_slug(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9α-ωά-ώa-z0-9\s-]", "", s)
    s = re.sub(r"[\s]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:500]


def norm_for_match(s: str) -> str:
    return s.strip().lower()


def log(msg: str):
    print(f"  {msg}", flush=True)


def log_warn(msg: str):
    print(f"  [WARN] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Batch insert helper — uses execute_batch for speed on Neon serverless
# ---------------------------------------------------------------------------
try:
    from psycopg2.extras import execute_batch, execute_values
except ImportError:
    execute_batch = execute_values = None


def batch_insert(cur, sql: str, rows: list, page_size: int = 200):
    """Insert rows using individual executes. Neon serverless connection pooler
    has issues with execute_batch + ON CONFLICT + multi-statement batches.
    Individual executes are slower but correct."""
    if not rows:
        return
    for row in rows:
        cur.execute(sql, row)


# ---------------------------------------------------------------------------
# 1. ngos
# ---------------------------------------------------------------------------
def import_ngos(cur):
    log("Importing ngos...")
    path = SOURCES["MASTER"]

    rows = []
    skipped = 0
    seen_names = {}  # track duplicate names for suffixing

    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["Company Name"].strip()
            if not name:
                skipped += 1
                continue

            # Handle true duplicates in source: suffix to keep both
            if name in seen_names:
                seen_names[name] += 1
                name = f"{name} ({seen_names[name]})"
            else:
                seen_names[name] = 1

            slug = make_slug(name)
            rows.append((
                name,
                slug,
                row.get("Κατηγορία", ""),
                row.get("Email", ""),
                row.get("Phone", ""),
                row.get("Διεύθυνση", ""),
                row.get("Πόλη", ""),
                row.get("Website", ""),
                row.get("WordPress", ""),
                row.get("WordPress", ""),
                row.get("HubSpot Company ID", ""),
                row.get("Last Modified", ""),
            ))

    sql = """
        INSERT INTO ngos (
            company_name, slug,
            category, email, phone, address, city,
            website, wordpress, wordpress_url,
            hubspot_id, last_modified_raw, last_modified
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NULL)
        ON CONFLICT (company_name) DO UPDATE SET
            slug               = EXCLUDED.slug,
            category           = COALESCE(NULLIF(EXCLUDED.category, ''),       ngos.category),
            email              = COALESCE(NULLIF(EXCLUDED.email, ''),          ngos.email),
            phone              = COALESCE(NULLIF(EXCLUDED.phone, ''),         ngos.phone),
            address            = COALESCE(NULLIF(EXCLUDED.address, ''),       ngos.address),
            city               = COALESCE(NULLIF(EXCLUDED.city, ''),          ngos.city),
            website            = COALESCE(NULLIF(EXCLUDED.website, ''),       ngos.website),
            wordpress          = COALESCE(NULLIF(EXCLUDED.wordpress, ''),     ngos.wordpress),
            wordpress_url      = COALESCE(NULLIF(EXCLUDED.wordpress_url, ''),  ngos.wordpress_url),
            hubspot_id         = COALESCE(NULLIF(EXCLUDED.hubspot_id, ''),   ngos.hubspot_id),
            last_modified_raw  = EXCLUDED.last_modified_raw
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  ngos: {len(rows)} rows, {skipped} skipped (empty name)")


# ---------------------------------------------------------------------------
# 2. ngo_social_profiles
# ---------------------------------------------------------------------------
def import_ngo_social(cur):
    log("Importing ngo_social_profiles...")
    path = SOURCES["MASTER"]

    cur.execute("SELECT id, company_name FROM ngos")
    name_to_id = {norm_for_match(r[1]): r[0] for r in cur.fetchall()}

    platform_map = {
        "Facebook":  "facebook",
        "LinkedIn":   "linkedin",
        "Instagram": "instagram",
        "YouTube":    "youtube",
        "Twitter":    "twitter",
        "TikTok":     "tiktok",
    }

    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ngo_id = name_to_id.get(norm_for_match(row["Company Name"]))
            if not ngo_id:
                continue
            for csv_col, platform in platform_map.items():
                url = row.get(csv_col, "").strip()
                if url:
                    rows.append((ngo_id, platform, url))

    sql = """
        INSERT INTO ngo_social_profiles (ngo_id, platform, profile_url)
        VALUES (%s,%s,%s)
        ON CONFLICT (ngo_id, platform) DO UPDATE SET profile_url=EXCLUDED.profile_url
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  ngo_social_profiles: {len(rows)} entries")


# ---------------------------------------------------------------------------
# 3. website_audits
# ---------------------------------------------------------------------------
def import_website_audits(cur):
    log("Importing website_audits...")

    cur.execute("SELECT id, company_name FROM ngos")
    name_to_id = {norm_for_match(r[1]): r[0] for r in cur.fetchall()}

    rows = []
    with open(SOURCES["WebsiteAudits"], newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ngo_id = name_to_id.get(norm_for_match(row.get("MASTER _ NGOs", "")))
            if not ngo_id:
                log_warn(f"  Audit: no NGO match for '{row.get('MASTER _ NGOs', '')}'")
                continue
            rows.append((
                ngo_id,
                row.get("scanDate", ""),
                row.get("all", ""),
                row.get("2XX", ""),
                row.get("3XX", ""),
                row.get("4XX", ""),
                row.get("f", ""),
                row.get("Name", ""),
                row.get("Website (from MASTER _ NGOs)", ""),
                row.get("MASTER _ NGOs", ""),
            ))

    sql = """
        INSERT INTO website_audits (
            ngo_id, scan_date, total_pages, http_2xx, http_3xx, http_4xx,
            error_rate, status_note, audited_url, master_ngo_name
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  website_audits: {len(rows)} rows")


# ---------------------------------------------------------------------------
# 4. ngo_youbehero
# ---------------------------------------------------------------------------
def import_ngo_youbehero(cur):
    log("Importing ngo_youbehero...")

    cur.execute("SELECT id, company_name FROM ngos")
    name_to_id = {norm_for_match(r[1]): r[0] for r in cur.fetchall()}

    rows = []
    with open(SOURCES["YouBeHero"], newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get("YouBeHero URL", "").strip()
            if not url:
                continue
            source_name = row.get("MASTER", "")
            ngo_id = name_to_id.get(norm_for_match(source_name))
            rows.append((ngo_id, url, source_name))

    sql = """
        INSERT INTO ngo_youbehero (ngo_id, profile_url, source_name)
        VALUES (%s,%s,%s)
        ON CONFLICT (ngo_id, profile_url) DO UPDATE SET
            source_name = COALESCE(NULLIF(EXCLUDED.source_name, ''), ngo_youbehero.source_name)
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  ngo_youbehero: {len(rows)} rows")


# ---------------------------------------------------------------------------
# 5. ngo_social_dynamo
# ---------------------------------------------------------------------------
def import_ngo_social_dynamo(cur):
    log("Importing ngo_social_dynamo...")

    cur.execute("SELECT id, company_name FROM ngos")
    name_to_id = {norm_for_match(r[1]): r[0] for r in cur.fetchall()}

    rows = []
    with open(SOURCES["SocialDynamo"], newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get("SocialDynamo URL", "").strip()
            if not url:
                continue
            source_name = row.get("MASTER", "")
            ngo_id = name_to_id.get(norm_for_match(source_name))
            rows.append((ngo_id, url, source_name))

    sql = """
        INSERT INTO ngo_social_dynamo (ngo_id, profile_url, source_name)
        VALUES (%s,%s,%s)
        ON CONFLICT (ngo_id, profile_url) DO UPDATE SET
            source_name = COALESCE(NULLIF(EXCLUDED.source_name, ''), ngo_social_dynamo.source_name)
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  ngo_social_dynamo: {len(rows)} rows")


# ---------------------------------------------------------------------------
# 6. ngo_acf
# ---------------------------------------------------------------------------
def import_ngo_acf(cur):
    log("Importing ngo_acf...")

    cur.execute("SELECT id, company_name FROM ngos")
    name_to_id = {norm_for_match(r[1]): r[0] for r in cur.fetchall()}

    rows = []
    with open(SOURCES["ACF"], newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            acf_slug = row.get("Name", "").strip()
            if not acf_slug:
                continue
            source_name = row.get("NGOs", "")
            ngo_id = name_to_id.get(norm_for_match(source_name))
            rows.append((ngo_id, acf_slug, source_name))

    sql = """
        INSERT INTO ngo_acf (ngo_id, acf_slug, source_name)
        VALUES (%s,%s,%s)
        ON CONFLICT (ngo_id, acf_slug) DO UPDATE SET
            source_name = COALESCE(NULLIF(EXCLUDED.source_name, ''), ngo_acf.source_name)
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  ngo_acf: {len(rows)} rows")


# ---------------------------------------------------------------------------
# 7. ngo_ngheroes
# ---------------------------------------------------------------------------
def import_ngo_ngheroes(cur):
    log("Importing ngo_ngheroes...")

    cur.execute("SELECT id, company_name FROM ngos")
    name_to_id = {norm_for_match(r[1]): r[0] for r in cur.fetchall()}

    rows = []
    with open(SOURCES["ngoHeroes"], newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            profile_slug = row.get("Name", "").strip()
            if not profile_slug:
                continue
            source_name = row.get("MASTER", "")
            ngo_id = name_to_id.get(norm_for_match(source_name))
            rows.append((ngo_id, profile_slug, profile_slug, source_name))

    sql = """
        INSERT INTO ngo_ngheroes (ngo_id, profile_slug, profile_url, source_name)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (ngo_id, profile_slug) DO UPDATE SET
            source_name = COALESCE(NULLIF(EXCLUDED.source_name, ''), ngo_ngheroes.source_name)
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  ngo_ngheroes: {len(rows)} rows")


# ---------------------------------------------------------------------------
# 8. ngo_ethelon
# ---------------------------------------------------------------------------
def import_ngo_ethelon(cur):
    log("Importing ngo_ethelon...")

    cur.execute("SELECT id, company_name FROM ngos")
    name_to_id = {norm_for_match(r[1]): r[0] for r in cur.fetchall()}

    rows = []
    with open(SOURCES["Ethelon"], newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get("Ethelon URL", "").strip()
            if not url:
                continue
            source_name = row.get("MASTER", "")
            ignore_flag = row.get("Ignore", "")
            ngo_id = name_to_id.get(norm_for_match(source_name))
            rows.append((ngo_id, url, source_name, ignore_flag))

    sql = """
        INSERT INTO ngo_ethelon (ngo_id, profile_url, source_name, ignore_flag)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (ngo_id, profile_url) DO UPDATE SET
            source_name = COALESCE(NULLIF(EXCLUDED.source_name, ''), ngo_ethelon.source_name),
            ignore_flag = EXCLUDED.ignore_flag
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  ngo_ethelon: {len(rows)} rows")


# ---------------------------------------------------------------------------
# 9. ngo_desmos — ALL rows, unmatched get ngo_id = NULL
# ---------------------------------------------------------------------------
def import_ngo_desmos(cur):
    log("Importing ngo_desmos (all rows, unmatched = NULL)...")

    cur.execute("SELECT id, company_name FROM ngos")
    name_to_id = {norm_for_match(r[1]): r[0] for r in cur.fetchall()}

    rows = []
    with open(SOURCES["Desmos"], newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            profile_url = row.get("Name", "").strip()
            if not profile_url:
                continue
            source_name = row.get("NGOs", "")
            ngo_id = name_to_id.get(norm_for_match(source_name))
            rows.append((ngo_id, profile_url, source_name))

    sql = """
        INSERT INTO ngo_desmos (ngo_id, profile_url, source_name)
        VALUES (%s,%s,%s)
        ON CONFLICT (profile_url) DO UPDATE SET
            ngo_id      = COALESCE(EXCLUDED.ngo_id, ngo_desmos.ngo_id),
            source_name = COALESCE(NULLIF(EXCLUDED.source_name, ''), ngo_desmos.source_name)
    """
    batch_insert(cur, sql, rows, page_size=200)
    log(f"  ngo_desmos: {len(rows)} rows")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("\n=== Constellation NGO Import → Neon ===\n")

    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor()

    steps = [
        ("ngos",                import_ngos),
        ("ngo_social_profiles", import_ngo_social),
        ("website_audits",      import_website_audits),
        ("ngo_youbehero",       import_ngo_youbehero),
        ("ngo_social_dynamo",   import_ngo_social_dynamo),
        ("ngo_acf",             import_ngo_acf),
        ("ngo_ngheroes",        import_ngo_ngheroes),
        ("ngo_ethelon",         import_ngo_ethelon),
        ("ngo_desmos",          import_ngo_desmos),
    ]

    try:
        for name, fn in steps:
            try:
                fn(cur)
                conn.commit()
                print(f"  {name}: committed")
            except Exception as e:
                conn.rollback()
                print(f"\n  ERROR in {name}: {e}")
                raise

        print("\n=== Import complete ===\n")

        # Final counts
        cur.execute("""
            SELECT 'ngos'                   , COUNT(*) FROM ngos
            UNION ALL SELECT 'ngo_social_profiles'    , COUNT(*) FROM ngo_social_profiles
            UNION ALL SELECT 'website_audits'          , COUNT(*) FROM website_audits
            UNION ALL SELECT 'ngo_youbehero'           , COUNT(*) FROM ngo_youbehero
            UNION ALL SELECT 'ngo_social_dynamo'        , COUNT(*) FROM ngo_social_dynamo
            UNION ALL SELECT 'ngo_acf'                  , COUNT(*) FROM ngo_acf
            UNION ALL SELECT 'ngo_ngheroes'              , COUNT(*) FROM ngo_ngheroes
            UNION ALL SELECT 'ngo_ethelon'              , COUNT(*) FROM ngo_ethelon
            UNION ALL SELECT 'ngo_desmos'               , COUNT(*) FROM ngo_desmos
            UNION ALL SELECT 'ngo_desmos_unmatched'      , COUNT(*) FROM ngo_desmos WHERE ngo_id IS NULL
            ORDER BY 1
        """)
        for row in cur.fetchall():
            print(f"  {row[0]:30s} {row[1]}")

    except Exception as e:
        print(f"\nFATAL: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
