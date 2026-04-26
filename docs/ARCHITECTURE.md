# CONSTELLATION System Architecture

**Stellar Partners Internal Project**  
*Technical architecture and design decisions for the NGO-Media-Journalist relationship database*

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Constellation Database System             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐│
│  │   PostgreSQL │────▶│    NocoDB    │◀───▶│   Adminer    ││
│  │   (Database) │     │  (UI Layer)  │     │(Direct SQL)  ││
│  └──────────────┘     └──────────────┘     └──────────────┘│
│           ▲                    ▲                    ▲       │
│           │                    │                    │       │
│   Data Storage                  UI/UX              Query    │
│   & Relationships               Interface          Tool      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **PostgreSQL 15** - Relational database storing all entity data and relationships
2. **NocoDB** - No-code interface for data entry, editing, and relationship management
3. **Adminer** (optional) - Direct SQL access for advanced users and debugging

---

## 🎯 Design Philosophy

### 1. Separate Tables Over Unified Model

**Decision:** Three distinct tables (organizations, media_outlets, journalists) rather than unified entity model.

**Rationale:**
- Different behaviors needed for each entity type
- NGOs have category classifications, scoring metrics differ from journalists
- Media outlets need progressive scores; journalists need article link storage
- Easier to query and filter by entity-specific criteria
- More flexible schema evolution per table type

### 2. Local Desktop Deployment

**Decision:** Full deployment on user's desktop via Docker, no cloud dependencies.

**Rationale:**
- Complete data sovereignty and privacy
- No internet required for operations
- Full control over security and access
- Cost-effective (no hosting fees)
- Works offline in any environment with Docker

### 3. NocoDB as Primary UI

**Decision:** Use NocoDB's no-code interface instead of direct SQL queries for routine operations.

**Rationale:**
- Lower barrier to entry for non-technical users
- Visual relationship mapping without SQL knowledge
- Built-in data validation and constraints
- Faster data entry through forms vs. manual SQL INSERTs
- Consistent user experience across different tasks

### 4. JSONB for Flexible Fields

**Decision:** Store article_links and notes as JSONB arrays instead of normalized tables.

**Rationale:**
- Article structure varies widely (different outlets, formats, sources)
- Schema changes less frequent than data updates
- Faster reads for complex nested structures
- Easier to import/export from CSV/JSON sources
- PostgreSQL JSONB provides indexing and querying capabilities

### 5. Scoring Metrics Indexed

**Decision:** Index progressive_score, combined_score, eu_coverage_score columns.

**Rationale:**
- Frequent filtering by score thresholds
- Fast pattern discovery queries
- Enables "constellation" visualization (high-score outlets/NGOs)
- Performance optimization for common query patterns

---

## 🗄️ Database Schema Design

### Core Entity Tables

#### media_outlets Table
```sql
CREATE TABLE media_outlets (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255),
    website VARCHAR(255),
    
    -- Scoring metrics (indexed for fast filtering)
    progressive_score INTEGER,
    combined_score INTEGER,
    eu_coverage_score INTEGER,
    
    -- Classification
    geographical_level VARCHAR(50),
    topics TEXT[],
    
    -- People column (needs parsing into individual journalist records)
    people TEXT,  -- Comma-separated: "Τάσος Σαραντής,Κώστας Ζαφειρόπουλος"
    
    -- Social media handles
    facebook VARCHAR(255),
    twitter_handle VARCHAR(100),
    instagram_handle VARCHAR(100),
    linkedin_url VARCHAR(255),
    youtube_channel VARCHAR(255),
    
    description_greek TEXT,
    notes TEXT
);

-- Indexes for common queries
CREATE INDEX idx_media_progressive ON media_outlets(progressive_score);
CREATE INDEX idx_media_combined ON media_outlets(combined_score);
CREATE INDEX idx_media_topics ON media_outlets USING GIN(topics);
```

**Design Rationale:**
- Separate scoring columns enable different filtering strategies
- Array field (topics[]) allows multi-topic classification
- Comma-separated "people" column is a temporary structure for easy CSV import, will be parsed into individual journalist records later

#### journalists Table
```sql
CREATE TABLE journalists (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255),
    
    -- Link to primary media outlet (to be added in Phase 1)
    primary_outlet_id VARCHAR(20) REFERENCES media_outlets(id),
    
    -- Flexible article storage as JSONB
    article_links JSONB,  -- Array of objects: {url, title, source, date}
    
    -- Expertise classification
    primary_beat VARCHAR(100),
    
    -- Social media and contact info
    twitter_handle VARCHAR(100),
    linkedin_url VARCHAR(255),
    channel VARCHAR(100),
    
    notes TEXT
);

-- Indexes
CREATE INDEX idx_journalists_beat ON journalists(primary_beat);
CREATE INDEX idx_journalists_outlet ON journalists(primary_outlet_id);
```

**Design Rationale:**
- JSONB for article_links accommodates diverse article structures without schema changes
- Foreign key relationship to media_outlets enables "journalist → outlet" constellation lines
- Primary beat classification enables filtering by expertise area

