# Stellar Databases — Research & Knowledge Base

> **Date:** 2026-04-21  
> **Project:** Data collection and indexing platform — NGOs, Journalists, MediaOutlets, Contacts  
> **Context:** Internal tooling, programmatic query access, strong UI requirements, multi-location backup strategy

---

## 1. Architecture Decision Framework

### The Core Question
> Where does the database live and who manages sync complexity?

### Decision Tree

```
Are you building a Workers-first app where UI is secondary?
    → YES: D1 + Prisma (or build custom UI)
    → NO (UI is important, Postgres needed):
        ├── Already have a Postgres you want to use?
        │   → YES: Postgres + Hyperdrive + Baserow/NocoDB
        │   → NO (starting fresh):
        │       ├── Want minimal ops / managed?
        │       │   → YES: Supabase or Neon + Baserow/NocoDB
        │       │   → NO (want full control):
        │           → Self-hosted Postgres + Hyperdrive + Baserow/NocoDB
```

---

## 2. Recommended Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    RECOMMENDED ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [Baserow / NocoDB]  ←── UI for filters/sorting/views     │
│         ↕ REST API                                          │
│   [PostgreSQL] ←── Single source of truth                   │
│         ↕                                                   │
│   [Hyperdrive] ←── Cloudflare Workers (website uptime)     │
│                                                              │
│   BACKUP: pg_dump → rclone → PC + Laptop + VPS x2          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Why NOT D1 (Cloudflare SQLite)?
- Baserow/NocoDB do NOT support D1 natively — you lose the UI layer
- SQLite semantics = limited joins, no window functions
- Your "filter-heavy interface" requirement means you need a proper SQL backend
- Two-way sync between D1 and Postgres = unnecessary complexity

### Why NOT Two-Way Sync Between Postgres Instances?
- Every sync mechanism is a new failure point
- Conflicts when both write the same record
- **Single source of truth = everything reads/writes to the same Postgres**

---

## 3. Database Layer

### PostgreSQL (Recommended)
- **Max data:** 2GB (well within any Postgres deployment)
- **Entities:** 6-10 core tables (NGOs, Contacts, Journalists, MediaOutlets, etc.)
- **Connections:** Use foreign keys and join tables (many-to-many relationships)
  - Example: `journalists_media_outlets` junction table
  - Not indexes — indexes speed up queries, junction tables model relationships

### Managed Options (Starting Fresh)
| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Supabase** | 500MB DB, 1GB storage, 50k MAU | Native Workers driver, built-in auth, REST API |
| **Neon** | 3GB storage, scales to zero | PostgreSQL, native Workers driver |
| **Tembo** | PostgreSQL-focused managed | Trunk-based, good for custom extensions |

### Self-Hosted Option
- Any VPS (Hetzner €4-6/month)
- Full control, but you manage backups yourself

---

## 4. UI Layer — NocoDB vs Baserow

### NocoDB

**What it is:** Open-source Airtable alternative (62k GitHub stars). Spreadsheet interface on top of PostgreSQL/MySQL.

**License:** Sustainable Use License — free for internal/non-competitive use. For fully open (AGPLv3), see Baserow.

**Installation:**
```bash
# Docker with existing Postgres
docker run -d \
  --name noco \
  -v "$(pwd)"/nocodb:/usr/app/data/ \
  -p 8080:8080 \
  -e NC_DB="pg://host.docker.internal:5432?u=postgres&p=password&d=yourdb" \
  -e NC_AUTH_JWT_SECRET="generate-random-secret-here" \
  nocodb/nocodb:latest

# Auto-upstall (recommended for VPS)
bash <(curl -sSL http://install.nocodb.com/noco.sh) <(mktemp)
```

**Views:** Grid, Kanban, Gallery, Form, Calendar

**API:** Full REST API (v2 + v3)
```
GET    /api/v1/db/data/{tableId}/rows     # List rows
POST   /api/v1/db/data/{tableId}/rows     # Create row
GET    /api/v1/db/data/{tableId}/rows/{id} # Get row
PUT    /api/v1/db/data/{tableId}/rows/{id} # Update row
DELETE /api/v1/db/data/{tableId}/rows/{id} # Delete row
```

