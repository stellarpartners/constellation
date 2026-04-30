# Constellation Studio

Two databases in one Neon PostgreSQL instance:

1. **NGO database** — 801 Greek NGOs from SIMA, enriched with platform data (YouBeHero, Desmos, ACF, Ethelon, NGO Heroes, Social Dynamo, Website Audits)
2. **Media/Journalist database** — Greek media outlets and the journalists who work there, with cross-platform analysis

**Stack:** React UI (Cloudflare Pages) → Cloudflare Workers API → Neon PostgreSQL

---

## Quick Start

### 1. Set up Neon

Create a project at [neon.tech](https://neon.tech) and get your connection string.

### 2. Run the schema

```bash
# NGO schema (already applied — verify with the command below)
psql $NEON_CONNECTION_STRING -c "SELECT COUNT(*) FROM ngos;"

# Media schema
psql $NEON_CONNECTION_STRING < neon/schema.sql
```

### 3. (Optional) Re-import data

```bash
# From the constellation directory
cd "/home/spyros/Insync/spytzo@gmail.com/OneDrive/Stellar Partners/operations/active/constellation"
python3 -c "
import sys; sys.path.insert(0, 'scripts')
from import_ngos_to_neon import run; run()
"
```

### 4. Deploy the API

```bash
cd cloudflare-workers
npx wrangler secret put NEON_CONNECTION_STRING
# paste your Neon connection string when prompted
npm run deploy
```

### 5. Deploy the UI

```bash
cd react-ui
npm run build
npx wrangler pages deploy dist --project-name=constellation
```

---

## Local Development

```bash
# API — http://localhost:8787
cd cloudflare-workers
cp .dev.vars.example .dev.vars  # add your NEON_CONNECTION_STRING
npm run dev

# UI — http://localhost:5173
cd react-ui
npm run dev
```

---

## Project Structure

```
cloudflare-workers/     API — Cloudflare Workers + Hono + Neon driver
react-ui/               UI — React + Vite (static, deploys to Cloudflare Pages)
neon/
  schema.sql            Media/journalist schema (legacy — verify it's current)
  ngo_schema.sql        NGO schema + enrichment tables
enrichment-studio/      Web UI for enriching NGO profiles via subagent research
import/
  ngodatabase/         Source CSVs — MASTER-ALL + 7 platform files
  media/                Source media/journalist CSVs (separate pipeline)
scripts/
  import_ngos_to_neon.py   Full NGO import: master + all enrichments
  run_enrichment_subagent.py  Spawn subagent to research one NGO
  migrate_to_neon.py        Docker Postgres → Neon migration script
migrate_to_neon.py       One-time migration Docker → Neon
```

---

## NGO Database

**Source:** SIMA master (801 NGOs) + 7 platform/audit CSV files

**Tables:**

| Table | Rows | Description |
|-------|------|-------------|
| `ngos` | 801 | Core NGO entities |
| `ngo_social_profiles` | ~1,993 | Social media links per NGO |
| `ngo_youbehero` | 85 | YouBeHero cause pages |
| `ngo_desmos` | 380 | Desmos volunteer platform |
| `ngo_acf` | 150 | ACF Greece |
| `ngo_ngheroes` | 200 | NGO Heroes directory |
| `ngo_ethelon` | 268 | Ethelon volunteer platform |
| `ngo_social_dynamo` | 149 | Social Dynamo profiles |
| `website_audits` | 16 | Website health scans |

**NGO Enrichment Studio** (`enrichment-studio/app.py`) provides a web UI to research and update NGO profiles. Each NGO gets a review queue entry, a subagent researches it, and results are applied back to the database.

---

## API Reference

### NGO endpoints (enrichment API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ngos` | List NGOs (`?q=search&page=1`) |
| GET | `/api/ngos/:id` | NGO profile + all enrichments |
| GET | `/api/ngos/:id/social` | Social profiles for an NGO |
| GET | `/api/enrichment-stats` | Enrichment coverage stats |

### Media/Journalist endpoints (legacy — verify schema is current)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Total journalists, outlets, relationships |
| GET | `/api/top-outlets/:limit` | Outlets ranked by journalist count |
| GET | `/api/journalists` | List journalists (`?q=search&page=1`) |
| GET | `/api/journalists/:id` | Journalist profile + linked outlets |
| GET | `/api/outlets` | List outlets (`?q=search&page=1`) |
| GET | `/api/outlets/:id` | Outlet profile + linked journalists |
| GET | `/api/cross-platform-journalists` | Journalists working at 2+ outlets |
| GET | `/api/search?q=term` | Unified search across both tables |

---

## Import Pipeline

### NGO data flow

```
MASTER-ALL (2).csv  ←── 801 NGOs (SIMA)
        │
        ├──→ ngos
        ├──→ ngo_social_profiles (Facebook, LinkedIn, Instagram, YouTube, Twitter, TikTok URLs)
        │
        └──→ Platform CSVs (matched via MASTER column):
                ├── YouBeHero-Grid view.csv   → ngo_youbehero
                ├── Desmos-Grid view.csv      → ngo_desmos
                ├── ACF-Grid view.csv         → ngo_acf
                ├── ngoHeroes-Grid view.csv  → ngo_ngheroes
                ├── Ethelon-Grid view.csv     → ngo_ethelon
                ├── Social Dynamo-Grid view.csv → ngo_social_dynamo
                └── Website Audits-Grid view.csv → website_audits
```

### Data quality notes

- YouBeHero source has 9 duplicate URLs (exact duplicates) — removed at import
- Website Audits had 1 merged row (two NGOs in one cell) — split at import
- 61 YouBeHero rows have no NGO name (empty MASTER) — cannot be auto-matched; require manual URL lookups
- All `last_modified_raw` dates stored as-is strings (not parsed)

---

## Environment Variables

```bash
# Cloudflare Workers — set via wrangler secret
NEON_CONNECTION_STRING=postgresql://user:pass@host/db?sslmode=require

# Local development (.dev.vars in cloudflare-workers/)
NEON_CONNECTION_STRING=postgresql://user:pass@host/db?sslmode=require
```