#### organizations Table
```sql
CREATE TABLE organizations (
    id VARCHAR(20) PRIMARY KEY,
    
    -- Basic info
    company_name VARCHAR(255),
    website VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    
    -- Classification (Greek)
    category VARCHAR(100),  -- e.g., "Φιλοζωία" = Animal Welfare
    
    -- Social media across all platforms
    facebook_page VARCHAR(255),
    linkedin_url VARCHAR(255),
    instagram_handle VARCHAR(100),
    youtube_channel VARCHAR(255),
    twitter_handle VARCHAR(100),
    tiktok_handle VARCHAR(100),
    
    -- Platform integration URLs
    youbehero_url VARCHAR(255),
    desmos_name VARCHAR(100),
    acf_name VARCHAR(100),
    ngoheroes_name VARCHAR(100),
    social_dynamo_url VARCHAR(255),
    ethelon_url VARCHAR(255),
    
    -- External integrations
    hubspot_company_id VARCHAR(100),
    
    -- Metadata
    last_modified TIMESTAMP,
    status VARCHAR(50)  -- active, inactive, pending_verification
    
);

-- Indexes
CREATE INDEX idx_org_category ON organizations(category);
CREATE INDEX idx_org_city ON organizations(city);
CREATE INDEX idx_org_status ON organizations(status);
```

**Design Rationale:**
- Exact match with SIMA master.csv columns for seamless data import
- Category field enables sector-based filtering (Animal Welfare, Environment, Human Rights, etc.)
- Platform integration URLs enable direct access to NGO tools and dashboards
- Status field allows data quality management

### Dimension Tables (Relationships)

#### organization_media_relations Table
```sql
CREATE TABLE organization_media_relations (
    id SERIAL PRIMARY KEY,
    organization_id VARCHAR(20) REFERENCES organizations(id),
    media_outlet_id VARCHAR(20) REFERENCES media_outlets(id),
    
    -- Relationship type classification
    relation_type VARCHAR(50),  -- covered_by, partners_with, interviewed, sponsored
    
    -- Context and notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    
);

-- Indexes for constellation queries
CREATE INDEX idx_omr_org ON organization_media_relations(organization_id);
CREATE INDEX idx_omr_media ON organization_media_relations(media_outlet_id);
CREATE INDEX idx_omr_type ON organization_media_relations(relation_type);
```

**Design Rationale:**
- Many-to-many relationship between organizations and media outlets
- Relation type enables filtering by interaction nature (coverage vs. partnership)
- Timestamps enable temporal analysis of coverage patterns

#### journalist_organization_relations Table
```sql
CREATE TABLE journalist_organization_relations (
    id SERIAL PRIMARY KEY,
    journalist_id VARCHAR(20) REFERENCES journalists(id),
    organization_id VARCHAR(20) REFERENCES organizations(id),
    
    -- Relationship type classification
    relation_type VARCHAR(50),  -- advocates_for, interviewed, consulted_by, featured_in
    
    -- Context and notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    
);

-- Indexes
CREATE INDEX idx_jor_journalist ON journalist_organization_relations(journalist_id);
CREATE INDEX idx_jor_org ON journalist_organization_relations(organization_id);
CREATE INDEX idx_jor_type ON journalist_organization_relations(relation_type);
```

**Design Rationale:**
- Tracks advocacy and consultation relationships between journalists and NGOs
- Enables "advocacy network" constellation visualization
- Supports analysis of which journalists cover which NGO sectors

---

## 🔗 Relationship Mapping Strategy

### Layer 1: Direct Connections (Easy)

These are straightforward one-to-one or many-to-one relationships:

```
Journalist ──(works for)──▶ Media Outlet
Article ──(written by)──▶ Journalist
Article ──(published in)──▶ Media Outlet
```

**Implementation:**
- Add foreign key columns (primary_outlet_id, etc.)
- Parse existing data from comma-separated fields
- Bulk update with SQL queries matching names

### Layer 2: Indirect Patterns (Medium)

These require joining multiple tables to discover patterns:

```
NGO ──(covered by)──▶ Media Outlet
Journalist ──(advocates for)──▶ NGO
Media Outlet ──(covers)──▶ NGO
```

**Implementation:**
- Create relationship tables (organization_media_relations, journalist_organization_relations)
- Query patterns across multiple joins
- Build visualization dashboards in NocoDB

### Layer 3: Weighted Relationships (Advanced)

These add scoring and weighting to relationships:

```
Relationship Strength = f(frequency, recency, sentiment, outlet_progressive_score)
```

**Implementation:**
- Add numeric fields for frequency counts
- Track timestamps for recency calculations
- Integrate progressive scores from media_outlets table
- Build algorithms for relationship strength scoring

---

## 📦 Data Import Strategy

### Phase 1: Base Layer Import (Complete)

Automated import of CSV files into core tables:

```bash
python3 import_data.py
```

**Process:**
1. Read CSV files from designated locations
2. Parse and clean data (handle Greek text, numeric formats)
3. Map columns to database schema exactly
4. Insert records with proper data types
5. Validate imports and report success/failure