**Notable users:** Accenture, Walmart, Hyundai, PwC, Bosch, American Express

**Resources:**
- Website: https://nocodb.com/
- Docs: https://docs.nocodb.com/
- GitHub: https://github.com/nocodb/nocodb

### Baserow

**What it is:** More purely open-source (AGPLv3), Python-based. Similar to NocoDB.

**License:** AGPLv3 — fully open-source, no commercial restrictions.

**Key difference:** NocoDB is Node/Vue, Baserow is Python. Both work with PostgreSQL.

**Resources:**
- Website: https://baserow.io/
- Docs: https://baserow.io/docs/

### Recommendation
Either works. NocoDB's Docker-first deployment is simpler. Baserow is more purely open-source. **Start with NocoDB** (faster to deploy), switch if the license becomes an issue.

---

## 5. Cloudflare Workers Integration

### Option A: Hyperdrive (Use with External Postgres)
Workers can't do raw TCP to Postgres. Hyperdrive is the connection pooler/proxy.

```typescript
import { Client } from "pg";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString,
    });
    await client.connect();
    const result = await client.query("SELECT * FROM media_outlets");
    return Response.json(result.rows);
  }
};
```

**Supports:** PostgreSQL, MySQL, CockroachDB, Timescale  
**Providers:** AWS, Google Cloud, Azure, Neon, Supabase, PlanetScale

### Option B: Native Serverless Drivers (Managed Postgres)
If using Supabase or Neon, use their native drivers — no Hyperdrive needed.

**Supabase:**
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
```

**Neon:**
```typescript
import { neon } from '@neondatabase/serverless'
const sql = neon(DATABASE_URL)
```

### Option C: D1 (SQLite) + Prisma
If you want to stay 100% Cloudflare-native and build custom UI.

```bash
npm install prisma@latest @prisma/client@latest @prisma/adapter-d1
```

**Reference:** https://blog.cloudflare.com/prisma-orm-and-d1/

**Limitation:** D1 is SQLite — Baserow/NocoDB don't support it. You must build custom UI.

### Cloudflare Database Products Summary

| Product | Type | Max Size | Best For |
|---------|------|----------|----------|
| **D1** | SQLite (serverless) | 10GB per DB | Workers-first, simple data, custom UI |
| **Hyperdrive** | Connection pooler/proxy | N/A | Connecting Workers to external Postgres |
| **Analytics Engine** | Time-series | N/A | Metrics, logs |
| **Vectorize** | Vector DB | N/A | AI/embedding search |
| **KV** | Key-value | Unlimited | Simple config, feature flags |

**Reference:** https://developers.cloudflare.com/workers/databases/

---

## 6. Backup Strategy

### Requirements
- 4 destinations: PC, Laptop, VPS #1, VPS #2
- 2GB data (pg_dump compressed ≈ 200MB)
- Automated, daily minimum, tested

### Solution: pg_dump + rclone

```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d)
BACKUP_DIR=/path/to/backups
DB_NAME=stellar_databases

# Create compressed pg_dump
pg_dump -Fc $DB_NAME > $BACKUP_DIR/backup_$DATE.dump

# Push to 4 destinations via rclone
rclone copy $BACKUP_DIR/backup_$DATE.dump remote_pc:backups/
rclone copy $BACKUP_DIR/backup_$DATE.dump remote_laptop:backups/
rclone copy $BACKUP_DIR/backup_$DATE.dump remote_vps1:backups/
rclone copy $BACKUP_DIR/backup_$DATE.dump remote_vps2:backups/

# Cleanup old local backups (keep 30 days)
find $BACKUP_DIR -name "backup_*.dump" -mtime +30 -delete
```

### Cron Setup
```bash
# Run daily at 3 AM
0 3 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

### Restore Instructions
```bash
# Single location restore
pg_restore -Fc -d stellar_databases backup_20260421.dump

# List contents before restoring
pg_restore --list backup_20260421.dump | head -50
```

### Cloudflare D1 Time Travel (Alternative for D1)
D1 has built-in point-in-time recovery (last 30 days):
```bash
wrangler d1 time-travel restore my-database --timestamp="2024-04-20T12:00:00Z"
```
**Limitation:** Only for D1, not for PostgreSQL.

---

## 7. Data Modeling Notes

