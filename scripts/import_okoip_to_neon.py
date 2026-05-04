#!/usr/bin/env python3
"""
Constellation — OKOIP Registry Import to Neon
==============================================
Reads the scraped OKOIP data, imports into 'okoip_registry' table,
and runs fuzzy name matching against existing 'ngos' table.

Usage:
    export NEON_CONNECTION_STRING='postgresql://...'
    python3 scripts/import_okoip_to_neon.py

If NEON_CONNECTION_STRING is not set, tries neon/.env file.
"""

import os
import json
import csv
import re
import sys
from pathlib import Path
from datetime import datetime

# ── Config ──────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent.resolve()
IMPORT_DIR = BASE_DIR / "import" / "okoip"
NEON_DIR = BASE_DIR / "neon"

# Match thresholds
EXACT_MATCH_SCORE = 1.00
TIN_MATCH_SCORE = 0.95
EMAIL_MATCH_SCORE = 0.90
FUZZY_HIGH_SCORE = 0.85
FUZZY_MEDIUM_SCORE = 0.70
FUZZY_LOW_SCORE = 0.50


# ── DB Connection ───────────────────────────────────────────────────────────

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
            "  export NEON_CONNECTION_STRING='postgresql://user:***@host/dbname?sslmode=require'"
        )
    import psycopg2
    return psycopg2.connect(conn_str)


# ── Helpers ─────────────────────────────────────────────────────────────────

def norm(s):
    """Normalize a string for matching: lowercase, strip, collapse whitespace."""
    if not s:
        return ""
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def clean_greek(s):
    """Normalize Greek text: remove accents, standardize common variations."""
    if not s:
        return ""
    s = norm(s)
    # Remove Greek diacritics for broader matching
    accent_map = {
        "ά": "α", "έ": "ε", "ή": "η", "ί": "ι", "ό": "ο", "ύ": "υ", "ώ": "ω",
        "ᾶ": "α", "ῆ": "η", "ῖ": "ι", "ῦ": "υ", "ῶ": "ω",
        "ϊ": "ι", "ϋ": "υ", "ΐ": "ι", "ΰ": "υ",
        "ἀ": "α", "ἁ": "α", "ἂ": "α", "ἃ": "α", "ἄ": "α", "ἅ": "α",
        "ἐ": "ε", "ἑ": "ε", "ἒ": "ε", "ἓ": "ε", "ἔ": "ε", "ἕ": "ε",
        "ἠ": "η", "ἡ": "η", "ἢ": "η", "ἣ": "η", "ἤ": "η", "ἥ": "η",
        "ἰ": "ι", "ἱ": "ι", "ἲ": "ι", "ἳ": "ι", "ἴ": "ι", "ἵ": "ι",
        "ὀ": "ο", "ὁ": "ο", "ὂ": "ο", "ὃ": "ο", "ὄ": "ο", "ὅ": "ο",
        "ὐ": "υ", "ὑ": "υ", "ὒ": "υ", "ὓ": "υ", "ὔ": "υ", "ὕ": "υ",
        "ὠ": "ω", "ὡ": "ω", "ὢ": "ω", "ὣ": "ω", "ὤ": "ω", "ὥ": "ω",
        "ὰ": "α", "ὲ": "ε", "ὴ": "η", "ὶ": "ι", "ὸ": "ο", "ὺ": "υ", "ὼ": "ω",
    }
    for accented, plain in accent_map.items():
        s = s.replace(accented, plain)
    # Collapse multiple spaces
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def strip_org_suffix(name):
    """Remove common legal suffixes for better matching."""
    suffixes = [
        r"\bαστικη\s+μη\s+κερδοσκοπικη\b",
        r"\bα\.μ\.κε\.?\b",
        r"\bαμκε\b",
        r"\bσωματειο\b",
        r"\bιδρυμα\b",
        r"\bκοινωφελεσ\b",
        r"\bαστική\s+μη\s+κερδοσκοπική\b",
        r"\bαστική\s+μη\s+κερδοσκοπικη\b",
        r"\bοργανωση\b",
        r"\bοργάνωση\b",
        r"\bσύλλογος\b",
        r"\bσυλλογος\b",
        r"\bnon[- ]profit\b",
        r"\bngo\b",
        r"\bn\.?g\.?o\.?\b",
        r"\bο\.?κοι\.?π\.?\b",
    ]
    result = name
    for pat in suffixes:
        result = re.sub(pat, "", result)
    result = re.sub(r"\s+", " ", result).strip()
    if not result:
        return name  # If stripping removed everything, return original
    return result


