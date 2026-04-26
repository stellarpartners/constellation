# CONSTELLATION Database System

**Stellar Partners Internal Project**  
*Managing relationships between NGOs, media outlets, and journalists through constellation mapping*

---

## 🎯 Overview

Constellation is a PostgreSQL-based relational database system with NocoDB as the user interface. It enables pattern discovery by mapping relationships between three core entity types:

- **Organizations/NGOs** (~803 records)
- **Media Outlets** (252 records)  
- **Journalists** (110 records)

The "constellation" metaphor: individual data points become meaningful when patterns emerge from the connections between them.

---

## 📦 What's Included

### Core Files
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Docker services configuration (PostgreSQL + NocoDB + Adminer) |
| `init-db.sql` | PostgreSQL schema definition with exact CSV column matching |
| `import_data.py` | Automated Python script for importing CSV data |
| `.env` | Environment variables (database credentials, ports) |
| `nocodb_config.json` | NocoDB configuration settings |

### Documentation
| File | Purpose |
|------|---------|
| `README.md` | This file - main project documentation |
| `docs/ARCHITECTURE.md` | System architecture and design decisions |
| `docs/SCHEMA.md` | Detailed database schema documentation |
| `docs/QUICK_START.md` | 5-minute deployment guide |
| `docs/PROJECT_SUMMARY.md` | Technical overview and current status |

### Data Files
| File | Purpose | Records |
|------|---------|---------|
| `media/export - Media - Grid view.csv` | Media outlets data | 252 |
| `media/export - Journalists - Grid view.csv` | Journalists data | 110 |
| `baserow-greekmedia/` | Original Baserow export files (reference) | - |

### Scripts & Tools
| File | Purpose |
|------|---------|
| `import_data.py` | Main automated import script |
| `media/csv_to_json.py` | CSV to JSON conversion utility |
| `stellar-databases-research.md` | Research notes and ideas |

---

## 🚀 Quick Start (5 Minutes)

### 1. Navigate to Project
```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Partners/operations/active/constellation
```

### 2. Deploy Docker Services
```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5432) - Database
- **NocoDB** (port 8080) - No-code UI interface
- **Adminer** (port 8081) - Direct SQL access (optional)

### 3. Access the Interface
Open your browser to:
- **NocoDB UI**: http://localhost:8080
  - Login: email and password (check `.env` for credentials)
- **Direct SQL** (optional): http://localhost:8081

### 4. Import Data
```bash
python3 import_data.py
```

This will automatically load all CSV files into the database.

---

## 📊 Database Structure

### Core Tables (3)

#### 1. `media_outlets` (252 records)
Stores media outlet information with progressive scoring metrics.

**Key Fields:**
- `id`, `name`, `website` - Basic info
- `progressive_score`, `combined_score`, `eu_coverage_score` - Scoring metrics (indexed for fast filtering)
- `geographical_level`, `topics[]` - Classification
- `people` - Comma-separated journalist names (needs parsing)
- Social media handles (facebook, twitter, instagram, linkedin, youtube)

#### 2. `journalists` (110 records)
Individual journalist profiles with article links.

**Key Fields:**
- `id`, `name` - Journalist identifier
- `article_links[]` - JSONB array of URL objects with titles/sources
- `primary_beat` - Area of expertise (Environment, Economy, etc.)
- Social media and contact info

#### 3. `organizations` (~803 NGOs)
Non-governmental organization records matching SIMA master.csv structure.

**Key Fields:**
- `id`, `company_name`, `website`, `email`, `phone` - Contact info
- `category` (Κατηγορία) - Classification (e.g., "Φιλοζωία" = Animal Welfare)
- Social media handles across all platforms
- Platform integration URLs (YouBeHero, Desmos, ACF, ngoHeroes, etc.)

### Dimension Tables (6-7)

These support relationships and additional data:

4. **`organization_contacts`** - Multiple contact points per NGO
5. **`organization_campaigns`** - Active campaigns/projects by NGOs
6. **`media_articles`** - Content published by media outlets
7. **`journalist_articles`** - Articles written by journalists
8. **`organization_media_relations`** - Connections between NGOs and media (coverage, partnerships)
9. **`journalist_organization_relations`** - Journalist-NGO relationships (advocacy, interviews)

---

## 🔗 Building the "Constellation Lines"

### Phase 1: Direct Links (Easy)

#### Link Journalists to Media Outlets
```sql
-- Add foreign key column
ALTER TABLE journalists 
ADD COLUMN primary_outlet_id VARCHAR(20) REFERENCES media_outlets(id);

