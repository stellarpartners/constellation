# CONSTELLATION Database Project - Complete Setup Summary

## 🎯 What We Built

A PostgreSQL-based database system for managing relationships between **NGOs**, **media outlets**, and **journalists** — exactly matching your existing Baserow/GOPA ECI data structure.

### Core Philosophy
- **3 Separate Tables**: organizations, media_outlets, journalists (not unified)
- **6-7 Adjacent Dimension Tables**: For campaigns, articles, relationships, contacts
- **"Constellation" Metaphor**: Data points become meaningful when patterns emerge from connections

---

## 📦 Files Created

| File | Purpose | Location |
|------|---------|----------|
| `docker-compose.yml` | Docker services (PostgreSQL + NocoDB) | Stellar Databases/ |
| `init-db.sql` | PostgreSQL schema (exact CSV match) | Stellar Databases/ |
| `import_data.py` | Automated CSV import script | Stellar Databases/ |
| `README.md` | Full documentation | Stellar Databases/ |
| `QUICK_START.md` | 5-minute deployment guide | Stellar Databases/ |

---

## 🚀 Deployment (3 Steps)

### Step 1: Start Services
```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Code/Stellar\ Databases
docker-compose up -d
```

### Step 2: Access Interface
- **NocoDB UI**: http://localhost:8080 (admin: admin123)
- **Direct SQL**: http://localhost:8081 (Adminer)

### Step 3: Import Data
```bash
# Option A: Automated import
python3 import_data.py

# Option B: Manual via NocoDB UI
# Upload CSV files through the web interface
```

---

## 📊 Your Exact Data Structure

### Media Outlets (252 records)
**Source**: `export - Media - Grid view.csv`

| Column | Type | Example |
|--------|------|---------|
| id | VARCHAR(20) | "162" |
| name | VARCHAR(255) | "Efsyn" |
| progressive_score | INTEGER | 3 |
| combined_score | INTEGER | 6 |
| people | TEXT | "Τάσος Σαραντής,Κώστας Ζαφειρόπουλος..." |
| topics | TEXT[] | ["food labels", "EU-Israel initiative"] |

### Journalists (110 records)
**Source**: `export - Journalists - Grid view.csv`

| Column | Type | Example |
|--------|------|---------|
| id | VARCHAR(20) | "3" |
| name | VARCHAR(255) | "* Newsroom *" or journalist names |
| article_links | JSONB | Array of URL objects |
| primary_beat | VARCHAR(100) | "Environment", "Economy" |

### Organizations (~803 NGOs)
**Source**: `master.csv` from SIMA/ngodb

Standard NGO fields: name, website, email, category, country, social media links.

---

## 🔗 Relationship Mapping Strategy

### Current State (Base Layers Built ✅)
- ✅ 3 core entity tables created
- ✅ All CSV columns mapped exactly
- ✅ Dimension tables ready for relationships

### Next Steps (Drawing the Lines)

#### 1. Journalist → Media Outlet Link
```sql
-- Add foreign key to link journalists to their primary outlet
ALTER TABLE journalists 
ADD COLUMN primary_outlet_id VARCHAR(20) REFERENCES media_outlets(id);

-- Update existing data (parse "Media" column)
UPDATE journalists 
SET primary_outlet_id = (
    SELECT id FROM media_outlets 
    WHERE LOWER(media_outlets.name) = LOWER(replace(journalists.media, ',', ' '))
);
```

#### 2. Parse "People" Column → Create Journalist Records
The `people` column in media_outlets contains journalist names:
> "Τάσος Σαραντής,Κώστας Ζαφειρόπουλος,Μαρία Ψαρά"

**Action**: Split by comma, create individual journalist records, link to their outlet.

#### 3. Organization-Media Relations Table
Track coverage relationships:
```sql
INSERT INTO organization_media_relations (organization_id, media_outlet_id, relation_type)
VALUES ('ORG001', 'MEDIA162', 'covered_by');
```

