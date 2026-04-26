-- ============================================
-- CONSTELLATION DATABASE SCHEMA v1.2
-- Based on ACTUAL Baserow/GOPA ECI exports + NGO master.csv
-- Three Core Entity Tables + Dimension Support
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE ENTITY TABLES (3 Separate Tables)
-- ============================================

-- Table 1: MEDIA OUTLETS (from "export - Media - Grid view.csv")
CREATE TABLE media_outlets (
    id VARCHAR(20) PRIMARY KEY,  -- '162', '228', etc. from CSV
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    
    -- Metrics & scoring (from Baserow export)
    similarweb_visits_m_dec2022 DECIMAL(10,3),
    similarweb_visits_m_jan2023 DECIMAL(10,3),
    similarweb_visits_m_feb2023 DECIMAL(10,3),
    
    -- Classification
    geographical_level VARCHAR(50),  -- National, Regional, Local
    topics TEXT[],  -- Array of topic tags
    type_of_media VARCHAR(100),
    
    -- Localization
    name_in_greek VARCHAR(255),
    
    -- Description & notes (can contain Greek text)
    description_greek TEXT,
    media_companies TEXT,
    facebook VARCHAR(255),
    twitter_handle VARCHAR(50),
    instagram_handle VARCHAR(50),
    linkedin_url VARCHAR(255),
    youtube_channel VARCHAR(255),
    
    -- People column (comma-separated list of names)
    people TEXT,
    
    -- Scoring metrics
    progressive_score INTEGER,
    eu_coverage_score INTEGER,
    combined_score INTEGER,
    
    -- Metadata
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: JOURNALISTS (from "export - Journalists - Grid view.csv")  
CREATE TABLE journalists (
    id VARCHAR(20) PRIMARY KEY,  -- '3', '75', etc. from CSV
    name VARCHAR(255),  -- "* Newsroom *" or individual journalist names
    media_outlet_name VARCHAR(255),  -- "Media" column
    
    -- Article links (stored as JSON array for multiple URLs)
    article_links JSONB,  -- Array of URL objects with title/source
    
    -- Professional info
    primary_beat VARCHAR(100),  -- Environment, Economy, etc.
    articles_count INTEGER DEFAULT 0,
    
    -- Social & status
    twitter_handle VARCHAR(50),
    linkedin_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    channel VARCHAR(100),
    
    -- Notes (can contain evaluation text like "Not a great fit")
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: ORGANIZATIONS (from NGO master.csv - EXACT MATCH)
CREATE TABLE organizations (
    id VARCHAR(20) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    
    -- Core contact info
    website VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    wordpress BOOLEAN DEFAULT FALSE,
    
    -- Category (Κατηγορία from CSV)
    category VARCHAR(100),  -- e.g., "Φιλοζωία" (Animal Welfare)
    
    -- Social Media Links (exact column mapping from master.csv)
    facebook_page VARCHAR(255),
    linkedin_url VARCHAR(255),
    instagram_handle VARCHAR(50),
    youtube_channel VARCHAR(255),
    twitter_handle VARCHAR(50),
    tiktok_handle VARCHAR(50),
    
    -- Platform integrations (from CSV columns)
    youbehero_url TEXT,  -- YouBeHero cause page URL
    desmos_name TEXT,   -- Name from Desmos platform
    acf_name TEXT,      -- Name from ACF platform
    ngoheroes_name TEXT,-- Name from ngoHeroes platform
    social_dynamo_url TEXT,-- Social Dynamo URL
    ethelon_url TEXT,   -- Ethelon URL
    
    -- Additional data
    website_audits INTEGER DEFAULT 0,
    ngoheroes_score INTEGER DEFAULT 0,
    hubspot_company_id VARCHAR(50),
    last_modified DATE,
    
    -- Status & metadata
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DIMENSION/ADJACENT TABLES (6-7 Tables)
-- ============================================

-- Table 4: ORGANIZATION_CONTACTS (Multiple contact points per org)
CREATE TABLE organization_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id VARCHAR(20),  -- Links to organizations.id
    contact_type VARCHAR(50),  -- general, press, partnerships, donations
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    UNIQUE(organization_id, contact_type)
);

-- Table 5: ORGANIZATION_CAMPAIGNS (Active campaigns/projects by orgs)
CREATE TABLE organization_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id VARCHAR(20),  -- Links to organizations.id
    campaign_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',  -- active, completed, paused
    goal TEXT,
    target_audience TEXT,
    budget DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 6: MEDIA_ARTICLES (Content published by outlets)
CREATE TABLE media_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id VARCHAR(20),  -- Links to media_outlets.id
    title VARCHAR(500),
    slug VARCHAR(255),
    url VARCHAR(500),
    
    -- Content metadata
    published_date DATE,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    topic_tags TEXT[],  -- Array of tags
    
    -- Classification
    article_type VARCHAR(100),  -- news, opinion, feature, investigative
    language VARCHAR(50),
    
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 7: JOURNALIST_ARTICLES (Articles written by journalists)
CREATE TABLE journalist_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journalist_id VARCHAR(20),  -- Links to journalists.id
    article_title VARCHAR(500),
    outlet_name VARCHAR(255),  -- Name of media outlet
    published_date DATE,
    url VARCHAR(500),
    topic_tags TEXT[],
    
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 8: ORGANIZATION_MEDIA_RELATIONS (Connections between orgs and media)
CREATE TABLE organization_media_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id VARCHAR(20),  -- Links to organizations.id
    media_outlet_id VARCHAR(20),  -- Links to media_outlets.id
    
    -- Relationship type
    relation_type VARCHAR(100),  -- covered_by, partners_with, sponsored_by, interviewed_by
    
    -- Metadata about the relationship
    first_contact_date DATE,
    last_interaction_date DATE,
    notes TEXT,
    
    UNIQUE(organization_id, media_outlet_id)
);

-- Table 9: JOURNALIST_ORGANIZATION_RELATIONS (Journalist-NGO connections)
CREATE TABLE journalist_organization_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journalist_id VARCHAR(20),  -- Links to journalists.id
    organization_id VARCHAR(20),  -- Links to organizations.id
    
    -- Relationship type
    relation_type VARCHAR(100),  -- advocates_for, consulted_by, interviewed, partner
    
    -- Metadata
    start_date DATE,
    end_date DATE,
    notes TEXT,
    
    UNIQUE(journalist_id, organization_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_media_outlets_name ON media_outlets(name);
CREATE INDEX idx_media_outlets_geographical_level ON media_outlets(geographical_level);
CREATE INDEX idx_media_outlets_progressive_score ON media_outlets(progressive_score DESC);
CREATE INDEX idx_media_outlets_combined_score ON media_outlets(combined_score DESC);
CREATE INDEX idx_journalists_name ON journalists(name);
CREATE INDEX idx_journalists_beat ON journalists(primary_beat);

-- NGO-specific indexes (from master.csv structure)
CREATE INDEX idx_orgs_category ON organizations(category);
CREATE INDEX idx_orgs_facebook ON organizations(facebook_page);
CREATE INDEX idx_orgs_email ON organizations(email);
CREATE INDEX idx_orgs_website ON organizations(website);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMP
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_media_outlets_updated_at BEFORE UPDATE ON media_outlets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journalists_updated_at BEFORE UPDATE ON journalists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
