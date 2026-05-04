# Constellation Studio — React UI

React + Vite + shadcn/ui frontend for the Constellation database platform.

**Design System:** Atlas MP132 palette (dark coffee-bean sidebar, warm floral-white content, deep-ocean primary), Geist Variable font, 1.2 modular typographic scale.

---

## Setup

```bash
npm install
```

## Run locally

```bash
npm run dev
# → http://localhost:5173
```

During dev, Vite proxies `/api/*` to `http://localhost:8787` (local Workers).

## Build for production

```bash
npm run build
# → dist/
```

## Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist \
  --project-name=constellation \
  --branch=master \
  --commit-message "$(git log -1 --format=%s)" \
  --commit-hash "$(git rev-parse HEAD)"
```

The `--commit-message` and `--commit-hash` flags give each deployment a unique, descriptive title in the Cloudflare dashboard.

## Architecture note

This app includes a **Pages Function** (`functions/api/[[catchall]].ts`) that queries Neon PostgreSQL directly. This bypasses the Cloudflare Access restriction on the Workers API's `workers.dev` subdomain, allowing the Pages-hosted UI to access data without an Access token.

## Design tokens

All colors derive from CSS custom properties in `src/index.css`:

| Token | CSS variable |
|-------|-------------|
| Background | `--background` (floral-white) |
| Text | `--foreground` (coffee-bean) |
| Primary | `--primary` (deep-ocean) |
| Sidebar | `--sidebar-background` (coffee-bean) |
| Sidebar active | `--sidebar-accent-foreground` (royal-gold) |

Typography scale in `tailwind.config.js`:
- `text-scale-h1` through `text-scale-h6` (2.986rem → 1.2rem)
- `text-scale-body` (1rem)
- `text-scale-small` (0.833rem)