def token_sort_ratio(s1, s2):
    """Simple token set ratio: what fraction of tokens overlap?"""
    t1 = set(s1.split())
    t2 = set(s2.split())
    if not t1 or not t2:
        return 0.0
    intersection = t1 & t2
    union = t1 | t2
    return len(intersection) / len(union)


def log(msg):
    print(f"  {msg}", flush=True)


def log_warn(msg):
    print(f"  [WARN] {msg}", flush=True)


# ── Step 1: Apply schema ───────────────────────────────────────────────────

def apply_schema(conn):
    """Run the OKOIP schema SQL to ensure tables exist."""
    log("Applying OKOIP schema...")
    schema_path = NEON_DIR / "okoip_schema.sql"
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema not found: {schema_path}")
    sql = schema_path.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    log("  Schema applied OK.")


# ── Step 2: Import OKOIP data ──────────────────────────────────────────────

def load_latest_data():
    """Load the most recent scraped OKOIP data."""
    # Try CSV first (easier)
    csv_path = IMPORT_DIR / "okoip_flat_latest.csv"
    if csv_path.exists():
        log(f"Reading CSV: {csv_path}")
        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            return list(reader)

    # Fall back to JSON
    json_path = IMPORT_DIR / "okoip_raw_latest.json"
    if json_path.exists():
        log(f"Reading JSON: {json_path}")
        with open(json_path, encoding="utf-8") as f:
            return json.load(f)

    # Find newest files
    csv_files = sorted(IMPORT_DIR.glob("okoip_flat_*.csv"))
    json_files = sorted(IMPORT_DIR.glob("okoip_raw_*.json"))

    if csv_files:
        path = csv_files[-1]
        log(f"Reading CSV: {path}")
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            return list(reader)

    if json_files:
        path = json_files[-1]
        log(f"Reading JSON: {path}")
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    raise FileNotFoundError(
        f"No scraped OKOIP data found in {IMPORT_DIR}\n"
        f"  Run 'python3 scripts/scrape_okoip.py' first."
    )


