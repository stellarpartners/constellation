# Constellation Studio — React UI

## Setup

```bash
npm install
```

## Run locally (proxies API to Cloudflare Workers)

```bash
npm run dev
# → http://localhost:5173
```

Or run against a local Workers instance:

```bash
# In one terminal: run Workers
cd ../cloudflare-workers && npm run dev

# In another: run React
npm run dev
```

## Build for production

```bash
npm run build
# → dist/
```

## Deploy to Cloudflare Pages

Connect your GitHub repo to Cloudflare Pages, set build command to `npm run build`
and build output to `dist`.

Or use `wrangler pages deploy`:

```bash
npx wrangler pages deploy dist --project-name=constellation
```

## API Configuration

The React app calls `/api/*` — during local dev this proxies to `http://localhost:8787`
via Vite's server proxy. In production, point the Pages domain to the Workers API
or set `VITE_API_BASE` in your Pages settings.
