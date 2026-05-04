-- ============================================================================
-- CONSTELLATION — OKOIP Registry Schema
-- Raw copy of the Greek CSO public registry (okoip.gov.gr)
-- Separate from curated ngos table — kept at rest for reference.
-- ============================================================================

-- ============================================================================
-- TABLE: okoip_registry
-- One row per OKOIP registration. Raw data, exactly as returned by the API.
-- Source: https://okoip.gov.gr/CSOIS/rest/Application/findLazyApplicationPublic
-- All date fields stored as raw epoch ms (BIGINT) or raw strings — never parsed.
-- ============================================================================
CREATE TABLE IF NOT EXISTS okoip_registry (
    id                  SERIAL PRIMARY KEY,

    -- Core identity
    okoip_id            VARCHAR(20) NOT NULL UNIQUE,  -- OKOIP internal ID
    title               VARCHAR(500),                  -- Επωνυμία (legal name)
    tin                 VARCHAR(20),                   -- ΑΦΜ (tax ID)
    category            VARCHAR(200),                  -- Κατηγορία: Σωματείο, Αστική μη Κερδοσκοπική, etc.
    organization_type   SMALLINT,                      -- 1=Σωματείο, 2=Ίδρυμα, 0=Unknown
    form_status         SMALLINT,                      -- 1=Ενεργή, 2=Ανενεργή, 3=Διαγραμμένη

    -- Contact
    email               VARCHAR(320),
    phone               VARCHAR(50),
    street              VARCHAR(300),
    street_number       VARCHAR(20),
    postcode            VARCHAR(20),

    -- Geographic (raw descriptions from API)
    region              VARCHAR(200),                  -- Περιφέρεια
    prefecture          VARCHAR(200),                  -- Περιφερειακή Ενότητα
    municipality        VARCHAR(200),                  -- Δήμος
    municipal_unit      VARCHAR(200),                  -- Δημοτική Ενότητα
    local_community     VARCHAR(200),                  -- Τοπική Κοινότητα

    -- Legal representative
    legal_name          VARCHAR(200),                  -- Νόμιμος Εκπρόσωπος Όνομα
    legal_surname       VARCHAR(200),                  -- Νόμιμος Εκπρόσωπος Επώνυμο
    legal_tin           VARCHAR(20),                   -- Νόμιμος Εκπρόσωπος ΑΦΜ
    legal_date_epoch    BIGINT,                        -- Νόμιμος Εκπρόσωπος Ημ/νία Ανάληψης (epoch ms)
    legal_email         VARCHAR(320),                  -- Legal rep email (from API, if available)

    -- Registry dates (stored as epoch ms — raw, never interpreted)
    issue_date_epoch        BIGINT,                    -- Ημ/νία Έναρξης Καταχώρησης
    incorporation_date_epoch BIGINT,                   -- Ημ/νία Σύστασης
    protocol_date_epoch     BIGINT,                    -- Ημ/νία Πρωτοκόλλου
    protocol_number         VARCHAR(50),               -- Αριθμός Πρωτοκόλλου
    finalization_date_epoch BIGINT,                    -- Ημ/νία Οριστικοποίησης
    start_date_epoch        BIGINT,                    -- Ημ/νία Έναρξης
    end_date_epoch          BIGINT,                    -- Ημ/νία Λήξης

    -- Financial
    grant_value             NUMERIC(12, 2),            -- Grant value (from API)
    available_value         NUMERIC(12, 2),            -- Available grant value

    -- Purpose / description
    purpose                 TEXT,                      -- Σκοπός (comment field from API)

    -- Sector data (from separate merge — τομείς_δράσης)
    sectors                 TEXT,                      -- Comma-separated sector names
    sector_count            SMALLINT,                  -- Number of sectors

    -- Enrichment & metadata
    raw_json                JSONB,                     -- Full raw API response for this record
    scraped_at              TIMESTAMP DEFAULT NOW(),   -- When this data was fetched
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_okoip_tin        ON okoip_registry(tin);
CREATE INDEX IF NOT EXISTS idx_okoip_title      ON okoip_registry(title);
CREATE INDEX IF NOT EXISTS idx_okoip_category   ON okoip_registry(category);
CREATE INDEX IF NOT EXISTS idx_okoip_status     ON okoip_registry(form_status);
CREATE INDEX IF NOT EXISTS idx_okoip_region     ON okoip_registry(region);
CREATE INDEX IF NOT EXISTS idx_okoip_email      ON okoip_registry(email);


-- ============================================================================
-- TABLE: ngo_okoip_matches
-- Links curated Constellations ngos <-> OKOIP registry records.
-- Multiple match methods (by name, by TIN, by email) stored with scores.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ngo_okoip_matches (
    id                  SERIAL PRIMARY KEY,
    ngo_id              INT REFERENCES ngos(id) ON DELETE CASCADE,
    okoip_id            INT REFERENCES okoip_registry(id) ON DELETE CASCADE,

    -- Match confidence
    match_method        VARCHAR(50) NOT NULL,          -- 'exact_name', 'fuzzy_name', 'tin', 'email', 'manual'
    match_score         NUMERIC(5, 2),                 -- 0.00 to 1.00 confidence
    match_detail        TEXT,                          -- Human-readable note about the match

    -- Metadata
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),

    UNIQUE(ngo_id, okoip_id, match_method)
);

CREATE INDEX IF NOT EXISTS idx_nom_ngo     ON ngo_okoip_matches(ngo_id);
CREATE INDEX IF NOT EXISTS idx_nom_okoip   ON ngo_okoip_matches(okoip_id);
CREATE INDEX IF NOT EXISTS idx_nom_score   ON ngo_okoip_matches(match_score);
