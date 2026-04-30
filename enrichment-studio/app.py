"""
Constellation Enrichment Studio
Internal tool — enrich missing contact fields via parallel subagent research
"""

import os
import csv
import json
import uuid
from pathlib import Path
from datetime import datetime
from flask import Flask, render_template, jsonify, request, redirect, url_for

# ── App Setup ────────────────────────────────────────────────────────────────

app = Flask(__name__, template_folder="templates")
app.config["JSON_SORT_KEYS"] = False

BASE = Path(__file__).parent
DATA_DIR = Path("/home/spyros/Insync/spytzo@gmail.com/OneDrive/Stellar Partners/operations/active/constellation/import")
QUEUE_DIR = BASE / "review_queue"
QUEUE_DIR.mkdir(exist_ok=True)

# ── CSV Loaders ─────────────────────────────────────────────────────────────

def load_media():
    """Load media outlets CSV, return list of dicts."""
    path = DATA_DIR / "media" / "export - Media - Grid view.csv"
    records = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "id": row.get("id", "").strip(),
                "name": row.get("Name", "").strip(),
                "website": row.get("Website", "").strip(),
                "type": row.get("Type of Media", "").strip(),
                "geo": row.get("Geographical Level", "").strip(),
                "facebook": row.get("Facebook", "").strip(),
                "twitter": row.get("Twitter", "").strip(),
                "instagram": row.get("Instagram", "").strip(),
                "linkedin": row.get("LinkedIn", "").strip(),
                "youtube": row.get("YouTube", "").strip(),
                "source": "media",
            })
    return records

def load_journalists():
    """Load journalists CSV, return list of dicts."""
    path = DATA_DIR / "media" / "export - Journalists - Grid view.csv"
    records = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "id": row.get("id", "").strip(),
                "name": row.get("Name", "").strip(),
                "outlet": row.get("Media", "").strip(),
                "email": row.get("Email", "").strip(),
                "beat": row.get("Primary Beat", "").strip(),
                "twitter": row.get("Twitter", "").strip(),
                "linkedin": row.get("LinkedIn", "").strip(),
                "source": "journalist",
            })
    return records

def load_ngos():
    """Load MASTER NGO CSV, return list of dicts."""
    path = DATA_DIR / "ngodatabase" / "MASTER-ALL (2).csv"
    records = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "id": row.get("Company Name", "").strip(),
                "name": row.get("Company Name", "").strip(),
                "website": row.get("Website", "").strip(),
                "email": row.get("Email", "").strip(),
                "facebook": row.get("Facebook", "").strip(),
                "linkedin": row.get("LinkedIn", "").strip(),
                "instagram": row.get("Instagram", "").strip(),
                "source": "ngo",
            })
    return records

def missing_summary(records, fields):
    """Count records missing any of the given fields."""
    total = len(records)
    missing_any = 0
    missing_all = 0
    per_field = {f: 0 for f in fields}
    for r in records:
        has_any = False
        all_missing = True
        for f in fields:
            val = r.get(f, "").strip()
            if not val:
                per_field[f] += 1
            else:
                all_missing = False
            if val:
                has_any = True
        if not has_any:
            missing_any += 1
        if all_missing:
            missing_all += 1
    return {
        "total": total,
        "missing_any": missing_any,
        "missing_all": missing_all,
        "per_field": per_field,
    }

# ── Enrichment Queue ────────────────────────────────────────────────────────

def get_queue():
    """List all queued enrichment tasks with consistent flattening."""
    items = []
    for f in sorted(QUEUE_DIR.glob("*.json")):
        with open(f, encoding="utf-8") as fp:
            task = json.load(fp)
        # Apply same flatten as get_task so all callers are consistent
        if "found_fields" not in task and isinstance(task.get("result"), dict):
            task["found_fields"] = task["result"].get("found_fields", {})
            base = dict(task.get("record", {}))
            base.update(task["found_fields"])
            task["result"] = base
        items.append(task)
    return sorted(items, key=lambda x: x.get("created", ""))

def enqueue(record, field):
    """Add a record to the enrichment queue."""
    task_id = str(uuid.uuid4())[:8]
    task = {
        "task_id": task_id,
        "record": record,
        "field": field,
        "status": "pending",
        "result": None,
        "created": datetime.now().isoformat(),
    }
    with open(QUEUE_DIR / f"{task_id}.json", "w") as f:
        json.dump(task, f, indent=2, ensure_ascii=False)
    return task_id

