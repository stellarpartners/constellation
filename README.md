# Constellation Studio

A PostgreSQL-backed platform for mapping relationships between NGOs, media outlets, and journalists in Greece — with the OKOIP public CSO registry integrated for cross-referencing and data quality.

**Live:** `https://master.constellation-3a3.pages.dev`

**Stack:** React UI (Cloudflare Pages) → Pages Function proxy → Neon PostgreSQL
(Workers API also available at `https://constellation-api.stellarpartners.workers.dev`)

---

## Data

| Entity | Records | Source |
|--------|---------|--------|
| NGOs (curated) | 801 | SIMA master CSV + 7 platform enrichments |
| OKOIP Registry | 1,935 | Greek public CSO registry (okoip.gov.gr) |
| NGO ↔ OKOIP matches | 699 | Exact + fuzzy trigram matching |
| Journalists | 110 | Manual curation |
| Media Outlets | 142 | Manual curation + EU coverage scoring |
| Outlet ↔ Journalist links | 58 | Many-to-many relationships |

---

## Design System

Atlas MP132 palette applied 2026-05-04:

| Token | Hex | Role |
|-------|-----|------|
| Floral White | `#f7f4ea` | Background |
| Coffee Bean | `#0b0119` | Text / Sidebar |
| Deep Ocean | `#117777` | Primary / Links |
| Rebecca Purple | `#5c3392` | Secondary / Depth |
| Royal Gold | `#f2cc64` | Accent / Active states |
| Vibrant Coral | `#fa7b62` | Destructive / Alerts |

**Typography:** 1.2 modular scale (h1: 2.986rem → small: 0.833rem)  
**Font:** Geist Variable (via `@fontsource-variable/geist`)  
**UI**: shadcn/ui + Tailwind CSS, dark sidebar + warm light content

---

## Quick Start

### 1. Set up Neon

Create a project at [neon.tech](https://neon.tech) and get your connection string.

### 2. Run the schema

```bash
# Media/journalist schema
psql $NEON_CONNECTION_STRING < neon/schema.sql

# NGO schema (includes OKOIP registry tables)
psql $NEON_CONNECTION_STRING < neon/ngo_schema.sql

# OKOIP schema
psql $NEON_CONNECTION_STRING < neon/okoip_schema.sql
```

### 3. Deploy the API

```bash
cd cloudflare-workers
npx wrangler secret put NEON_CONNECTION_STRING
npm run deploy
```

### 4. Deploy the UI

```bash
cd react-ui
npm run build
npx wrangler pages deploy dist \
  --project-name=constellation \
  --branch=master \
  --commit-message "$(git log -1 --format=%s)" \
  --commit-hash "$(git rev-parse HEAD)"
```

---

## Local Development

```bash
# API — http://localhost:8787
cd cloudflare-workers
cp .dev.vars.example .dev.vars
npm run dev

# UI — http://localhost:5173
cd react-ui
npm run dev

# Enrichment Studio — http://localhost:5555
cd enrichment-studio
python3 app.py
```

---

## Architecture

```
Browser
  → Cloudflare Pages (React SPA, custom domain)
    → Pages Function proxy (/api/*)  ←  bypasses Cloudflare Access
      → Neon PostgreSQL (SSL)
```

The Pages Function (`react-ui/functions/api/[[catchall]].ts`) queries Neon directly, avoiding the Workers API's Cloudflare Access restriction on the `workers.dev` domain.

---

## Project Structure

```
cloudflare-workers/     API — Cloudflare Workers + Hono + Neon driver
react-ui/               UI — React + Vite + shadcn/ui
  functions/api/        Pages Function proxy (direct Neon queries)
  src/
    components/layout/  DashboardLayout, Sidebar
    components/ui/      shadcn/ui components
neon/
  schema.sql            Media/journalist schema
  ngo_schema.sql        NGO schema + enrichment tables
  okoip_schema.sql      OKOIP registry + match tables
enrichment-studio/      Flask UI for enriching NGO profiles
import/
  media/                Source journalist/outlet CSVs
  ngodatabase/          NGO master + 7 platform CSVs
  okoip/                Scraped OKOIP data (JSON + flat CSV)
scripts/
  scrape_okoip.py       OKOIP API scraper
  import_okoip_to_neon.py   OKOIP import + NGO matching
  import_ngos_to_neon.py    Full NGO import pipeline
```

---

## Database Tables

### Media / Journalists

| Table | Records | Description |
|-------|---------|-------------|
| `journalists` | 110 | Greek journalists, beats, social links |
| `media_outlets` | 142 | Greek media with scores, social, ECI articles |
| `outlet_journalist_relations` | 58 | Many-to-many journalist ↔ outlet |

### NGOs

| Table | Records | Description |
|-------|---------|-------------|
| `ngos` | 801 | Curated NGO entities from SIMA |
| `ngo_social_profiles` | 1,993 | Social media links per NGO |
| `ngo_youbehero` | 85 | YouBeHero cause pages |
| `ngo_social_dynamo` | 149 | Social Dynamo profiles |
| `ngo_acf` | 150 | ACF Greece |
| `ngo_ngheroes` | 200 | NGO Heroes directory |
| `ngo_ethelon` | 268 | Ethelon volunteer platform |
| `ngo_desmos` | 380 | Desmos volunteer platform |
| `website_audits` | 16 | Website health scans |
| `ngo_contacts` | — | Reserved for future contact storage |

### OKOIP Registry

| Table | Records | Description |
|-------|---------|-------------|
| `okoip_registry` | 1,935 | Raw Greek CSO public registry |
| `ngo_okoip_matches` | 699 | NGO ↔ OKOIP match links |

---

## API Routes

### NGOs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ngos` | List/search NGOs (`?q=&page=1`) |
| GET | `/api/ngos/:id` | NGO detail + social + OKOIP matches + platforms + audits |

### OKOIP Registry

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/okoip` | List/search OKOIP records (`?q=&category=&page=1`) |
| GET | `/api/okoip/:id` | OKOIP record detail + linked NGOs |
| GET | `/api/okoip/categories` | Distinct categories with counts |
| GET | `/api/okoip/regions` | Distinct regions with counts |

### Media / Journalists

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Database-wide counts |
| GET | `/api/journalists` | List/search journalists |
| GET | `/api/journalists/:id` | Journalist detail + linked outlets |
| GET | `/api/outlets` | List/search outlets |
| GET | `/api/outlets/:id` | Outlet detail + linked journalists + scores |
| GET | `/api/search?q=` | Cross-entity search |
| GET | `/api/cross-platform-journalists` | Journalists at 2+ outlets |
| GET | `/api/sample-urls` | Platform table URL samples |

---

## Deployment Title Convention

Always pass git metadata to Cloudflare Pages deploys:

```bash
npx wrangler pages deploy dist \
  --project-name=constellation \
  --branch=master \
  --commit-message "$(git log -1 --format=%s)" \
  --commit-hash "$(git rev-parse HEAD)"
```

This gives each deployment a unique, descriptive title in the Cloudflare dashboard instead of a generic label.

---

## Environment Variables

```bash
# Cloudflare Workers — set via wrangler secret
NEON_CONNECTION_STRING=postgresql://user:***@host/db?sslmode=require

# Pages Function — set on Pages project
NEON_CONNECTION_STRING=postgresql://user:***@host/db?sslmode=require

# Local development (.dev.vars)
NEON_CONNECTION_STRING=postgresql://user:***@host/db?sslmode=require
```
