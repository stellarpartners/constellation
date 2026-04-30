# Constellation API - Cloudflare Workers

## Setup

```bash
npm install
```

## Environment Variables (local dev)

Create a `.dev.vars` file (never commit this):

```
NEON_CONNECTION_STRING=postgresql://user:password@host/dbname
```

## Run locally

```bash
npm run dev
```

API available at `http://localhost:8787/api/*`

## Deploy

```bash
# Set the secret
npx wrangler secret put NEON_CONNECTION_STRING
# (paste your Neon connection string when prompted)

# Deploy
npm run deploy
```

Workers API deploys to: `https://constellation-api.<your-subdomain>.workers.dev`

## Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Database stats |
| GET | `/api/top-outlets/:limit` | Outlets ranked by journalist count |
| GET | `/api/journalists` | List journalists (supports `?q=search&page=1`) |
| GET | `/api/journalists/:id` | Journalist detail with linked outlets |
| GET | `/api/outlets` | List outlets (supports `?q=search&page=1`) |
| GET | `/api/outlets/:id` | Outlet detail with linked journalists |
| GET | `/api/cross-platform-journalists` | Journalists at multiple outlets |
| GET | `/api/search?q=term` | Unified search across journalists & outlets |
