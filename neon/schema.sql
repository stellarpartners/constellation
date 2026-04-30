-- ============================================================
-- Constellation Schema v2 — Full media/journalist rich data
-- ============================================================

DROP TABLE IF EXISTS outlet_journalist_relations CASCADE;
DROP TABLE IF EXISTS journalists CASCADE;
DROP TABLE IF EXISTS media_outlets CASCADE;

-- ── Journalists ────────────────────────────────────────────────────────────────
CREATE TABLE journalists (
    id                VARCHAR(20) PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    email             VARCHAR(255),
    primary_beat      VARCHAR(255),
    bio_notes         TEXT,
    twitter           VARCHAR(255),
    linkedin          VARCHAR(255),
    status            VARCHAR(100),
    channel           VARCHAR(100),
    articles          TEXT,          -- JSON array of URLs
    outlet_name       VARCHAR(255)   -- their primary outlet (for reference)
);

CREATE INDEX idx_journalists_name      ON journalists(name);
CREATE INDEX idx_journalists_outlet    ON journalists(outlet_name);
CREATE INDEX idx_journalists_beat      ON journalists(primary_beat);
CREATE INDEX idx_journalists_status     ON journalists(status);

-- ── Media Outlets ──────────────────────────────────────────────────────────────
CREATE TABLE media_outlets (
    id                      VARCHAR(20) PRIMARY KEY,
    name                    VARCHAR(255) NOT NULL,
    name_gr                 VARCHAR(255),    -- Greek name variant
    website                 VARCHAR(500),
    type_of_media           VARCHAR(100),
    geographical_level      VARCHAR(50),     -- National, International, Regional
    topics                  TEXT,             -- freeform topics
    description_gr          TEXT,
    media_companies         TEXT,
    facebook                VARCHAR(500),
    twitter                 VARCHAR(255),
    instagram               VARCHAR(255),
    linkedin                VARCHAR(255),
    youtube                 VARCHAR(500),
    people_names            TEXT,             -- comma-separated journalist names listed on this outlet
    articles                TEXT,             -- JSON array of article URLs this outlet has covered
    eci_articles            TEXT,             -- JSON array of ECI-related article titles/URLs
    progressive_score       SMALLINT,
    eu_coverage_score       SMALLINT,
    combined_score          SMALLINT,
    notes                   TEXT
);

CREATE INDEX idx_outlets_name     ON media_outlets(name);
CREATE INDEX idx_outlets_type     ON media_outlets(type_of_media);
CREATE INDEX idx_outlets_geo      ON media_outlets(geographical_level);
CREATE INDEX idx_outlets_combined ON media_outlets(combined_score DESC);

-- ── Journalist ↔ Outlet relations (many-to-many) ───────────────────────────────
CREATE TABLE outlet_journalist_relations (
    id               SERIAL PRIMARY KEY,
    journalist_id    VARCHAR(20) NOT NULL REFERENCES journalists(id) ON DELETE CASCADE,
    media_outlet_id  VARCHAR(20) NOT NULL REFERENCES media_outlets(id) ON DELETE CASCADE,
    role             VARCHAR(255),
    UNIQUE(journalist_id, media_outlet_id)
);

CREATE INDEX idx_rel_journalist ON outlet_journalist_relations(journalist_id);
CREATE INDEX idx_rel_outlet    ON outlet_journalist_relations(media_outlet_id);
