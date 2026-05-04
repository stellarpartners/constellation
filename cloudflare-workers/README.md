# Constellation API — Cloudflare Workers

Hono-based REST API for the Constellation database, running on Cloudflare Workers with Neon PostgreSQL (serverless driver).

**Base URL:** `https://constellation-api.stellarpartners.workers.dev`

---

## Setup

```bash
npm install
```

## Environment Variables

Create `.dev.vars` (never commit):

```
NEON_CONNECTION_STRING=postgresql://user:***@host/dbname?sslmode=require
```

Set on Cloudflare:

```bash
npx wrangler secret put NEON_CONNECTION_STRING
```

## Run locally

```bash
npm run dev
# → http://localhost:8787
```

## Deploy

```bash
npm run deploy
```

---

## Routes

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | All counts (NGOs, OKOIP, journalists, outlets, relationships, matches) |
| GET | `/api/search?q=` | Cross-entity search |
| GET | `/api/sample-urls` | Platform table URL samples |

### NGOs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ngos` | List/search (`?q=&page=1`) |
| GET | `/api/ngos/:id` | Detail + social + OKOIP matches + platforms + audits |

### OKOIP Registry

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/okoip` | List/search/filter (`?q=&category=&page=1`) |
| GET | `/api/okoip/:id` | Detail + linked NGOs |
| GET | `/api/okoip/categories` | Distinct categories |
| GET | `/api/okoip/regions` | Distinct regions |

### Journalists

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/journalists` | List/search (`?q=&page=1`) |
| GET | `/api/journalists/:id` | Detail + linked outlets + articles |
| GET | `/api/cross-platform-journalists` | Journalists at 2+ outlets |

### Media Outlets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/outlets` | List/search (`?q=&page=1`) |
| GET | `/api/outlets/:id` | Detail + linked journalists + scores + ECI articles |
| GET | `/api/top-outlets/:limit` | Ranked by journalist count |

---

## Note on Cloudflare Access

The Workers API is behind Cloudflare Access on the `workers.dev` domain. The React UI bypasses this via a **Pages Function** proxy (`react-ui/functions/api/[[catchall]].ts`) that queries Neon directly from the Pages domain, which is not behind Access.