def update_task(task_id, updates):
    path = QUEUE_DIR / f"{task_id}.json"
    with open(path, encoding="utf-8") as f:
        task = json.load(f)
    task.update(updates)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(task, f, indent=2, ensure_ascii=False)
    return task

def get_task(task_id):
    path = QUEUE_DIR / f"{task_id}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        task = json.load(f)
    # Flatten if subagent nested found_fields inside result
    if "found_fields" not in task and isinstance(task.get("result"), dict):
        task["found_fields"] = task["result"].get("found_fields", {})
        # Build enriched record from base record + found fields
        base = dict(task.get("record", {}))
        base.update(task["found_fields"])
        task["result"] = base
    return task

# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    media = load_media()
    journo = load_journalists()
    ngos = load_ngos()

    media_fields = ["website", "facebook", "twitter", "instagram", "linkedin", "youtube"]
    journo_fields = ["email", "twitter", "linkedin"]
    ngo_fields = ["website", "email", "facebook", "linkedin", "instagram"]

    media_sum = missing_summary(media, media_fields)
    journo_sum = missing_summary(journo, journo_fields)
    ngo_sum = missing_summary(ngos, ngo_fields)

    queue = get_queue()
    pending = [t for t in queue if t["status"] == "pending"]
    done = [t for t in queue if t["status"] in ("enriched", "approved", "rejected")]

    return render_template("index.html",
        media=media, journo=journo, ngos=ngos,
        media_sum=media_sum, journo_sum=journo_sum, ngo_sum=ngo_sum,
        pending=pending, done=done,
        media_fields=media_fields, journo_fields=journo_fields, ngo_fields=ngo_fields,
    )

@app.route("/api/enqueue", methods=["POST"])
def api_enqueue():
    """Add record(s) to enrichment queue."""
    data = request.json
    record = data["record"]
    field = data.get("field", "all")
    task_id = enqueue(record, field)
    return jsonify({"task_id": task_id})

@app.route("/api/batch-enqueue", methods=["POST"])
def api_batch_enqueue():
    """Batch enqueue all records missing a specific field."""
    data = request.json
    source = data["source"]  # "media" | "journalist" | "ngo"
    field = data["field"]     # specific field or "all"

    if source == "media":
        records = load_media()
        fields = ["website", "facebook", "twitter", "instagram", "linkedin", "youtube"]
    elif source == "journalist":
        records = load_journalists()
        fields = ["email", "twitter", "linkedin"]
    else:
        records = load_ngos()
        fields = ["website", "email", "facebook", "linkedin", "instagram"]

    if field == "all":
        target_fields = fields
    else:
        target_fields = [field]

    task_ids = []
    for r in records:
        if field == "all":
            # Enqueue if ANY target field is missing
            if not any(r.get(f, "").strip() for f in target_fields):
                task_ids.append(enqueue(r, field))
        else:
            # Enqueue only if THIS specific field is missing
            if not r.get(field, "").strip():
                task_ids.append(enqueue(r, field))

    return jsonify({"enqueued": len(task_ids), "task_ids": task_ids[:10]})

@app.route("/api/task/<task_id>")
def api_task(task_id):
    task = get_task(task_id)
    if not task:
        return jsonify({"error": "not found"}), 404
    return jsonify(task)

@app.route("/api/task/<task_id>", methods=["POST"])
def api_update_task(task_id):
    updates = request.json
    task = update_task(task_id, updates)
    return jsonify(task)

