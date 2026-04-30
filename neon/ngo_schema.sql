-- ============================================================================
-- CONSTELLATION — NGO Schema for Neon PostgreSQL
-- Generated: 2026-04-30
-- Source: sima/ngodb/master.csv (801 NGOs) + 7 platform/audit CSV files
-- ============================================================================

-- ============================================================================
-- TABLE: ngos
-- Source: MASTER-ALL (2).csv / sima/ngodb/master.csv
-- 801 rows. Primary key: company_name (all unique).
-- Dates stored as raw strings — NEVER parsed or reinterpreted.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngos (
    id                  SERIAL PRIMARY KEY,
    company_name        VARCHAR(500) NOT NULL UNIQUE,
    slug                VARCHAR(500) UNIQUE,

    -- Static attributes from CSV
    category            VARCHAR(200),          -- Κατηγορία (Greek)
    email               VARCHAR(320),
    phone               VARCHAR(50),           -- from SIMA master.csv (col 29)
    address             VARCHAR(500),          -- Διεύθυνση
    city                VARCHAR(200),          -- Πόλη
    website             VARCHAR(500),          -- Website
    wordpress           VARCHAR(10),           -- 'Yes' or 'No' — stored as-is
    wordpress_url       VARCHAR(500),          -- WordPress field from CSV
    hubspot_id          VARCHAR(50),           -- HubSpot Company ID (nullable)
    last_modified_raw   VARCHAR(100),          -- '9/9/2024 11:33am' — stored as-is, not imported (old data)
    last_modified       TIMESTAMP,             -- proper TIMESTAMP col for future use when data is refreshed

    -- HubSpot / metadata
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ngos_category    ON ngos(category);
CREATE INDEX IF NOT EXISTS idx_ngos_wordpress   ON ngos(wordpress);
CREATE INDEX IF NOT EXISTS idx_ngos_slug        ON ngos(slug);
CREATE INDEX IF NOT EXISTS idx_ngos_hubspot     ON ngos(hubspot_id);


-- ============================================================================
-- TABLE: ngo_social_profiles
-- Social media presence per NGO. One row per (ngo, platform).
-- Platforms: facebook, linkedin, instagram, youtube, twitter, tiktok
-- Source: MASTER-ALL columns — social URLs extracted at import time.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_social_profiles (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE CASCADE,
    platform        VARCHAR(50) NOT NULL,        -- 'facebook', 'linkedin', etc.
    profile_url     VARCHAR(500),
    handle          VARCHAR(200),                -- future: @username
    notes           TEXT,                        -- future: follower counts, verification
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(ngo_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_nsp_ngo     ON ngo_social_profiles(ngo_id);
CREATE INDEX IF NOT EXISTS idx_nsp_platform ON ngo_social_profiles(platform);


-- ============================================================================
-- TABLE: website_audits
-- One-to-many: an NGO can have multiple audits over time.
-- Source: Website Audits-Grid view.csv (15 rows)
-- Note: 'scanDate' stored as raw string — e.g. 'March 1, 2024'
--       'f' (error_rate) stored as raw string — e.g. '4.4%', 'NaN'
--       'Name' (status note) stored as-is — e.g. 'Lost the domain name'
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_audits (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE CASCADE,

    -- Source columns as-is
    scan_date       VARCHAR(100),               -- 'March 1, 2024' — raw string
    total_pages     VARCHAR(50),                -- 'all' column — raw string (some empty)
    http_2xx        VARCHAR(50),                -- '2XX' column — raw string
    http_3xx        VARCHAR(50),                -- '3XX' column — raw string
    http_4xx        VARCHAR(50),                -- '4XX' column — raw string
    error_rate      VARCHAR(50),                -- 'f' column — e.g. '4.4%', 'NaN' — raw string
    status_note     VARCHAR(200),               -- 'Name' column: 'Lost the domain name', URL, etc.
    audited_url     VARCHAR(500),               -- 'Website (from MASTER _ NGOs)' — URL that was scanned
    master_ngo_name VARCHAR(500),               -- 'MASTER _ NGOs' — NGO name from the CSV

    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_ngo  ON website_audits(ngo_id);
CREATE INDEX IF NOT EXISTS idx_wa_date ON website_audits(scan_date);


-- ============================================================================
-- TABLE: ngo_youbehero
-- One-to-many: same NGO can appear multiple times in YouBeHero CSV.
-- Source: YouBeHero-Grid view.csv (155 rows → 94 NGOs with MASTER name)
-- Note: 'YouBeHero URL' stored as-is. 'MASTER' may contain whitespace/
--       newline artefacts — stripped before matching.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_youbehero (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE CASCADE,
    profile_url     VARCHAR(500) NOT NULL,     -- 'YouBeHero URL'
    source_name     VARCHAR(500),              -- NGO name as it appears in CSV 'MASTER' column
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(ngo_id, profile_url)
);

CREATE INDEX IF NOT EXISTS idx_ybh_ngo ON ngo_youbehero(ngo_id);


-- ============================================================================
-- TABLE: ngo_social_dynamo
-- Source: Social Dynamo-Grid view.csv (149 rows → 44 NGOs with MASTER name)
-- Note: 2 NGOs appear twice (duplicate entries in CSV).
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_social_dynamo (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE CASCADE,
    profile_url     VARCHAR(500) NOT NULL,     -- 'SocialDynamo URL'
    source_name     VARCHAR(500),               -- NGO name from 'MASTER' column
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(ngo_id, profile_url)
);

CREATE INDEX IF NOT EXISTS idx_sd_ngo ON ngo_social_dynamo(ngo_id);


-- ============================================================================
-- TABLE: ngo_acf
-- Source: ACF-Grid view.csv (150 rows, all unique NGOs)
-- Note: 'Name' column contains the full ACF URL path, not a display name.
--       No separate URL column — full URL is stored in 'Name'.
--       3 NGOs from ACF CSV do not match MASTER by name (will be skipped).
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_acf (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE CASCADE,
    acf_slug        VARCHAR(500) NOT NULL,     -- full URL path from 'Name' column
    source_name     VARCHAR(500),               -- NGO name from 'NGOs' column
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(ngo_id, acf_slug)
);

CREATE INDEX IF NOT EXISTS idx_acf_ngo ON ngo_acf(ngo_id);


-- ============================================================================
-- TABLE: ngo_ngheroes
-- Source: ngoHeroes-Grid view.csv (200 rows → 195 unique NGOs, 5 duplicates)
-- Note: 'Name' column contains the full ngoHeroes URL — stored as profile_url.
--       5 NGOs appear twice in source CSV.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_ngheroes (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE CASCADE,
    profile_url     VARCHAR(500) NOT NULL,      -- full ngoHeroes URL from 'Name' column
    source_name     VARCHAR(500),               -- NGO name from 'MASTER' column
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(ngo_id, profile_url)
);

CREATE INDEX IF NOT EXISTS idx_ngh_ngo ON ngo_ngheroes(ngo_id);


-- ============================================================================
-- TABLE: ngo_ethelon
-- Source: Ethelon-Grid view.csv (268 rows → 139 unique NGOs, 14 duplicates)
-- Note: 'Ignore' column = 'checked' on 20 rows — these are skipped during import.
--       153 NGOs with MASTER name, 139 unique (14 duplicate rows in source).
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_ethelon (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE CASCADE,
    profile_url     VARCHAR(500) NOT NULL,      -- 'Ethelon URL'
    source_name     VARCHAR(500),               -- NGO name from 'MASTER' column
    ignore_flag     VARCHAR(50),                -- 'checked' if marked to skip — stored as-is
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(ngo_id, profile_url)
);

CREATE INDEX IF NOT EXISTS idx_eth_ngo   ON ngo_ethelon(ngo_id);
CREATE INDEX IF NOT EXISTS idx_eth_ignore ON ngo_ethelon(ignore_flag);


-- ============================================================================
-- TABLE: ngo_desmos
-- Source: Desmos-Grid view.csv (383 rows)
-- Note: Only 12 rows have a matching NGO name in 'NGOs' column.
--       'Name' column contains the full Desmos profile URL.
--       'Empty' column is always empty — ignored.
--       371 rows have no NGO match and will be flagged in import log.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_desmos (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE SET NULL,  -- SET NULL: unmatched rows kept
    profile_url     VARCHAR(500) NOT NULL,     -- full Desmos URL from 'Name'
    source_name     VARCHAR(500),               -- NGO name from 'NGOs' column (may be empty)
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(profile_url)
);

CREATE INDEX IF NOT EXISTS idx_des_ngo ON ngo_desmos(ngo_id);
CREATE INDEX IF NOT EXISTS idx_des_unmatched ON ngo_desmos(ngo_id) WHERE ngo_id IS NULL;


-- ============================================================================
-- TABLE: ngo_contacts
-- Multiple contacts per NGO. Empty for now — for future manual entry.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_contacts (
    id              SERIAL PRIMARY KEY,
    ngo_id          INT REFERENCES ngos(id) ON DELETE CASCADE,
    name            VARCHAR(300),
    role            VARCHAR(200),
    email           VARCHAR(320),
    phone           VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nc_ngo ON ngo_contacts(ngo_id);
