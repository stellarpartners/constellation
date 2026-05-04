# Constellation Studio — UI Redesign Plan

## Current State
- Plain React + CSS, gradient purple theme
- Basic list/detail views with inline styles
- Limited navigation, no dashboard layout
- All in one App.tsx file (582 lines)

## Target: Shadcn/UI Dashboard
Clean, professional data dashboard. Think Stripe dashboard, Linear, Vercel — not another gradient app.

### Tech Stack Changes
```
Current: React + Vite + custom CSS (index.css)
Target:  React + Vite + Tailwind CSS + shadcn/ui + recharts (optional)
```

### Phase 1: Foundation (setup + layout)
- Install Tailwind CSS + shadcn/ui CLI
- Initialize shadcn components: Button, Card, Table, Badge, Tabs, Input, Select, Dialog, Sheet, Skeleton, Avatar, Separator
- Create layout: Sidebar (collapsible) + Top bar + Main content area
- Add theme toggle (light/dark) via next-themes or similar

### Phase 2: Dashboard Overview
- Stats cards with icons and trend indicators
- Quick-search bar (global, cross-entity)
- Recent activity / recently viewed
- Entity quick-stats (NGOs matched, OKOIP coverage, etc.)

### Phase 3: Entity Views — NGOs
**List view** (Table):
- Columns: Name, Category, Email, Website, City, Match count
- Search + filter by category
- Pagination
- Row click → detail

**Detail view** (Tabs/Sections):
- Overview card: name, category, slug, website link
- Contact: email, phone, address, city
- Social profiles: grid of platform chips with links
- Platform links: expandable sections per platform (YouBeHero, ACF, etc.)
- OKOIP matches: table of matched records with scores, tags, link to OKOIP detail
- HubSpot: company ID reference

### Phase 4: Entity Views — OKOIP Registry
**List view** (Table):
- Columns: Name, Category, TIN, Email, Region, Status
- Search + filter by category, region
- Pagination

**Detail view**:
- Overview: title, category, TIN, status badge
- Contact: email, phone, address with map link
- Geography: region → prefecture → municipality hierarchy
- Legal rep: name, surname, TIN
- Purpose: full text description
- Grant: financial info
- Linked NGOs: table of matched Constitution NGOs with scores

### Phase 5: Entity Views — Journalists & Media (upgrade existing)
**Journalists** (Table + Detail):
- Table: Name, Outlet, Beat, Status, Twitter/LinkedIn presence
- Detail: full info + outlet links + article list

**Media Outlets** (Table + Detail):
- Table: Name, Type, Geo level, Scores
- Detail: full info + social + scores + journalists + ECI articles

### Phase 6: Cross-Entity Features
- Global search (search across all entities)
- Relationship graph (NGO ↔ OKOIP visual links)
- Data export (CSV download)
- Loading skeletons for every view

## File Structure (new)
```
react-ui/src/
├── main.tsx
├── App.tsx                    # Router + layout
├── lib/
│   ├── utils.ts              # cn() helper, formatters
│   └── api.ts                 # API client (update types)
├── components/
│   ├── ui/                    # shadcn components (Button, Card, Table, etc.)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── DashboardLayout.tsx
│   └── entities/
│       ├── ngo/
│       │   ├── NGOListView.tsx
│       │   └── NGODetailView.tsx
│       ├── okoip/
│       │   ├── OKOIPListView.tsx
│       │   └── OKOIPDetailView.tsx
│       ├── journalist/
│       │   ├── JournalistListView.tsx
│       │   └── JournalistDetailView.tsx
│       └── outlet/
│           ├── OutletListView.tsx
│           └── OutletDetailView.tsx
│       ├── dashboard/
│       │   └── DashboardOverview.tsx
│       └── search/
│           └── GlobalSearch.tsx
├── hooks/
│   └── use-data-api.ts        # Generic fetch hook
└── types/
    └── index.ts               # Shared types (move from api.ts)
```

## Estimated Effort
| Phase | Files | Complexity |
|-------|-------|------------|
| 1 — Foundation + Layout | 8-10 | Medium |
| 2 — Dashboard | 3-4 | Low |
| 3 — NGOs | 3-4 | Medium |
| 4 — OKOIP | 3-4 | Medium |
| 5 — Journalists/Media | 4-6 | Low-Medium |
| 6 — Cross-entity | 2-3 | High |
| **Total** | **~25-30 files** | |

## Design Principles
1. **Data-first**: every card shows real data, not empty placeholders
2. **Scanable**: tables with tags, badges, color-coded scores
3. **Linked**: every entity links to its related entities (NGO → OKOIP → NGO)
4. **Fast**: pagination on all lists, skeletons during load
5. **Clean**: shadcn's default neutral palette, no gradient backgrounds
