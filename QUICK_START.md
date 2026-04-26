# CONSTELLATION Database - Quick Deployment Guide

## ✅ What You Have

Your existing Baserow database with 3 core tables:
1. **Media Outlets** (252 records) - Greek/European media outlets with progressive scores
2. **Journalists** (110 records) - Journalists linked to media outlets  
3. **Organizations** (NGOs from master.csv) - ~803 NGOs

## 🚀 Deploy to Your Desktop (5 Minutes)

### Step 1: Start Docker Services

```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Code/Stellar\ Databases

# Build and start all services
docker-compose up -d

# Verify they're running
docker-compose ps
```

### Step 2: Access the Interface

- **NocoDB UI**: http://localhost:8080
  - Login with admin password: `admin123`
  
- **Direct SQL** (optional): http://localhost:8081 (Adminer)

### Step 3: Import Your Data

#### Option A: Manual CSV Import via NocoDB UI

1. Open http://localhost:8080
2. Click "Import" → Upload your CSV files:
   - `export - Media - Grid view.csv` → Maps to `media_outlets` table
   - `export - Journalists - Grid view.csv` → Maps to `journalists` table  
   - NGO master.csv → Maps to `organizations` table

3. NocoDB will auto-detect columns and create matching tables

#### Option B: Direct SQL Import (Advanced)

```bash
# Connect to PostgreSQL
docker exec -it constellation-postgres psql -U constellation_user -d constellation_db

# Import media outlets
\COPY media_outlets(id, name, website, progressive_score, combined_score, ...) 
  FROM '/path/to/export - Media - Grid view.csv' WITH (FORMAT csv);

# Import journalists  
\COPY journalists(id, name, media_outlet_name, article_links, ...)
  FROM '/path/to/export - Journalists - Grid view.csv' WITH (FORMAT csv);

\q
```

## 📊 Your Data Structure

### Media Outlets Table (252 records)
- **Key fields**: id, Name, Website, progressive_score, combined_score, eu_coverage_score
- **Special columns**: 
  - `people` (comma-separated journalist names)
  - `description_greek` (Greek text descriptions)
  - Scoring metrics for progressive/EU coverage analysis

### Journalists Table (110 records)  
- **Key fields**: id, Name, Media outlet, Primary Beat, Articles
- **Special columns**: 
  - `article_links` (JSON array of article URLs)
  - Notes with evaluation text ("Not a great fit", etc.)

### Organizations Table (~803 NGOs)
- Standard NGO data: name, website, email, category, country, social media links

## 🔗 Building the "Constellation Lines"

Now that you have the base layers, here's how to map relationships:

### 1. Link Journalists to Media Outlets
```sql
-- Add a foreign key relationship
ALTER TABLE journalists 
ADD COLUMN primary_outlet_id VARCHAR(20) REFERENCES media_outlets(id);
```

### 2. Map People Column (from media outlets) to Journalists
The `people` column in media_outlets contains journalist names like:
> "Τάσος Σαραντής,Κώστας Ζαφειρόπουλος,Μαρία Ψαρά"

You can parse this and create relationships automatically.

### 3. Create Organization-Media Relations
Track which NGOs are covered by which media outlets:
```sql
INSERT INTO organization_media_relations (organization_id, media_outlet_id, relation_type)
VALUES ('ORG001', 'MEDIA162', 'covered_by');
```

## 🎯 Next Steps

1. **Deploy the Docker setup** → Get NocoDB running locally
2. **Import your CSV files** → Load existing data into PostgreSQL  
3. **Create relationship mappings** → Connect journalists to outlets, orgs to media
4. **Build constellation queries** → Find patterns across the network

## 📁 Files Created

- `docker-compose.yml` - Docker service definitions
- `init-db.sql` - PostgreSQL schema (matches your exact CSV structure)
- `README.md` - Full documentation
- `QUICK_START.md` - This guide

## 💡 Pro Tips

1. **Keep NocoDB as UI** → It's perfect for adding/editing data without SQL
2. **Use JSONB for flexible fields** → Your article_links and notes are stored as JSON/text for flexibility
3. **Greek text support** → All TEXT columns handle Greek characters natively
4. **Scoring metrics** → progressive_score, combined_score indexed for fast filtering

## 🆘 Troubleshooting

```bash
# Check service status
docker-compose ps

# View logs if something fails
docker-compose logs postgres
docker-compose logs nocodb

# Restart services
docker-compose restart

# Backup your data
docker exec constellation-postgres pg_dump constellation_db > backup.sql
```

---

**Ready to deploy?** Run `docker-compose up -d` and open http://localhost:8080! 🚀