---

## 🎨 Constellation Visualization Ideas

### Layer 1: Direct Connections
- Journalist → Media Outlet (primary affiliation)
- Article → Journalist + Outlet (publication relationship)

### Layer 2: Indirect Patterns  
- NGO covered by multiple outlets → "coverage constellation"
- Journalists covering same NGOs across different outlets → "advocacy network"

### Layer 3: Weighted Relationships
- Frequency of coverage (how often outlet mentions NGO)
- Recency (last interaction date)
- Sentiment/progressive score alignment

---

## 🔧 Technical Details

### Database Schema Highlights

**Core Tables**:
- `media_outlets` - 252 records with scoring metrics
- `journalists` - 110 records with article links as JSONB
- `organizations` - ~803 NGOs from master.csv

**Dimension Tables**:
- `organization_contacts` - Multiple contact points per org
- `organization_campaigns` - Active NGO campaigns  
- `media_articles` - Content published by outlets
- `journalist_articles` - Articles written by journalists
- `organization_media_relations` - Org-media connections
- `journalist_organization_relations` - Journalist-NGO interactions

**Performance**:
- Indexed on: name, category, country, scores, beats
- UUID primary keys for all tables
- JSONB support for flexible article data

---

## 📈 Data Migration Path

### Phase 1: Base Import ✅ (Ready to Deploy)
1. Load media_outlets.csv → media_outlets table
2. Load journalists.csv → journalists table  
3. Load master.csv → organizations table

### Phase 2: Relationship Mapping (Next Steps)
4. Parse "people" column → create journalist records
5. Link journalists to their primary outlets
6. Map article_links from journalists to media_articles

### Phase 3: Constellation Building (Future)
7. Create organization_media_relations entries
8. Build journalist_organization_relations  
9. Add scoring/weighting for relationship strength

---

## 🛠️ Tools & Technologies

- **Database**: PostgreSQL 15 (Alpine, lightweight Docker image)
- **UI Layer**: NocoDB (no-code database interface)
- **Deployment**: Docker Compose (local on your desktop via Insync)
- **Import Script**: Python 3 (CSV parsing with csv.DictReader)

---

## 🎯 Why This Architecture Works

1. **Separate Tables** → Different behaviors for each entity type
2. **JSONB Flexibility** → Article links and notes can be complex/unstructured
3. **Scoring Metrics Indexed** → Fast filtering by progressive_score, combined_score
4. **Greek Text Support** → All TEXT columns handle Unicode natively
5. **Local Deployment** → Full control on your desktop, no cloud dependencies

---

## 📝 Next Actions

### Immediate (Today)
1. ✅ Deploy Docker: `docker-compose up -d`
2. ✅ Access NocoDB at http://localhost:8080
3. ✅ Import data via `python3 import_data.py` or manual CSV upload

### Short-term (This Week)
4. Parse "people" column from media_outlets → create journalist records
5. Link journalists to their primary outlets via foreign keys
6. Explore NocoDB interface for adding/editing relationships

### Medium-term (Next Sprint)
7. Build relationship mapping queries
8. Create constellation visualization dashboard
9. Add automated scoring/weighting logic

---

## 💡 Pro Tips

1. **Keep NocoDB as primary UI** → No SQL needed for data entry
2. **Use JSONB for flexible fields** → article_links, notes can evolve
3. **Test with small subsets first** → Import 10 records before full load
4. **Backup after each import phase** → `pg_dump constellation_db > backup.sql`

---

## 🆘 Support & Troubleshooting

### Services won't start?
```bash
docker-compose logs postgres
docker-compose logs nocodb
```

### Can't access NocoDB?
- Check port 8080: `lsof -i :8080`
- Restart: `docker-compose restart`

### Import errors?
- CSV encoding is UTF-8 (already handled in script)
- Column names must match schema exactly
- Numeric fields auto-cleaned from strings like "6.300" → 6.3

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