### Phase 2: Relationship Parsing (In Progress)

Extract relationships from existing data structures:

**Task A: Parse "people" column**
- Split comma-separated journalist names in media_outlets.people
- Create individual journalist records for each name
- Link to their primary media outlet

**Task B: Match journalists to outlets**
- Compare journalist names with people column entries
- Create foreign key relationships
- Validate matches and handle ambiguities

### Phase 3: Manual Relationship Entry (Future)

Manual mapping of complex relationships through NocoDB UI:

- NGO-media coverage relationships
- Journalist-NGO advocacy connections
- Campaign participation records

---

## 🛠️ Technology Stack Choices

### PostgreSQL 15 (vs. MySQL, SQLite)

**Why PostgreSQL:**
- Superior JSONB support for flexible article storage
- Better array handling for topics[] and other multi-value fields
- Advanced indexing options (GIN indexes for arrays/JSONB)
- Stronger type system for data integrity
- Better Greek/Unicode text support
- More mature full-text search capabilities

### NocoDB (vs. Baserow, Airtable)

**Why NocoDB:**
- Self-hosted option (data sovereignty)
- PostgreSQL native support (no conversion needed)
- Open-source core (community edition free)
- Active development and Greek language support
- Docker-native deployment
- Lower resource requirements than Baserow

### Docker Deployment (vs. Bare Metal, VM)

**Why Docker:**
- Consistent environment across systems
- Easy startup/shutdown with single command
- Isolated dependencies (no system conflicts)
- Portable across Linux distributions
- Resource-efficient (shared kernel vs. full VM)
- Simple backup and restoration

---

## 🔒 Security Considerations

### Current Setup
- Local desktop deployment only (no external network exposure)
- Database credentials in `.env` file (not committed to Git)
- NocoDB admin password requires strong complexity

### Recommendations
1. **Git Ignore `.env`** - Never commit environment variables with passwords
2. **Regular Backups** - Daily database dumps stored securely
3. **Access Control** - NocoDB user roles for different permission levels
4. **Encryption at Rest** - Consider encrypting sensitive columns (emails, phone numbers)
5. **Audit Logging** - Track data modifications in NocoDB audit logs

---

## 📊 Performance Optimization

### Current Indexes
- Scoring metrics (progressive_score, combined_score, eu_coverage_score)
- Classification fields (category, city, primary_beat)
- Foreign keys (primary_outlet_id, organization_id, etc.)
- Array/JSONB fields (topics[], article_links) using GIN indexes

### Future Optimizations
1. **Partial Indexes** - For filtered queries (e.g., active organizations only)
2. **Materialized Views** - For complex constellation pattern calculations
3. **Connection Pooling** - If multiple concurrent users added
4. **Query Caching** - For frequently accessed dashboard data

---

## 🔄 Data Flow Diagram

```
CSV Files (Source Data)
       │
       ▼
┌───────────────────┐
│  import_data.py   │  ← Automated parsing and cleaning
└───────────────────┘
       │
       ▼
┌───────────────────┐
│   PostgreSQL DB   │  ← Core data storage
└───────────────────┘
       │
       ├──▶ NocoDB UI (Data Entry/Editing)
       │
       └──▶ Adminer (Direct SQL Access)
              │
              ▼
         Constellation Patterns & Insights
```

---

## 📈 Scalability Considerations

### Current Capacity
- **Media Outlets:** 252 records ✅
- **Journalists:** 110 records ✅
- **Organizations:** ~803 records ✅
- **Total:** ~1,165 core records + relationship data

### Growth Projections
- PostgreSQL handles millions of rows efficiently with proper indexing
- NocoDB UI may slow beyond 100k records (consider direct SQL for large datasets)
- Relationship tables could grow to 10k+ entries depending on mapping completeness

### Scaling Options
1. **Horizontal:** Add read replicas for query-heavy dashboards
2. **Vertical:** Increase PostgreSQL memory and CPU allocation
3. **Archival:** Move historical data to cold storage
4. **Partitioning:** Split large tables by category or time period

---

## 🧪 Testing Strategy

### Unit Tests
- CSV parsing correctness (Greek text, numeric formats)
- Column mapping accuracy
- Data type conversions

### Integration Tests
- Docker service startup and health checks
- Database connection and query execution
- NocoDB UI data synchronization

### User Acceptance Tests
- Data import completeness verification
- Relationship mapping accuracy
- Query result validation against source CSVs

---

## 📚 References & Documentation

### Internal Documents
- `docs/SCHEMA.md` - Detailed schema with all column definitions
- `docs/QUICK_START.md` - 5-minute deployment guide
- `docs/research/stellar-databases-research.md` - Research notes and ideas
- `README.md` - Main project documentation

### External Resources
- PostgreSQL docs: https://www.postgresql.org/docs/
- NocoDB docs: https://docs.nocodb.com/
- Docker best practices: https://docs.docker.com/engine/reference/best-practices/

---

*Last updated: April 26, 2026*  
*Stellar Partners Internal Use Only — Confidential*
