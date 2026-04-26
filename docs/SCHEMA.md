# CONSTELLATION Database Schema Documentation

**Stellar Partners Internal Project**  
*Complete technical specification for all database tables, fields, and relationships*

---

## 📋 Table of Contents

1. [Core Tables](#core-tables)
   - [media_outlets](#media_outlets)
   - [journalists](#journalists)
   - [organizations](#organizations)
2. [Dimension Tables](#dimension-tables)
3. [Indexes & Performance](#indexes--performance)
4. [Data Types & Constraints](#data-types--constraints)

---

## Core Tables

### media_outlets

Stores comprehensive information about Greek and international media outlets covering EU-related topics.

#### Table Definition

```sql
CREATE TABLE media_outlets (
    id VARCHAR(20) PRIMARY KEY,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    
    -- Scoring Metrics (Indexed for Fast Filtering)
    progressive_score INTEGER DEFAULT 0,
    combined_score INTEGER DEFAULT 0,
    eu_coverage_score INTEGER DEFAULT 0,
    
    -- Classification & Topics
    geographical_level VARCHAR(50),  -- national, regional, local, international
    topics TEXT[],  -- Array of topic tags (e.g., {'food labels', 'EU-Israel initiative'})
    
    -- People Column (Temporary - to be parsed into individual journalist records)
    people TEXT,  -- Comma-separated: "Τάσος Σαραντής,Κώστας Ζαφειρόπουλος,Μαρία Ψαρά"
    
    -- Social Media Handles
    facebook VARCHAR(255),  -- Facebook page URL
    twitter_handle VARCHAR(100),  -- @handle without @ symbol
    instagram_handle VARCHAR(100),  -- handle without @ symbol
    linkedin_url VARCHAR(255),  -- LinkedIn company/page URL
    youtube_channel VARCHAR(255),  -- YouTube channel URL
    
    -- Descriptive Fields
    description_greek TEXT,  -- Description in Greek language
    notes TEXT  -- Additional notes and observations
    
);
```

#### Field Details

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | VARCHAR(20) | Yes | - | Primary key, format: "MEDIA###" (e.g., "MEDIA162") |
| name | VARCHAR(255) | Yes | - | Media outlet name in Greek/English |
| website | VARCHAR(255) | No | NULL | Official website URL |
| progressive_score | INTEGER | No | 0 | Progressive score (higher = more progressive, range: 0-10) |
| combined_score | INTEGER | No | 0 | Combined scoring metric (range: 0-10) |
| eu_coverage_score | INTEGER | No | 0 | EU coverage emphasis score (range: 0-10) |
| geographical_level | VARCHAR(50) | No | NULL | Classification: national, regional, local, international |
| topics | TEXT[] | No | {} | Array of topic tags for classification |
| people | TEXT | No | NULL | Comma-separated journalist names (needs parsing) |
| facebook | VARCHAR(255) | No | NULL | Facebook page URL |
| twitter_handle | VARCHAR(100) | No | NULL | Twitter/X handle (without @) |
| instagram_handle | VARCHAR(100) | No | NULL | Instagram handle (without @) |
| linkedin_url | VARCHAR(255) | No | NULL | LinkedIn company/page URL |
| youtube_channel | VARCHAR(255) | No | NULL | YouTube channel URL |
| description_greek | TEXT | No | NULL | Description in Greek language |
| notes | TEXT | No | NULL | Additional notes and observations |

#### Indexes

```sql
-- Performance indexes for common query patterns
CREATE INDEX idx_media_progressive ON media_outlets(progressive_score);
CREATE INDEX idx_media_combined ON media_outlets(combined_score);
CREATE INDEX idx_media_eu_coverage ON media_outlets(eu_coverage_score);
CREATE INDEX idx_media_topics ON media_outlets USING GIN(topics);
CREATE INDEX idx_media_geographical ON media_outlets(geographical_level);
```

#### Example Records

```sql
-- High-scoring progressive outlet
INSERT INTO media_outlets VALUES (
    'MEDIA162',  -- id
    'Efsyn',     -- name
    'https://www.efsyn.gr',  -- website
    6,           -- progressive_score (high)
    6,           -- combined_score
    7,           -- eu_coverage_score
    'national',  -- geographical_level
    {'food labels', 'EU-Israel initiative'},  -- topics[]
    'Τάσος Σαραντής,Κώστας Ζαφειρόπουλος',  -- people (to be parsed)
    'https://www.facebook.com/efsyn',
    'efsyn',
    NULL,
    'https://www.linkedin.com/company/efsyn',
    NULL,
    'Leading progressive Greek media outlet with strong EU coverage focus',
    'Known for investigative journalism on corporate accountability'
);

-- Regional outlet
INSERT INTO media_outlets VALUES (
    'MEDIA089',
    'Kathimerini',
    'https://www.kathimerini.gr',
    5,
    4,
    6,
    'national',
    {'economy', 'politics'},
    NULL,
    NULL,
    'kathemerini',
    'kathimerini_tv',
    'https://www.linkedin.com/company/kathimerini',
    NULL,
    'Major business and political daily',
    NULL
);
```

---

### journalists

Individual journalist profiles with article links and expertise classification.

#### Table Definition

```sql
CREATE TABLE journalists (
    id VARCHAR(20) PRIMARY KEY,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    
    -- Relationship to Media Outlet (Phase 1 - to be implemented)
    primary_outlet_id VARCHAR(20) REFERENCES media_outlets(id),
    
    -- Flexible Article Storage as JSONB
    article_links JSONB DEFAULT '[]'::jsonb,
    
    -- Expertise Classification
    primary_beat VARCHAR(100),  -- Environment, Economy, Politics, etc.
    
    -- Social Media & Contact
    twitter_handle VARCHAR(100),
    linkedin_url VARCHAR(255),
    channel VARCHAR(100),  -- YouTube/Twitch/etc. channel
    
    -- Additional Notes
    notes TEXT
);
```

#### Field Details

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | VARCHAR(20) | Yes | - | Primary key, format: "JOUR###" (e.g., "JOUR3") |
| name | VARCHAR(255) | Yes | - | Journalist name in Greek/English |
| primary_outlet_id | VARCHAR(20) | No | NULL | Foreign key to media_outlets.id |
| article_links | JSONB | No | '[]' | Array of article objects with url, title, source, date |
| primary_beat | VARCHAR(100) | No | NULL | Area of expertise (Environment, Economy, etc.) |
| twitter_handle | VARCHAR(100) | No | NULL | Twitter/X handle |
| linkedin_url | VARCHAR(255) | No | NULL | LinkedIn profile URL |
| channel | VARCHAR(100) | No | NULL | YouTube/Twitch/etc. channel name |
| notes | TEXT | No | NULL | Additional notes and observations |

#### article_links JSONB Structure

```json
[
  {
    "url": "https://example.com/article-1",
    "title": "Title of the Article in Greek",
    "source": "Efsyn",
    "date": "2024-03-15",
    "topics": ["environment", "eu-policy"],
    "snippet": "Brief excerpt from article..."
  },
  {
    "url": "https://example.com/article-2",
    "title": "Another Article Title",
    "source": "Kathimerini",
    "date": "2024-03-20",
    "topics": ["economy"],
    "snippet": ""
  }
]
```

#### Indexes

```sql
CREATE INDEX idx_journalists_beat ON journalists(primary_beat);
CREATE INDEX idx_journalists_outlet ON journalists(primary_outlet_id);
CREATE INDEX idx_journalists_name ON journalists USING GIN(name);  -- Full-text search
```

#### Example Record

```json
{
  "id": "JOUR3",
  "name": "* Newsroom *",
  "primary_outlet_id": "MEDIA162",
  "article_links": [
    {
      "url": "https://www.efsyn.gr/environment/article-1",
      "title": "Environmental Policy Update",
      "source": "Efsyn",
      "date": "2024-03-15"
    }
  ],
  "primary_beat": "Environment",
  "twitter_handle": "newsroom_example",
  "linkedin_url": "https://www.linkedin.com/in/newsroom-example",
  "channel": "newsroom_tv",
  "notes": "Primary contact for environmental policy stories"
}
```

---

### organizations

Non-governmental organization records with exact matching to SIMA master.csv structure.

#### Table Definition

```sql
CREATE TABLE organizations (
    id VARCHAR(20) PRIMARY KEY,
    
    -- Basic Information
    company_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    
    -- Classification (Greek)
    category VARCHAR(100),  -- e.g., "Φιλοζωία" = Animal Welfare
    
    -- Social Media Across All Platforms
    facebook_page VARCHAR(255),
    linkedin_url VARCHAR(255),
    instagram_handle VARCHAR(100),
    youtube_channel VARCHAR(255),
    twitter_handle VARCHAR(100),
    tiktok_handle VARCHAR(100),
    
    -- Platform Integration URLs
    youbehero_url VARCHAR(255),  -- YouBeHero campaign platform
    desmos_name VARCHAR(100),     -- Desmos petition name
    acf_name VARCHAR(100),        -- ACF (Action by Citizens) name
    ngoheroes_name VARCHAR(100),  -- NGO Heroes profile
    social_dynamo_url VARCHAR(255),  -- Social Dynamo platform
    ethelon_url VARCHAR(255),     -- Ethelon platform
    
    -- External Integrations
    hubspot_company_id VARCHAR(100),
    
    -- Metadata & Status
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50)  -- active, inactive, pending_verification
);
```

#### Field Details

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | VARCHAR(20) | Yes | - | Primary key, format: "ORG###" (e.g., "ORG162") |
| company_name | VARCHAR(255) | Yes | - | Organization name in Greek/English |
| website | VARCHAR(255) | No | NULL | Official website URL |
| email | VARCHAR(100) | No | NULL | Contact email address |
| phone | VARCHAR(20) | No | NULL | Phone number |
| address | TEXT | No | NULL | Full street address |
| city | VARCHAR(100) | No | NULL | City location |
| category | VARCHAR(100) | No | NULL | Classification (Κατηγορία): Φιλοζωία, Περιβάλλον, etc. |
| facebook_page | VARCHAR(255) | No | NULL | Facebook page URL |
| linkedin_url | VARCHAR(255) | No | NULL | LinkedIn company/page URL |
| instagram_handle | VARCHAR(100) | No | NULL | Instagram handle |
| youtube_channel | VARCHAR(255) | No | NULL | YouTube channel URL |
| twitter_handle | VARCHAR(100) | No | NULL | Twitter/X handle |
| tiktok_handle | VARCHAR(100) | No | NULL | TikTok handle |
| youbehero_url | VARCHAR(255) | No | NULL | YouBeHero campaign URL |
| desmos_name | VARCHAR(100) | No | NULL | Desmos petition name |
| acf_name | VARCHAR(100) | No | NULL | ACF organization name |
| ngoheroes_name | VARCHAR(100) | No | NULL | NGO Heroes profile name |
| social_dynamo_url | VARCHAR(255) | No | NULL | Social Dynamo platform URL |
| ethelon_url | VARCHAR(255) | No | NULL | Ethelon platform URL |
| hubspot_company_id | VARCHAR(100) | No | NULL | HubSpot CRM company ID |
| last_modified | TIMESTAMP | No | NOW() | Last update timestamp |
| status | VARCHAR(50) | No | 'active' | Data quality status |

#### Indexes

```sql
CREATE INDEX idx_org_category ON organizations(category);
CREATE INDEX idx_org_city ON organizations(city);
CREATE INDEX idx_org_status ON organizations(status);
CREATE INDEX idx_org_email ON organizations(email);
CREATE INDEX idx_org_website ON organizations(website);
```

#### Example Record

```json
{
  "id": "ORG162",
  "company_name": "Ελληνικός Σύλλογος Προστασίας Ιπποειδών",
  "website": "https://www.example.org",
  "email": "info@example.org",
  "phone": "+30 210 1234567",
  "address": "123 Example Street",
  "city": "Athens",
  "category": "Φιλοζωία",
  "facebook_page": "https://www.facebook.com/exampleorg",
  "linkedin_url": "https://www.linkedin.com/company/exampleorg",
  "instagram_handle": "exampleorg_gr",
  "youtube_channel": "ExampleOrg TV",
  "twitter_handle": "exampleorg",
  "tiktok_handle": "exampleorg",
  "youbehero_url": "https://youbehero.org/campaign/123",
  "desmos_name": "Save Horses Campaign",
  "acf_name": "Example ACF Org",
  "ngoheroes_name": "Example NGO Heroes",
  "social_dynamo_url": "https://socialdynamo.org/org/456",
  "ethelon_url": "https://ethelon.org/org/789",
  "hubspot_company_id": "60123456789",
  "last_modified": "2024-04-20T10:30:00Z",
  "status": "active"
}
```

---

## Dimension Tables

### organization_media_relations

Tracks relationships between NGOs and media outlets (coverage, partnerships).

#### Table Definition

```sql
CREATE TABLE organization_media_relations (
    id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    organization_id VARCHAR(20) REFERENCES organizations(id),
    media_outlet_id VARCHAR(20) REFERENCES media_outlets(id),
    
    -- Relationship Classification
    relation_type VARCHAR(50) NOT NULL,  -- covered_by, partners_with, interviewed, sponsored
    
    -- Context & Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Composite unique constraint to prevent duplicate relationships
CREATE UNIQUE INDEX idx_omr_unique ON organization_media_relations(organization_id, media_outlet_id, relation_type);
```

#### Example Records

```sql
-- NGO covered by media outlet
INSERT INTO organization_media_relations VALUES (
    NULL,  -- id (auto-generated)
    'ORG162',  -- organization_id
    'MEDIA162',  -- media_outlet_id
    'covered_by',  -- relation_type
    'Regular coverage on EU animal welfare policy',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- NGO partners with media outlet
INSERT INTO organization_media_relations VALUES (
    NULL,
    'ORG089',
    'MEDIA045',
    'partners_with',
    'Joint campaign 2024 on sustainable agriculture',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

---

### journalist_organization_relations

Tracks advocacy and consultation relationships between journalists and NGOs.

#### Table Definition

```sql
CREATE TABLE journalist_organization_relations (
    id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    journalist_id VARCHAR(20) REFERENCES journalists(id),
    organization_id VARCHAR(20) REFERENCES organizations(id),
    
    -- Relationship Classification
    relation_type VARCHAR(50) NOT NULL,  -- advocates_for, interviewed, consulted_by, featured_in
    
    -- Context & Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Composite unique constraint
CREATE UNIQUE INDEX idx_jor_unique ON journalist_organization_relations(journalist_id, organization_id, relation_type);
```

#### Example Records

```sql
-- Journalist advocates for NGO
INSERT INTO journalist_organization_relations VALUES (
    NULL,
    'JOUR3',  -- journalist_id
    'ORG162',  -- organization_id
    'advocates_for',
    'Regular interviews and articles on horse protection',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Journalist consulted by NGO as expert source
INSERT INTO journalist_organization_relations VALUES (
    NULL,
    'JOUR75',
    'ORG228',
    'consulted_by',
    'Expert source on environmental policy',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

---

## Indexes & Performance

### Current Index Strategy

#### Core Tables

**media_outlets:**
- B-tree indexes on scoring columns (progressive_score, combined_score, eu_coverage_score)
- GIN index on topics[] array field for efficient multi-topic queries
- B-tree index on geographical_level for filtering by outlet type

**journalists:**
- B-tree index on primary_beat for expertise-based filtering
- B-tree index on primary_outlet_id for journalist-outlet relationship queries
- GIN index on name column for full-text search capabilities

**organizations:**
- B-tree indexes on category, city, status for common filtering patterns
- B-tree indexes on email and website for contact lookups

#### Dimension Tables

**organization_media_relations:**
- B-tree indexes on organization_id and media_outlet_id for join operations
- B-tree index on relation_type for relationship-type filtering
- Composite unique index to prevent duplicate relationships

**journalist_organization_relations:**
- B-tree indexes on journalist_id and organization_id
- B-tree index on relation_type
- Composite unique index for data integrity

### Performance Optimization Guidelines

1. **Query Pattern Analysis**: Monitor slow queries with `EXPLAIN ANALYZE`
2. **Partial Indexes**: Consider for filtered datasets (e.g., active organizations only)
3. **Materialized Views**: For complex constellation pattern calculations
4. **Connection Pooling**: Implement if multiple concurrent users added
5. **Regular Vacuum**: Run `VACUUM` periodically to maintain index performance

---

## Data Types & Constraints

### String Lengths Rationale

- **VARCHAR(20)** for IDs: Sufficient for "MEDIA###", "JOUR###", "ORG###" format
- **VARCHAR(255)** for names/URLs: Standard web length, covers most cases
- **VARCHAR(100)** for handles: Twitter/Instagram handle limits typically 30-30 chars
- **TEXT** for descriptions/notes: Unlimited length for flexible content

### Numeric Constraints

- **Scoring columns (INTEGER)**: Range 0-10 based on scoring methodology
- Can be extended to larger ranges if needed without schema changes

### Greek Text Support

All TEXT and VARCHAR fields support UTF-8 encoding natively. No special configuration needed as PostgreSQL handles Unicode characters correctly by default.

---

## Schema Evolution History

### Version 1.0 (Current)
- Initial schema with 3 core tables
- Basic indexing strategy
- JSONB for flexible article storage
- Dimension tables defined but empty

### Future Versions (Planned)
- **v1.1**: Add journalist-outlet foreign key relationships
- **v1.2**: Add relationship dimension tables with sample data
- **v1.3**: Add scoring algorithms and weighted relationship calculations
- **v2.0**: Consider partitioning for large datasets (>1M records)

---

*Last updated: April 26, 2026*  
*Stellar Partners Internal Use Only — Confidential*