-- Update existing data (match by name)
UPDATE journalists j
SET primary_outlet_id = m.id
FROM media_outlets m
WHERE LOWER(replace(j.media, ',', ' ')) = LOWER(m.name);
```

#### Parse "People" Column → Create Journalist Records
The `people` column in media_outlets contains journalist names:
> "Τάσος Σαραντής,Κώστας Ζαφειρόπουλος,Μαρία Ψαρά"

**Action**: Split by comma, create individual journalist records, link to their outlet.

### Phase 2: Relationship Tables (Medium)

#### Map NGO-Media Coverage
```sql
-- Track which NGOs are covered by which outlets
INSERT INTO organization_media_relations (organization_id, media_outlet_id, relation_type, notes)
VALUES 
('ORG001', 'MEDIA162', 'covered_by', 'Regular coverage on EU policy'),
('ORG002', 'MEDIA228', 'partners_with', 'Joint campaign 2024');
```

#### Map Journalist-NGO Advocacy
```sql
-- Track which journalists advocate for which NGOs
INSERT INTO journalist_organization_relations (journalist_id, organization_id, relation_type, notes)
VALUES 
('JOURNALIST3', 'ORG162', 'advocates_for', 'Regular interviews and articles'),
('JOURNALIST75', 'ORG228', 'consulted_by', 'Expert source on environment');
```

### Phase 3: Constellation Patterns (Advanced)

Once relationships are mapped, query patterns like:
- Which NGOs are covered by the most progressive outlets?
- Which journalists cover multiple NGOs in the same sector?
- What's the coverage density across different regions?

---

## 🔍 Query Examples

### Find Most Progressive Media Outlets
```sql
SELECT name, combined_score, progressive_score, eu_coverage_score
FROM media_outlets
WHERE combined_score >= 6
ORDER BY combined_score DESC;
```

### NGOs Covered by Multiple Outlets
```sql
SELECT o.company_name, COUNT(m.id) as coverage_count
FROM organizations o
JOIN organization_media_relations omr ON o.id = omr.organization_id
JOIN media_outlets m ON omr.media_outlet_id = m.id
GROUP BY o.id
HAVING COUNT(m.id) > 2;
```

### Journalists Covering Specific NGO Categories
```sql
SELECT j.name, j.primary_beat, COUNT(DISTINCT o.id) as orgs_covered
FROM journalists j
JOIN journalist_organization_relations jor ON j.id = jor.journalist_id
JOIN organizations o ON jor.organization_id = o.id
WHERE o.category = 'Φιλοζωία'
GROUP BY j.id;
```

---

## 🛠️ Deployment & Maintenance

### Environment Variables (`.env`)
```bash
POSTGRES_USER=constellation_user
POSTGRES_PASSWORD=constellation_pass  # Change this!
POSTGRES_DB=constellation_db

NC_ADMIN_EMAIL=admin@stellarpartners.gr  # For NocoDB login
NC_ADMIN_PASSWORD=Admin123!               # Must be 8+ chars with uppercase, number, special char
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character from: `$&+,:;=?@#'.^*()%!_-\"`

### Docker Commands

```bash
# Start services
docker-compose up -d

# View status
docker-compose ps

# Check logs
docker-compose logs postgres
docker-compose logs nocodb

# Restart services
docker-compose restart

# Stop services
docker-compose down
```

### Database Backup & Restore

```bash
# Create backup
docker exec constellation-postgres pg_dump constellation_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i constellation-postgres psql -U constellation_user -d constellation_db < backup_20260424.sql
```

### Reset Admin Password (if needed)
```bash
docker exec constellation-postgres psql -U constellation_user -d constellation_db << EOF
ALTER USER constellation_user WITH PASSWORD 'newpassword123';
EOF
```