def import_okoip(conn, records):
    """Insert OKOIP records into okoip_registry table."""
    log(f"Importing {len(records)} OKOIP records...")

    sql = """
        INSERT INTO okoip_registry (
            okoip_id, title, tin, category, organization_type, form_status,
            email, legal_email, phone, street, street_number, postcode,
            region, prefecture, municipality, municipal_unit, local_community,
            legal_name, legal_surname, legal_tin, legal_date_epoch,
            issue_date_epoch, incorporation_date_epoch, protocol_date_epoch,
            protocol_number, finalization_date_epoch, start_date_epoch, end_date_epoch,
            grant_value, available_value, purpose, raw_json
        ) VALUES (
            %(okoip_id)s, %(title)s, %(tin)s, %(category)s, %(organization_type)s,
            %(form_status)s, %(email)s, %(legal_email)s, %(phone)s, %(street)s,
            %(street_number)s, %(postcode)s, %(region)s, %(prefecture)s,
            %(municipality)s, %(municipal_unit)s, %(local_community)s,
            %(legal_name)s, %(legal_surname)s, %(legal_tin)s, %(legal_date_epoch)s,
            %(issue_date_epoch)s, %(incorporation_date_epoch)s, %(protocol_date_epoch)s,
            %(protocol_number)s, %(finalization_date_epoch)s, %(start_date_epoch)s,
            %(end_date_epoch)s, %(grant_value)s, %(available_value)s, %(purpose)s,
            %(raw_json)s
        )
        ON CONFLICT (okoip_id) DO UPDATE SET
            title = COALESCE(EXCLUDED.title, okoip_registry.title),
            tin = COALESCE(EXCLUDED.tin, okoip_registry.tin),
            email = COALESCE(EXCLUDED.email, okoip_registry.email),
            phone = COALESCE(EXCLUDED.phone, okoip_registry.phone),
            street = COALESCE(EXCLUDED.street, okoip_registry.street),
            organization_type = COALESCE(EXCLUDED.organization_type, okoip_registry.organization_type),
            form_status = COALESCE(EXCLUDED.form_status, okoip_registry.form_status),
            region = COALESCE(EXCLUDED.region, okoip_registry.region),
            purpose = COALESCE(EXCLUDED.purpose, okoip_registry.purpose),
            updated_at = NOW()
    """

    inserted = 0
    updated = 0
    with conn.cursor() as cur:
        for r in records:
            # Build row dict for the INSERT
            row = {
                "okoip_id": str(r.get("okoip_id", "")),
                "title": (r.get("title") or "")[:500],
                "tin": (r.get("tin") or "")[:20],
                "category": (r.get("category") or "")[:200],
                "organization_type": safe_int(r.get("organization_type")),
                "form_status": safe_int(r.get("form_status")),
                "email": (r.get("email") or "")[:320],
                "legal_email": (r.get("legal_email") or "")[:320],
                "phone": (r.get("phone") or "")[:50],
                "street": (r.get("street") or "")[:300],
                "street_number": (r.get("street_number") or "")[:20],
                "postcode": (r.get("postcode") or "")[:20],
                "region": (r.get("region") or "")[:200],
                "prefecture": (r.get("prefecture") or "")[:200],
                "municipality": (r.get("municipality") or "")[:200],
                "municipal_unit": (r.get("municipal_unit") or "")[:200],
                "local_community": (r.get("local_community") or "")[:200],
                "legal_name": (r.get("legal_name") or "")[:200],
                "legal_surname": (r.get("legal_surname") or "")[:200],
                "legal_tin": (r.get("legal_tin") or "")[:20],
                "legal_date_epoch": safe_int(r.get("legal_date_epoch")),
                "issue_date_epoch": safe_int(r.get("issue_date_epoch")),
                "incorporation_date_epoch": safe_int(r.get("incorporation_date_epoch")),
                "protocol_date_epoch": safe_int(r.get("protocol_date_epoch")),
                "protocol_number": str(r.get("protocol_number", "")),
                "finalization_date_epoch": safe_int(r.get("finalization_date_epoch")),
                "start_date_epoch": safe_int(r.get("start_date_epoch")),
                "end_date_epoch": safe_int(r.get("end_date_epoch")),
                "grant_value": safe_float(r.get("grant_value")),
                "available_value": safe_float(r.get("available_value")),
                "purpose": r.get("purpose") or "",
                "raw_json": json.dumps(r, ensure_ascii=False) if isinstance(r, dict) else None,
            }
            try:
                cur.execute(sql, row)
                if cur.rowcount == 1:
                    inserted += 1
                else:
                    updated += 1
            except Exception as e:
                log_warn(f"  Failed to import OKOIP ID {row['okoip_id']}: {e}")

    conn.commit()
    log(f"  Inserted: {inserted}, Updated: {updated}")
    return inserted + updated


def safe_int(v):
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def safe_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


# ── Step 3: Name matching ──────────────────────────────────────────────────