@app.route("/api/enrich-task", methods=["POST"])
def api_enrich_task():
    """
    Enrich a single task: spawn a subagent to research the record,
    find missing contact fields, update the task with results.
    Runs in foreground — caller handles concurrency.
    """
    import threading, queue as tqueue, json as json_mod, time
    from hermes_tools import web_search, web_extract

    task = request.json
    record = task["record"]
    source = record.get("source", "")
    task_id = task["task_id"]

    # Determine what fields to enrich
    if source == "media":
        target_fields = ["website", "facebook", "twitter", "instagram", "linkedin", "youtube"]
    elif source == "journalist":
        target_fields = ["email", "twitter", "linkedin"]
    else:
        target_fields = ["website", "email", "facebook", "linkedin", "instagram"]

    # Filter to only missing ones
    missing = [f for f in target_fields if not record.get(f, "").strip()]
    if not missing:
        update_task(task_id, {"status": "enriched", "result": record})
        return jsonify({"task_id": task_id, "status": "already_full"})

    name = record.get("name", "") or record.get("id", "")
    search_queries = []

    # Build targeted search queries based on what's missing
    for field in missing:
        if field == "website":
            search_queries.append(f'"{name}" official website')
        elif field == "email":
            search_queries.append(f'"{name}" contact email')
        elif field == "facebook":
            search_queries.append(f'"{name}" Facebook page')
        elif field == "twitter":
            search_queries.append(f'"{name}" Twitter/X account')
        elif field == "instagram":
            search_queries.append(f'"{name}" Instagram')
        elif field == "linkedin":
            search_queries.append(f'"{name}" LinkedIn')

    results = {}
    errors = []

    for sq in search_queries:
        field = sq.split('"')[1] if '"' in sq else None  # rough field detection
        # Map query keyword to field
        field_map = {
            "website": "website", "contact email": "email", "Facebook": "facebook",
            "Twitter": "twitter", "Instagram": "Instagram", "LinkedIn": "linkedin"
        }
        detected_field = None
        for kw, fld in field_map.items():
            if kw.lower() in sq.lower():
                detected_field = fld
                break

        try:
            search_res = web_search(sq, limit=3)
            urls = [r["url"] for r in search_res.get("data", {}).get("web", [])]

            if detected_field == "email":
                # For email, try extracting from a page
                for url in urls[:2]:
                    try:
                        page = web_extract([url])
                        content = page.get("results", [{}])[0].get("content", "")
                        # Simple email regex
                        import re
                        emails = re.findall(r'[\w.+-]+@[\w-]+\.[\w.-]+', content)
                        if emails:
                            # Deduplicate
                            seen = set()
                            unique = []
                            for e in emails:
                                if e.lower() not in seen:
                                    seen.add(e.lower())
                                    unique.append(e)
                            # Prefer common domains
                            preferred = [e for e in unique if any(
                                k in e.lower() for k in ["gmail", "outlook", "hotmail", "yahoo"]
                            )]
                            results["email"] = preferred[0] if preferred else unique[0]
                            break
                    except Exception:
                        pass

            elif detected_field in ["website", "facebook", "twitter", "instagram", "linkedin"]:
                # For social links, try to find them on the page
                for url in urls[:2]:
                    try:
                        page = web_extract([url])
                        content = page.get("results", [{}])[0].get("content", "")
                        import re
                        found = None

                        if detected_field == "website":
                            # Try to find the canonical homepage
                            m = re.search(r'href=["\'](https?://[^"\']+)["\'][^>]*>(?:Official|Home|Website)', content, re.I)
                            if not m:
                                m = re.search(r'og:url["\s]+content=["\'](https?://[^"\']+)["\']', content)
                            if not m:
                                m = re.search(r'canonical["\s]+href=["\'](https?://[^"\']+)["\']', content)
                            if m:
                                found = m.group(1).split("?")[0].rstrip("/")

                        elif detected_field == "facebook":
                            m = re.search(r'facebook\.com/[\w.-]+/?', content, re.I)
                            if m:
                                found = "https://" + m.group(0).lower()
                        elif detected_field == "twitter":
                            m = re.search(r'twitter\.com/[\w]+/?', content, re.I)
                            if not m:
                                m = re.search(r'x\.com/[\w]+/?', content, re.I)
                            if m:
                                found = "https://" + m.group(0).lower()
                        elif detected_field == "instagram":
                            m = re.search(r'instagram\.com/[\w.]+/?', content, re.I)
                            if m:
                                found = "https://" + m.group(0).lower()
                        elif detected_field == "linkedin":
                            m = re.search(r'linkedin\.com/company/[\w.-]+/?', content, re.I)
                            if m:
                                found = "https://" + m.group(0).lower()

                        if found:
                            results[detected_field] = found
                            break
                    except Exception as e:
                        errors.append(f"{detected_field} extraction error: {str(e)}")
            else:
                # Generic: store the top URL
                if urls:
                    results.setdefault("website", urls[0])

        except Exception as e:
            errors.append(f"Search error for '{sq}': {str(e)}")

    # Update the task
    enriched_record = {**record, **results}
    update_task(task_id, {
        "status": "enriched",
        "result": enriched_record,
        "found_fields": results,
        "errors": errors,
    })

    return jsonify({"task_id": task_id, "found": results, "errors": errors})


