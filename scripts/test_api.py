#!/usr/bin/env python3
"""
Constellation API Test Suite
=============================
Tests all API routes to verify they return correct status codes
and response structures. Run after any change to catch regressions.

Usage:
    python3 scripts/test_api.py                    # Tests Pages Function (production)
    python3 scripts/test_api.py --workers           # Tests Workers API directly
    python3 scripts/test_api.py --verbose           # Show all responses
"""

import json
import os
import sys
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# ── Config ──────────────────────────────────────────────────────────────────

PAGES_BASE = "https://constellation.stellarpartners.gr/api"
WORKERS_BASE = "https://constellation-api.stellarpartners.workers.dev/api"
TIMEOUT = 15

# ── Test Runner ─────────────────────────────────────────────────────────────

passed = 0
failed = 0
errors: list[str] = []
verbose = False
base_url = PAGES_BASE


def log(msg: str):
    print(f"  {msg}")


def check(label: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        passed += 1
        if verbose:
            print(f"  ✓ {label}{' — ' + detail if detail else ''}")
    else:
        failed += 1
        msg = f"  ✗ {label}{' — ' + detail if detail else ''}"
        print(msg)
        errors.append(msg)


def api_get(path: str) -> tuple[int, dict | list]:
    """Make a GET request and return (status_code, parsed_json)."""
    url = base_url + path
    req = Request(url)
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", "ConstellationTest/1.0")
    try:
        with urlopen(req, timeout=TIMEOUT) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            return resp.status, data
    except HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {"raw": body[:200]}
        return e.code, data
    except URLError as e:
        return 0, {"error": str(e.reason)}
    except json.JSONDecodeError as e:
        return 0, {"error": f"Invalid JSON: {e}"}
    except Exception as e:
        return 0, {"error": str(e)}


def run_tests():
    global passed, failed, errors, base_url

    print(f"\n{'='*60}")
    print(f"  Constellation API Test Suite")
    print(f"  Target: {base_url}")
    print(f"{'='*60}")

    # ═══════════════════════════════════════════════════════════════════════
    # 1. STATS
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[1] Stats")
    status, data = api_get("/stats")
    check("GET /api/stats → 200", status == 200, f"got {status}")
    if status == 200:
        expected_keys = ["total_journalists", "total_outlets", "total_relationships",
                         "outlets_with_eci", "progressive_outlets", "total_ngos",
                         "total_okoip", "total_ngo_matches"]
        for k in expected_keys:
            check(f"stats.{k} exists", k in data, f"value={data.get(k)}")
        check("stats total_journalists == 110", data.get("total_journalists") == 110, str(data.get("total_journalists")))
        check("stats total_outlets == 142", data.get("total_outlets") == 142, str(data.get("total_outlets")))
        check("stats total_ngos == 801", data.get("total_ngos") == 801, str(data.get("total_ngos")))
        check("stats total_okoip == 1935", data.get("total_okoip") == 1935, str(data.get("total_okoip")))

    # ═══════════════════════════════════════════════════════════════════════
    # 2. NGOs
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[2] NGOs")

    # List
    status, data = api_get("/ngos?per_page=5")
    check("GET /api/ngos → 200", status == 200, f"got {status}")
    if status == 200:
        check("ngos has 'ngos' key", "ngos" in data)
        check("ngos has 'total' key", "total" in data)
        check("ngos.total == 801", data.get("total") == 801, str(data.get("total")))
        check("ngos list has 5 items", len(data.get("ngos", [])) == 5, str(len(data.get("ngos", []))))
        if data.get("ngos"):
            n = data["ngos"][0]
            check("ngo has company_name", "company_name" in n)
            check("ngo has id", "id" in n)
            check("ngo has email", "email" in n)

    # Search
    status, data = api_get("/ngos?q=%CE%B5%CE%BB%CE%BB%CE%B7%CE%BD%CE%B9%CE%BA%CE%AE&per_page=3")
    check("GET /api/ngos?q=… → 200", status == 200, f"got {status}")
    if status == 200:
        check("ngos search returns results", data.get("total", 0) > 0, f"total={data.get('total')}")

    # Detail
    status, data = api_get("/ngos/4480")
    check("GET /api/ngos/4480 → 200", status == 200, f"got {status}")
    if status == 200:
        check("ngo detail has company_name", data.get("company_name") == "50και Ελλάς - Fifty Plus Hellas")
        check("ngo detail has social", "social" in data)
        check("ngo detail has okoip_matches", "okoip_matches" in data)

    # Not found
    status, data = api_get("/ngos/999999")
    check("GET /api/ngos/999999 → 404", status == 404, f"got {status}")

    # ═══════════════════════════════════════════════════════════════════════
    # 3. OKOIP Registry
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[3] OKOIP Registry")

    # List
    status, data = api_get("/okoip?per_page=5")
    check("GET /api/okoip → 200", status == 200, f"got {status}")
    if status == 200:
        check("okoip has 'okoip' key", "okoip" in data)
        check("okoip has 'total' key", "total" in data)
        check("okoip.total == 1935", data.get("total") == 1935, str(data.get("total")))
        check("okoip list has 5 items", len(data.get("okoip", [])) == 5, str(len(data.get("okoip", []))))
        if data.get("okoip"):
            r = data["okoip"][0]
            check("okoip record has title", "title" in r)
            check("okoip record has category", "category" in r)
            check("okoip record has tin", "tin" in r)

    # Category filter
    status, data = api_get("/okoip?category=%CE%A3%CF%89%CE%BC%CE%B1%CF%84%CE%B5%CE%AF%CE%BF&per_page=3")
    check("GET /api/okoip?category=… → 200", status == 200, f"got {status}")
    if status == 200:
        check("okoip category filter returns results", data.get("total", 0) > 0, f"total={data.get('total')}")
        for r in data.get("okoip", []):
            cat = r.get("category", "")
            if "Σωματείο" not in cat and "Σωματείo" not in cat:
                check(f"okoip category match: {cat[:20]}", False, f"expected Σωματείο got {cat}")
                break

    # Categories endpoint
    status, data = api_get("/okoip/categories")
    check("GET /api/okoip/categories → 200", status == 200, f"got {status}")
    if status == 200:
        check("categories is a list", isinstance(data.get("categories"), list))
        check("has multiple categories", len(data.get("categories", [])) >= 5, str(len(data.get("categories", []))))

    # Detail
    status, data = api_get("/okoip/3382")
    check("GET /api/okoip/3382 → 200", status == 200, f"got {status}")
    if status == 200:
        check("okoip detail has title", data.get("title"))
        check("okoip detail has linked_ngos", "linked_ngos" in data)

    # Not found
    status, data = api_get("/okoip/999999")
    check("GET /api/okoip/999999 → 404", status == 404, f"got {status}")

    # ═══════════════════════════════════════════════════════════════════════
    # 4. Journalists
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[4] Journalists")

    status, data = api_get("/journalists?per_page=5")
    check("GET /api/journalists → 200", status == 200, f"got {status}")
    if status == 200:
        check("journalists has 'journalists' key", "journalists" in data)
        j_list = data.get("journalists", [])
        check("journalists list non-empty", len(j_list) > 0, str(len(j_list)))
        if j_list:
            j = j_list[0]
            check("journalist has name", "name" in j)
            check("journalist has id", "id" in j)

    # Detail
    status, data = api_get("/journalists/3")
    check("GET /api/journalists/3 → 200", status == 200, f"got {status}")
    if status == 200:
        check("journalist detail has name", data.get("name"))
        check("journalist detail has outlets key", "outlets" in data)

    # ═══════════════════════════════════════════════════════════════════════
    # 5. Media Outlets
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[5] Media Outlets")

    status, data = api_get("/outlets?per_page=5")
    check("GET /api/outlets → 200", status == 200, f"got {status}")
    if status == 200:
        check("outlets has 'outlets' key", "outlets" in data)
        o_list = data.get("outlets", [])
        check("outlets list non-empty", len(o_list) > 0, str(len(o_list)))
        if o_list:
            o = o_list[0]
            check("outlet has name", "name" in o)
            check("outlet has combined_score", "combined_score" in o)

    # Detail
    status, data = api_get("/outlets/162")
    check("GET /api/outlets/162 → 200", status == 200, f"got {status}")
    if status == 200:
        check("outlet detail has name", data.get("name") == "Efsyn")
        check("outlet detail has combined_score", data.get("combined_score") == 6)
        check("outlet detail has journalists list", "journalists" in data)
        check("outlet detail has journalists", len(data.get("journalists", [])) > 0)

    # Not found
    status, data = api_get("/outlets/999")
    check("GET /api/outlets/999 → 404", status == 404, f"got {status}")

    # ═══════════════════════════════════════════════════════════════════════
    # 6. Search
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[6] Search")

    status, data = api_get("/search?q=news")
    check("GET /api/search?q=news → 200", status == 200, f"got {status}")
    if status == 200:
        check("search has journalists", len(data.get("journalists", [])) > 0, str(len(data.get("journalists", []))))
        check("search has outlets", len(data.get("outlets", [])) > 0, str(len(data.get("outlets", []))))

    status, data = api_get("/search?q=zzzzzznonexistent")
    check("GET /api/search?q=nonexistent → 200", status == 200, f"got {status}")
    if status == 200:
        check("empty search returns empty lists", len(data.get("journalists", [])) == 0 and len(data.get("outlets", [])) == 0)

    status, data = api_get("/search?q=")
    check("GET /api/search?q= → 200 (empty query)", status == 200, f"got {status}")

    # ═══════════════════════════════════════════════════════════════════════
    # 7. Cross-Platform
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[7] Cross-Platform")

    status, data = api_get("/cross-platform-journalists")
    check("Cross-platform journalists works", status == 200, f"got {status}")
    if status == 200:
      check("has journalists list", isinstance(data.get("journalists"), list))

    # ═══════════════════════════════════════════════════════════════════════
    # 8. Top Outlets
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[8] Top Outlets")

    status, data = api_get("/top-outlets/10")
    check("Top outlets works", status == 200, f"got {status}")
    if status == 200:
        check("top-outlets has outlets list", len(data.get("outlets", [])) > 0, str(len(data.get("outlets", []))))

    # ═══════════════════════════════════════════════════════════════════════
    # 9. Edge cases
    # ═══════════════════════════════════════════════════════════════════════
    print("\n[9] Edge cases")

    status, data = api_get("/nonexistent")
    check("GET /api/nonexistent → 404", status == 404, f"got {status}")

    # ═══════════════════════════════════════════════════════════════════════
    # Summary
    # ═══════════════════════════════════════════════════════════════════════
    total = passed + failed
    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"  Total: {total}  Passed: {passed}  Failed: {failed}")
    if failed > 0:
        print(f"\n  Failed checks:")
        for e in errors:
            print(f"    {e}")
    print(f"{'='*60}\n")

    return failed == 0


if __name__ == "__main__":
    if "--workers" in sys.argv:
        base_url = WORKERS_BASE
        print("  Testing Workers API (workers.dev)")
    else:
        base_url = PAGES_BASE
        print("  Testing Pages Function (constellation.stellarpartners.gr)")

    if "--verbose" in sys.argv:
        verbose = True

    success = run_tests()
    sys.exit(0 if success else 1)