### Core Entities (Draft)

| Entity | Fields (Draft) |
|--------|----------------|
| **NGOs** | id, name, website, country, focus_area, contact_id, created_at, updated_at, status |
| **Journalists** | id, name, outlet_id, beat, email, twitter, linkedin, created_at, updated_at |
| **MediaOutlets** | id, name, website, type (print/broadcast/digital), country, language, created_at, updated_at |
| **Contacts** | id, name, email, phone, organization, role, notes, created_at, updated_at |
| **Relationships** | id, source_type, source_id, target_type, target_id, relationship_type, created_at |

### Relationship Modeling
**NOT indexes** — junction/bridge tables for many-to-many:

```sql
CREATE TABLE journalist_outlets (
  id SERIAL PRIMARY KEY,
  journalist_id INT REFERENCES journalists(id),
  outlet_id INT REFERENCES media_outlets(id),
  relationship_type VARCHAR(50), -- 'works_at', 'contributor', 'former_staff'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_contacts (
  id SERIAL PRIMARY KEY,
  organization_type VARCHAR(50), -- 'ngo', 'media_outlet'
  organization_id INT,
  contact_id INT REFERENCES contacts(id),
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes (For Query Performance)
```sql
-- Indexes for filter/sort performance
CREATE INDEX idx_journalists_outlet ON journalists(outlet_id);
CREATE INDEX idx_journalists_beat ON journalists(beat);
CREATE INDEX idx_media_outlets_type ON media_outlets(type);
CREATE INDEX idx_media_outlets_country ON media_outlets(country);
CREATE INDEX idx_ngos_country ON ngos(country);
CREATE INDEX idx_ngos_focus_area ON ngos(focus_area);
```

---

## 8. Implementation Roadmap

### Phase 1: Local Proof of Concept (Week 1)
- [ ] Install NocoDB locally via Docker
- [ ] Create sample Postgres schema (3-4 tables)
- [ ] Connect NocoDB to Postgres, test filters/sorting
- [ ] Test REST API access

### Phase 2: Data Modeling (Week 2)
- [ ] Design full schema (6-10 entities + relationships)
- [ ] Set up Supabase or Neon (or self-hosted Postgres)
- [ ] Migrate sample data
- [ ] Verify API access from external tools

### Phase 3: Production Deployment (Week 3)
- [ ] Deploy NocoDB to VPS (auto-upstall script)
- [ ] Configure domain + SSL
- [ ] Set up rclone backup destinations (PC, Laptop, 2x VPS)
- [ ] Test backup/restore cycle

### Phase 4: Cloudflare Workers Integration (Week 4+)
- [ ] Set up Hyperdrive for external Postgres
- [ ] Write first Worker (website uptime checker)
- [ ] Connect Worker to Postgres via Hyperdrive
- [ ] Add webhook or direct API call to update status

### Phase 5: UI Refinement (Ongoing)
- [ ] Configure custom views in NocoDB
- [ ] Set up team access + permissions
- [ ] Build saved filters and dashboards

---

## 9. Key References

### Documentation
- NocoDB: https://docs.nocodb.com/
- Baserow: https://baserow.io/docs/
- Supabase: https://supabase.com/docs
- Neon: https://neon.tech/docs
- Cloudflare Workers + Databases: https://developers.cloudflare.com/workers/databases/
- Cloudflare Hyperdrive: https://developers.cloudflare.com/hyperdrive/

### Blog Posts
- Prisma ORM + D1: https://blog.cloudflare.com/prisma-orm-and-d1/

### GitHub
- NocoDB: https://github.com/nocodb/nocodb (62k stars)
- Baserow: https://github.com/nocodb/nocodb

### Backup Tools
- rclone: https://rclone.org/
- pg_dump / pg_restore: PostgreSQL docs

---

## 10. Open Questions

- [ ] Do you already have an existing Postgres setup, or is this greenfield?
- [ ] Which managed Postgres provider (Supabase vs Neon vs self-hosted)?
- [ ] What are the "connections" between entities — specific examples?
- [ ] Do you need user authentication and roles in NocoDB/Baserow?
- [ ] What data volumes per entity (rough estimate)?
- [ ] Any existing data to migrate (CSV, Excel, existing DB)?