@app.route("/api/run-enrichment", methods=["POST"])
def api_run_enrichment():
    """
    Fire parallel subagents for all pending tasks.
    Called by the frontend. The actual subagent work is done via
    the /api/enrich-task endpoint (called by the frontend in batches).
    """
    queue = get_queue()
    pending = [t for t in queue if t["status"] == "pending"]

    if not pending:
        return jsonify({"message": "No pending tasks"})

    return jsonify({
        "message": f"Fired {len(pending)} enrichment tasks",
        "pending": [p["task_id"] for p in pending],
    })


@app.route("/api/run-enrichment-bg", methods=["POST"])
def api_run_enrichment_bg():
    """
    Spawn parallel enrichment subagents in the background.
    This is the actual worker — fires multiple subagents concurrently.
    """
    data = request.json or {}
    concurrency = data.get("concurrency", 5)
    max_tasks = data.get("max_tasks", 50)
    source_filter = data.get("source", "all")  # "all", "media", "journalist", "ngo"

    queue = get_queue()
    pending = [t for t in queue if t["status"] == "pending"]

    # Filter by source if needed
    if source_filter != "all":
        pending = [t for t in pending if t["record"].get("source") == source_filter]

    pending = pending[:max_tasks]

    if not pending:
        return jsonify({"message": "No matching pending tasks", "total": 0})

    def run_batch(tasks):
        """Run a batch of enrichment tasks in parallel using delegate_task."""
        results = delegate_task(
            goal=f"""You are an enrichment researcher. Process these {len(tasks)} tasks.
For each task: research the record, search the web for missing contact fields, return found data.

Task format:
- task_id: string
- record: object with name, source (media/journalist/ngo), and existing fields
- field: which field triggered this task

Working directory: /home/spyros/Insync/spytzo@gmail.com/OneDrive/Stellar Partners/operations/active/constellation/enrichment-studio

Process each task:
1. Read the task file: review_queue/{{task_id}}.json
2. Determine what fields are missing (email, website, facebook, twitter, instagram, linkedin)
3. Search the web for each missing field using targeted queries like: '[Name]" official website' / '[Name]" contact email' / '[Name]" Facebook'
4. Extract the URLs or email from search results and top pages
5. Update the task file with status='enriched', found_fields=<field_map>, result=<enriched_record>

Use web_search and web_extract tools. Be thorough but fast — aim for 2-3 searches per task.
Process ALL tasks in the batch. Work in parallel on independent tasks.""",
            context="""Base path: /home/spyros/Insync/spytzo@gmail.com/OneDrive/Stellar Partners/operations/active/constellation/enrichment-studio
Review queue dir: review_queue/
Task files: review_queue/{task_id}.json

The review_queue directory has these JSON files already queued. Just process them.

Important notes for enrichment:
- For websites: find the official homepage, extract from search snippets or page content
- For social links: search for the official page, extract the canonical URL
- For emails: search for contact pages, look for email addresses on the official site
- Prefer official sources (.gr, .com domains) over third-party directories
- If you find something, update the task JSON with found_fields and mark status='enriched'
- Use write_file tool to update task JSON files directly at review_queue/{task_id}.json
- Return a summary of what you found for each task""",
            toolsets=["web", "file"],
        )
        return results

    # Fire the batch
    result = run_batch(pending)

    return jsonify({
        "message": f"Fired {len(pending)} tasks to subagents",
        "pending": [p["task_id"] for p in pending],
        "agent_result": str(result)[:500],
    })


@app.route("/api/approve/<task_id>", methods=["POST"])
def api_approve(task_id):
    """Approve an enriched task — writes enriched data to the review queue as approved."""
    task = get_task(task_id)
    if not task:
        return jsonify({"error": "not found"}), 404
    if task["status"] != "enriched":
        return jsonify({"error": "not enriched yet"}), 400

    update_task(task_id, {"status": "approved"})
    return jsonify({"task_id": task_id, "status": "approved"})


@app.route("/api/reject/<task_id>", methods=["POST"])
def api_reject(task_id):
    """Reject an enriched task."""
    task = get_task(task_id)
    if not task:
        return jsonify({"error": "not found"}), 404
    update_task(task_id, {"status": "rejected"})
    return jsonify({"task_id": task_id, "status": "rejected"})