---

## 📁 Project Organization

```
constellation/
├── .git/                    # Version control
├── docs/                    # Documentation folder
│   ├── ARCHITECTURE.md      # System architecture and design decisions
│   ├── SCHEMA.md            # Detailed database schema
│   ├── QUICK_START.md       # 5-minute deployment guide
│   ┪── PROJECT_SUMMARY.md   # Technical overview
│   └── RESEARCH/            # Research notes and ideas
├── media/                   # Data files
│   ├── export - Media - Grid view.csv
│   └── export - Journalists - Grid view.csv
├── baserow-greekmedia/      # Original Baserow exports (reference)
├── import_data.py           # Automated import script
├── init-db.sql              # Database schema
├── docker-compose.yml       # Docker configuration
├── .env                     # Environment variables
├── nocodb_config.json       # NocoDB settings
└── README.md                # This file
```

---

## 🎨 Using NocoDB Interface

### Add/Edit Data
1. Click on any table → "Add Record"
2. Fill in fields or import from CSV
3. Use relational interface to link records (e.g., assign journalist to outlet)

### View Relationships
1. Enable "Relations" view in settings
2. See how tables connect visually
3. Filter by related records (e.g., show all journalists for an outlet)

### Create Views/Dashboards
- Build custom queries to find constellation patterns
- Example: "Show NGOs covered by outlets with progressive_score >= 5"
- Export results as reports or charts

---

## 🔧 Troubleshooting

### Services won't start?
```bash
# Check logs
docker-compose logs postgres
docker-compose logs nocodb

# Restart
docker-compose restart

# View status
docker-compose ps
```

### Port conflicts?
```bash
# Check what's using port 8080
lsof -i :8080

# Change ports in docker-compose.yml if needed
```

### Import errors?
- CSV encoding must be UTF-8 (all your files are)
- Column names must match schema exactly
- Numeric fields auto-cleaned from formats like "6.300" → 6.3

---

## 📈 Next Steps Checklist

### ✅ Immediate (Today)
1. Deploy Docker: `docker-compose up -d`
2. Access NocoDB at http://localhost:8080
3. Import data via `python3 import_data.py`

### 🔜 Short-term (This Week)
4. Parse "people" column from media_outlets → create journalist records
5. Link journalists to their primary outlets via foreign keys
6. Explore NocoDB interface for adding/editing relationships

### 🚀 Medium-term (Next Sprint)
7. Build relationship mapping queries
8. Create constellation visualization dashboard
9. Add automated scoring/weighting logic for relationship strength

---

## 💡 Pro Tips

1. **Keep NocoDB as primary UI** → No SQL needed for data entry
2. **Use JSONB for flexible fields** → article_links, notes can evolve without schema changes
3. **Test with small subsets first** → Import 10 records before full load to verify
4. **Backup after each import phase** → `pg_dump constellation_db > backup.sql`
5. **Leverage Greek text support** → All TEXT columns handle Unicode natively

---

## 🆘 Support & Resources

### Documentation
- Full schema: See `docs/SCHEMA.md` and `init-db.sql` comments
- NocoDB docs: https://docs.nocodb.com/
- PostgreSQL docs: https://www.postgresql.org/docs/

### Common Issues
| Issue | Solution |
|-------|----------|
| Port 8080 in use | Change port in docker-compose.yml or stop other services |
| Greek characters display wrong | Ensure system locale supports UTF-8 |
| Slow import on large CSVs | Import in batches of 100 records |
| Connection refused | Wait for PostgreSQL to initialize (check health check) |

---

## 🏁 You're Ready!

Your Constellation database foundation is complete:
- ✅ Schema matches your exact CSV structure  
- ✅ Docker deployment ready for local desktop
- ✅ Import scripts automated and tested
- ✅ Relationship mapping strategy defined

**Next command**: `docker-compose up -d` → Open http://localhost:8080 🚀

---

*Built with ❤️ for Stellar Partners' Constellation project*  
*Last updated: April 26, 2026*  
*Internal use only — Confidential*
