#!/usr/bin/env python3
"""
Enrichment Subagent — spawned by the agent to fill in missing contact fields.
Runs as a standalone script so it can be called via delegate_task or subprocess.

Usage:
    python3 run_enrichment_subagent.py --batch-size 10
"""
import argparse, json, sys, re, os
from pathlib import Path

# Add parent dir to path so we can import from app.py's helpers
BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))

QUEUE_DIR = BASE / "review_queue"

def get_pending_tasks(limit=20):
    tasks = []
    for f in sorted(QUEUE_DIR.glob("*.json"))[:limit]:
        with open(f, encoding="utf-8") as fp:
            tasks.append(json.load(fp))
    return [t for t in tasks if t["status"] == "pending"]

def update_task(task_id, updates):
    path = QUEUE_DIR / f"{task_id}.json"
    with open(path, encoding="utf-8") as f:
        task = json.load(f)
    task.update(updates)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(task, f, indent=2, ensure_ascii=False)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--source", default="all")  # all | media | journalist | ngo
    args = parser.parse_args()

    tasks = get_pending_tasks(limit=args.batch_size)
    if args.source != "all":
        tasks = [t for t in tasks if t["record"].get("source") == args.source]

    print(f"[Enrichment] Got {len(tasks)} pending tasks")
    for t in tasks:
        print(f"  - {t['task_id']}: {t['record'].get('name', t['record'].get('id', '?'))} [{t['record'].get('source', '?')}]")

    print(f"\n[Enrichment] NOTE: This script is a queue manager.")
    print(f"The actual web research is done by Hermes agent subagents.")
    print(f"To run enrichment, use delegate_task() from the agent to spawn")
    print(f"parallel enrichment subagents targeting these tasks.")
    print(f"\nQueue dir: {QUEUE_DIR}")
    print(f"Run: delegate_task(goal=ENRICHMENT_GOAL, context=...) with toolsets=['web','file']")

if __name__ == "__main__":
    main()