@app.route("/api/approve-field/<task_id>/<field>", methods=["POST"])
def api_approve_field(task_id, field):
    """Approve a specific found field — keeps it in the final merge."""
    task = get_task(task_id)
    if not task:
        return jsonify({"error": "not found"}), 404
    found = task.get("found_fields", {})
    value = found.get(field, "")
    approved = dict(task.get("approved_fields", {}))
    rejected = [f for f in task.get("rejected_fields", []) if f != field]
    approved[field] = value
    update_task(task_id, {"approved_fields": approved, "rejected_fields": rejected})
    return jsonify({"task_id": task_id, "field": field, "status": "approved"})


@app.route("/api/reject-field/<task_id>/<field>", methods=["POST"])
def api_reject_field(task_id, field):
    """Reject a specific found field — reverts to original value (or blank)."""
    task = get_task(task_id)
    if not task:
        return jsonify({"error": "not found"}), 404
    approved = dict(task.get("approved_fields", {}))
    approved.pop(field, None)
    rejected = list(set(task.get("rejected_fields", []) + [field]))
    update_task(task_id, {"approved_fields": approved, "rejected_fields": rejected})
    return jsonify({"task_id": task_id, "field": field, "status": "rejected"})


@app.route("/api/apply-field-choices/<task_id>", methods=["POST"])
def api_apply_field_choices(task_id):
    """
    Finalize per-field choices: rebuild result using only approved found fields.
    Does NOT change status — keeps it at 'enriched' so they can still approve/reject.
    """
    task = get_task(task_id)
    if not task:
        return jsonify({"error": "not found"}), 404

    record = dict(task.get("record", {}))
    found = task.get("found_fields", {})
    approved = task.get("approved_fields", {})
    rejected = set(task.get("rejected_fields", []))

    # Merge: start from original record, apply only non-rejected found fields
    result = dict(record)
    for field, val in found.items():
        if field not in rejected:
            result[field] = val

    # Also restore original values for rejected fields
    for field in rejected:
        result[field] = record.get(field, "")

    update_task(task_id, {"result": result})
    return jsonify({"task_id": task_id, "rejected_fields": list(rejected)})


@app.route("/api/apply-to-neon", methods=["POST"])
def api_apply_to_neon():
    """
    Apply all approved enrichment records to Neon.
    Reads all approved tasks, builds an UPDATE or INSERT payload,
    and writes it to a SQL file for Neon import.
    """
    queue = get_queue()
    approved = [t for t in queue if t["status"] == "approved"]

    if not approved:
        return jsonify({"message": "No approved records to apply"})

    media_updates = []
    journo_updates = []
    ngo_updates = []

    for task in approved:
        # record is in task["record"], found_fields is in task["found_fields"]
        record = dict(task["record"])  # copy
        found = task.get("found_fields", {})
        # Merge found fields into record for the update
        record.update(found)
        source = record.get("source", "")
        if source == "media":
            media_updates.append(record)
        elif source == "journalist":
            journo_updates.append(record)
        else:
            ngo_updates.append(record)

    # Build SQL statements
    sql_lines = ["-- Enrichment apply " + datetime.now().isoformat(), ""]

    for r in media_updates:
        sets = []
        for f in ["website", "facebook", "twitter", "instagram", "linkedin", "youtube"]:
            if r.get(f):
                sets.append(f"{f} = '{r[f]}'")
        if sets:
            sql_lines.append(f"UPDATE media_outlets SET {', '.join(sets)} WHERE id = '{r['id']}';")

    for r in journo_updates:
        sets = []
        for f in ["email", "twitter", "linkedin"]:
            if r.get(f):
                sets.append(f"{f} = '{r[f]}'")
        if sets:
            sql_lines.append(f"UPDATE journalists SET {', '.join(sets)} WHERE id = '{r['id']}';")

    # Write SQL file
    out_path = BASE / f"enrichment_apply_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    out_path.write_text("\n".join(sql_lines), encoding="utf-8")

    return jsonify({
        "message": f"Applied {len(approved)} records",
        "sql_file": str(out_path),
        "media": len(media_updates),
        "journalists": len(journo_updates),
        "ngos": len(ngo_updates),
    })


@app.route("/queue")
def queue_page():
    queue = get_queue()
    pending = [t for t in queue if t["status"] == "pending"]
    enriched = [t for t in queue if t["status"] == "enriched"]
    approved = [t for t in queue if t["status"] == "approved"]
    rejected = [t for t in queue if t["status"] == "rejected"]
    return render_template("queue.html", pending=pending, enriched=enriched, approved=approved, rejected=rejected)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5555, debug=True)