def match_ngos(conn):
    """Match OKOIP records against existing ngos by name, TIN, and email."""
    log("\nMatching OKOIP records against ngos...")

    # Load all existing NGOs
    with conn.cursor() as cur:
        cur.execute("SELECT id, company_name, email, website FROM ngos")
        ngo_rows = cur.fetchall()

    # Build normalized lookup maps
    ngo_by_name = {}        # norm(name) -> id
    ngo_by_clean_name = {}  # clean_greek(name) -> id
    ngo_by_stripped = {}    # strip_org_suffix(clean_greek(name)) -> id
    ngo_by_email = {}       # norm(email) -> set(id)
    ngo_names = {}          # id -> (original name, clean name)

    for ngo_id, name, email, website in ngo_rows:
        if not name:
            continue
        n_clean = clean_greek(name)
        n_stripped = strip_org_suffix(n_clean)

        ngo_by_name[n_clean] = ngo_id
        ngo_by_clean_name[n_clean] = ngo_id
        ngo_by_stripped[n_stripped] = ngo_id
        ngo_names[ngo_id] = (name, n_clean)

        if email:
            e_norm = norm(email)
            if e_norm not in ngo_by_email:
                ngo_by_email[e_norm] = set()
            ngo_by_email[e_norm].add(ngo_id)

    # Load all OKOIP records
    with conn.cursor() as cur:
        cur.execute("SELECT id, okoip_id, title, tin, email, legal_email FROM okoip_registry ORDER BY id")
        okoip_rows = cur.fetchall()

    log(f"  NGOs in DB: {len(ngo_rows)}")
    log(f"  OKOIP records: {len(okoip_rows)}")

    # For each OKOIP record, find best match
    matches_found = 0
    unmatched = 0
    match_insert_sql = """
        INSERT INTO ngo_okoip_matches (ngo_id, okoip_id, match_method, match_score, match_detail)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (ngo_id, okoip_id, match_method) DO UPDATE SET
            match_score = EXCLUDED.match_score,
            match_detail = EXCLUDED.match_detail,
            updated_at = NOW()
    """

    with conn.cursor() as cur:
        for rec_id, okoip_id, title, tin, email, legal_email in okoip_rows:
            if not title:
                continue

            title_clean = clean_greek(title)
            title_stripped = strip_org_suffix(title_clean)
            matches = []

            # Method 1: Exact name match
            if title_clean in ngo_by_name:
                matches.append((ngo_by_name[title_clean], "exact_name", EXACT_MATCH_SCORE, "Exact name match"))

            # Method 2: Stripped name match (remove legal suffix)
            if title_stripped in ngo_by_stripped:
                nid = ngo_by_stripped[title_stripped]
                matches.append((nid, "fuzzy_name", FUZZY_HIGH_SCORE, "Name match after legal suffix removal"))

            # Method 3: TIN match
            if tin:
                tin_clean = tin.strip()
                with conn.cursor() as tin_cur:
                    tin_cur.execute("SELECT id FROM ngos WHERE company_name IN (SELECT company_name FROM ngos)")
                    # Actually, let's search ngos by matching with OKOIP data via slug
                    # TIN isn't in ngos table, so we can't match by it directly
                    pass

            # Method 4: Email match
            if email:
                e_norm = norm(email)
                if e_norm in ngo_by_email:
                    for nid in ngo_by_email[e_norm]:
                        matches.append((nid, "email", EMAIL_MATCH_SCORE, f"Email match: {email}"))

            # Method 5: Token overlap (medium confidence)
            if not matches:
                best_nid = None
                best_score = 0
                best_detail = ""
                for nid, (orig_name, clean_name) in ngo_names.items():
                    score = token_sort_ratio(title_clean, clean_name)
                    if score > best_score:
                        best_score = score
                        best_nid = nid
                        best_detail = f"Token overlap ({score:.2f}): '{title}' vs '{orig_name}'"
                if best_score >= FUZZY_HIGH_SCORE:
                    matches.append((best_nid, "fuzzy_name", best_score, best_detail))
                elif best_score >= FUZZY_MEDIUM_SCORE:
                    matches.append((best_nid, "fuzzy_name", best_score, best_detail))

            # Store matches
            for nid, method, score, detail in matches:
                with conn.cursor() as m_cur:
                    m_cur.execute(match_insert_sql, (nid, rec_id, method, score, detail))
                matches_found += 1

            if not matches:
                unmatched += 1

    conn.commit()
    log(f"  Matches created: {matches_found}")
    log(f"  Unmatched OKOIP records: {unmatched}")

    # Summary
    with conn.cursor() as cur:
        cur.execute("""
            SELECT ngo_id, COUNT(*) as cnt, MAX(match_score) as best_score
            FROM ngo_okoip_matches
            GROUP BY ngo_id
            ORDER BY cnt DESC
            LIMIT 10
        """)
        top = cur.fetchall()
        if top:
            print(f"\n  Top matched NGOs:")
            for nid, cnt, score in top[:5]:
                cur.execute("SELECT company_name FROM ngos WHERE id = %s", (nid,))
                name_row = cur.fetchone()
                name = name_row[0] if name_row else "?"
                print(f"    {name}: {cnt} matches (best: {score})")


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  OKOIP Registry Import → Neon")
    print("=" * 60)

    # Step 0: Load data
    print("\n[0] Loading scraped data...")
    try:
        records = load_latest_data()
    except FileNotFoundError as e:
        print(f"  {e}")
        sys.exit(1)

    # If loading from JSON (raw API data), flatten first
    if isinstance(records, list) and records and "title" not in records[0]:
        # Raw JSON array from API — flatten
        flat = []
        for item in records:
            flat.append(flatten_record(item))
        records = flat
        log(f"  Flattened {len(records)} records from raw JSON")

    print(f"  Loaded {len(records)} records")

    # Step 1: Connect to Neon
    print("\n[1] Connecting to Neon...")
    try:
        conn = get_conn()
        log("  Connected.")
    except RuntimeError as e:
        print(f"  {e}")
        print("\n  Set NEON_CONNECTION_STRING and try again.")
        sys.exit(1)

    try:
        # Step 2: Apply schema
        apply_schema(conn)

        # Step 3: Import
        print("\n[2] Importing OKOIP data...")
        total = import_okoip(conn, records)

        # Step 4: Match
        print(f"\n[3] Matching {total} OKOIP records against ngos...")
        match_ngos(conn)

        # Step 5: Verify
        print("\n[4] Verification...")
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM okoip_registry")
            reg_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM ngo_okoip_matches")
            match_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(DISTINCT ngo_id) FROM ngo_okoip_matches")
            ngo_matched = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM ngos")
            ngo_total = cur.fetchone()[0]

        print(f"  okoip_registry: {reg_count} records")
        print(f"  ngo_okoip_matches: {match_count} links")
        print(f"  NGOs matched: {ngo_matched} / {ngo_total}")
        print(f"  Match rate: {ngo_matched / ngo_total * 100:.1f}%")

        print("\n  ✓ Import complete!")
        print(f"  Next: Build NGO API routes and UI to display linked data.")

    except Exception as e:
        print(f"\n  ERROR: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


# Need flatten_record for JSON fallback
def flatten_record(item):
    region = None
    if isinstance(item.get("regiId"), dict):
        region = item["regiId"].get("description")
    prefecture = None
    if isinstance(item.get("prefId"), dict):
        prefecture = item["prefId"].get("description")
    municipality = None
    if isinstance(item.get("muniId1"), dict):
        municipality = item["muniId1"].get("description")
    municipal_unit = None
    if isinstance(item.get("muniId2"), dict):
        municipal_unit = item["muniId2"].get("description")
    local_community = None
    if isinstance(item.get("muniId3"), dict):
        local_community = item["muniId3"].get("description")
    category = None
    if isinstance(item.get("cateId"), dict):
        category = item["cateId"].get("description")

    return {
        "okoip_id": item.get("id", ""),
        "title": item.get("title", ""),
        "tin": item.get("tin", ""),
        "category": category or "",
        "organization_type": item.get("type"),
        "form_status": item.get("formStatus"),
        "email": item.get("email", ""),
        "legal_email": item.get("legalEmail", ""),
        "phone": item.get("phone", ""),
        "street": item.get("street", ""),
        "street_number": item.get("number", ""),
        "postcode": item.get("postcode", ""),
        "region": region or "",
        "prefecture": prefecture or "",
        "municipality": municipality or "",
        "municipal_unit": municipal_unit or "",
        "local_community": local_community or "",
        "legal_name": item.get("legalName", ""),
        "legal_surname": item.get("legalSurname", ""),
        "legal_tin": item.get("legalTin", ""),
        "legal_date_epoch": item.get("legalDate"),
        "issue_date_epoch": item.get("issueDate"),
        "incorporation_date_epoch": item.get("incorporationDate"),
        "protocol_date_epoch": item.get("protocolDate"),
        "protocol_number": item.get("protocolNumber"),
        "finalization_date_epoch": item.get("finalizationDate"),
        "start_date_epoch": item.get("startDate"),
        "end_date_epoch": item.get("endDate"),
        "grant_value": item.get("grantValue"),
        "available_value": item.get("availableValue"),
        "purpose": (item.get("comment") or "").replace("\n", " | "),
    }


if __name__ == "__main__":
    main()
