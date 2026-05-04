#!/usr/bin/env python3
"""
Constellation — OKOIP Registry Scraper (v2)
============================================
Fetches all active CSO registrations from the Greek public registry.
Saves to JSON + CSV for review before importing to Neon.

Usage:
    python3 scripts/scrape_okoip.py

Output:
    ~/constellation/import/okoip/okoip_raw_YYYYMMDD_HHMMSS.json  (raw API data)
    ~/constellation/import/okoip/okoip_flat_YYYYMMDD_HHMMSS.csv  (flattened records)
"""

import json
import csv
import time
import sys
import os
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────

API_URL = "https://okoip.gov.gr/CSOIS/rest/Application/findLazyApplicationPublic?"
COUNT_URL = "https://okoip.gov.gr/CSOIS/rest/Application/findLazyApplicationPublic_count?"
BATCH_SIZE = 50
REQUEST_DELAY = 0.5  # seconds between batches — be polite

# Project paths
BASE_DIR = Path(__file__).parent.parent.resolve()
OUTPUT_DIR = BASE_DIR / "import" / "okoip"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Status & Category maps ──────────────────────────────────────────────────

FORM_STATUS = {1: "Ενεργή Εγγραφή", 2: "Ανενεργή Εγγραφή", 3: "Διαγραμμένη Εγγραφή"}
ORG_TYPE = {1: "Σωματείο", 2: "Ίδρυμα", 0: "Άλλο"}

# ── Helpers ─────────────────────────────────────────────────────────────────

def epoch_to_date(epoch_ms):
    if not epoch_ms or epoch_ms == 0:
        return None
    try:
        return datetime.fromtimestamp(epoch_ms / 1000).strftime("%Y-%m-%d")
    except (OSError, ValueError, OverflowError):
        return None


def get_nested(obj, *keys, default=None):
    current = obj
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return default
    return current if current is not None else default


def api_post(url, payload, retries=2):
    data = json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json;charset=utf-8")
    req.add_header("Accept", "application/json, text/plain, */*")
    req.add_header("User-Agent", "ConstellationBot/1.0 (okoipparser)")
    req.add_header("Referer", "https://okoip.gov.gr/CSOIS/")
    req.add_header("Origin", "https://okoip.gov.gr")

    for attempt in range(retries + 1):
        try:
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:200]
            print(f"  HTTP {e.code}: {body}")
            if attempt < retries:
                time.sleep(3)
            else:
                return None
        except URLError as e:
            print(f"  URL Error: {e.reason}")
            if attempt < retries:
                time.sleep(3)
            else:
                return None
    return None


def get_total_count():
    result = api_post(COUNT_URL, {"globalPageCallNumeric": 1, "apreStatus": 1})
    if result:
        return result.get("count", 0)
    return 0


def fetch_batch(start, end):
    payload = {
        "fromRowIndex": start,
        "toRowIndex": end,
        "globalPageCallNumeric": 1,
        "apreStatus": 1,
    }
    result = api_post(API_URL, payload)
    if result and "data" in result:
        return result["data"]
    return []


def flatten_record(item):
    """Convert a raw API record into a flat dict for CSV/import."""
    region = get_nested(item, "regiId", "description")
    prefecture = get_nested(item, "prefId", "description")
    municipality = get_nested(item, "muniId1", "description")
    municipal_unit = get_nested(item, "muniId2", "description")
    local_community = get_nested(item, "muniId3", "description")
    # cateId may be a full description object or a reference-only (just $refId).
    # Fall back to organization_type name when description is not available.
    category = get_nested(item, "cateId", "description")
    if not category:
        org_type = item.get("type", 0)
        if org_type == 1:
            category = "Σωματείο"
        elif org_type == 2:
            category = "Ίδρυμα"
        else:
            category = "Άλλο"

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


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  OKOIP Registry Scraper — Constellation Import Pipeline")
    print("  Target: https://okoip.gov.gr/CSOIS/")
    print("=" * 60)

    # Step 1: Get count
    print("\n[1/4] Getting total count...")
    total = get_total_count()
    if total == 0:
        print("  ERROR: API returned 0 records. May be unavailable.")
        sys.exit(1)
    print(f"  Active registrations: {total}")

    # Step 2: Fetch all
    print(f"\n[2/4] Fetching {total} records (batch: {BATCH_SIZE})...")
    all_raw = []
    all_flat = []

    for start in range(0, total, BATCH_SIZE):
        end = min(start + BATCH_SIZE, total)
        print(f"  {start+1:5d}–{end:5d} / {total} ...", end=" ", flush=True)

        batch = fetch_batch(start, end)
        if not batch:
            print("FAILED (skipped)")
            continue

        all_raw.extend(batch)
        for item in batch:
            all_flat.append(flatten_record(item))

        print(f"OK ({len(batch)} records)")
        time.sleep(REQUEST_DELAY)

    print(f"\n  Total fetched: {len(all_flat)} records")

    # Step 3: Save to disk
    print(f"\n[3/4] Saving scraped data...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Raw JSON — full API responses
    json_path = OUTPUT_DIR / f"okoip_raw_{timestamp}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_raw, f, ensure_ascii=False, indent=2)
    print(f"  Raw JSON:  {json_path} ({os.path.getsize(json_path) / 1024 / 1024:.1f} MB)")

    # Flat CSV — ready for import
    csv_path = OUTPUT_DIR / f"okoip_flat_{timestamp}.csv"
    if all_flat:
        with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=all_flat[0].keys())
            writer.writeheader()
            writer.writerows(all_flat)
    print(f"  Flat CSV:  {csv_path}")

    # Save latest symlinks for predictable paths
    latest_json = OUTPUT_DIR / "okoip_raw_latest.json"
    latest_json.unlink(missing_ok=True)
    latest_json.symlink_to(json_path.name)
    latest_csv = OUTPUT_DIR / "okoip_flat_latest.csv"
    latest_csv.unlink(missing_ok=True)
    latest_csv.symlink_to(csv_path.name)
    print(f"  → Symlinked as: {latest_json.name}, {latest_csv.name}")

    # Step 4: Summary
    print(f"\n[4/4] Summary")
    print(f"  Total records: {len(all_flat)}")
    if all_flat:
        print(f"  Sample: {all_flat[0]['title']} (tin: {all_flat[0]['tin']})")

    # Categories breakdown
    from collections import Counter
    cats = Counter(r["category"] for r in all_flat)
    print(f"\n  Categories:")
    for cat, count in cats.most_common():
        print(f"    {cat or '(none)'}: {count}")

    print("\n  ✓ Scrape complete. Ready for Neon import.")
    print(f"\n  Next step: python3 scripts/import_okoip_to_neon.py")


if __name__ == "__main__":
    main()
