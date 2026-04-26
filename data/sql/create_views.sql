-- ============================================
-- CONSTELLATION DATABASE VIEWS
-- Enables bidirectional navigation between journalists and media outlets
-- ============================================

-- View 1: Journalist Detail with Outlet Links
-- Shows all information about a journalist plus their outlet connections
CREATE VIEW IF NOT EXISTS v_journalist_profile AS
SELECT 
    j.id,
    j.name as journalist_name,
    COUNT(DISTINCT ojrl.media_outlet_id) as total_outlets,
    STRING_AGG(DISTINCT mo.name, ', ' ORDER BY mo.name) as outlets_list,
    STRING_AGG(DISTINCT ojrl.role, ', ' ORDER BY ojrl.role) as roles,
    ARRAY_AGG(DISTINCT mo.id)::varchar[] as outlet_ids,
    ARRAY_AGG(DISTINCT ojrl.journalist_id)::varchar[] as relation_ids
FROM journalists j
LEFT JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
LEFT JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id
GROUP BY j.id, j.name;

-- View 2: Media Outlet Detail with Journalist Links  
-- Shows all information about a media outlet plus their journalist roster
CREATE VIEW IF NOT EXISTS v_media_profile AS
SELECT 
    mo.id,
    mo.name as outlet_name,
    COUNT(DISTINCT ojrl.journalist_id) as total_journalists,
    STRING_AGG(DISTINCT j.name, ', ' ORDER BY j.name) as journalists_list,
    STRING_AGG(DISTINCT ojrl.role, ', ' ORDER BY ojrl.role) as roles,
    ARRAY_AGG(DISTINCT ojrl.media_outlet_id)::varchar[] as relation_ids,
    ARRAY_AGG(DISTINCT ojrl.journalist_id)::varchar[] as journalist_ids
FROM media_outlets mo
LEFT JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
LEFT JOIN journalists j ON ojrl.journalist_id = j.id
GROUP BY mo.id, mo.name;

-- View 3: Navigation Links for Journalists (for UI)
-- Returns clickable links from journalist to each of their outlets
CREATE VIEW IF NOT EXISTS v_journalist_navigation AS
SELECT 
    j.id as journalist_id,
    j.name as journalist_name,
    ojrl.media_outlet_id,
    mo.name as outlet_name,
    ojrl.role,
    -- Generate a navigation link structure
    json_build_object(
        'type', 'outlet',
        'id', mo.id,
        'name', mo.name,
        'role', ojrl.role
    ) as nav_link
FROM journalists j
JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id;

-- View 4: Navigation Links for Media Outlets (for UI)
-- Returns clickable links from media outlet to each of their journalists
CREATE VIEW IF NOT EXISTS v_media_navigation AS
SELECT 
    mo.id as outlet_id,
    mo.name as outlet_name,
    ojrl.journalist_id,
    j.name as journalist_name,
    ojrl.role,
    -- Generate a navigation link structure  
    json_build_object(
        'type', 'journalist',
        'id', j.id,
        'name', j.name,
        'role', ojrl.role
    ) as nav_link
FROM media_outlets mo
JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
JOIN journalists j ON ojrl.journalist_id = j.id;

-- View 5: Cross-Platform Journalists (working at multiple outlets)
-- Identifies journalists who work across different media organizations
CREATE VIEW IF NOT EXISTS v_cross_platform_journalists AS
SELECT 
    j.id,
    j.name as journalist_name,
    COUNT(DISTINCT ojrl.media_outlet_id) as outlet_count,
    STRING_AGG(mo.name, ', ' ORDER BY mo.name) as outlets_worked_at,
    ARRAY_AGG(DISTINCT ojrl.media_outlet_id)::varchar[] as outlet_ids_array
FROM journalists j
JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id
GROUP BY j.id, j.name
HAVING COUNT(DISTINCT ojrl.media_outlet_id) > 1
ORDER BY outlet_count DESC;

-- View 6: Top Media Outlets by Journalist Count
-- Ranks outlets by their journalist roster size
CREATE VIEW IF NOT EXISTS v_top_media_outlets AS
SELECT 
    mo.id,
    mo.name as outlet_name,
    COUNT(DISTINCT ojrl.journalist_id) as journalist_count,
    STRING_AGG(DISTINCT j.name, ', ' ORDER BY j.name) as top_journalists,
    ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT ojrl.journalist_id) DESC) as rank
FROM media_outlets mo
JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
JOIN journalists j ON ojrl.journalist_id = j.id
GROUP BY mo.id, mo.name
ORDER BY journalist_count DESC;

-- View 7: Relationship Statistics Summary
-- Overall statistics about the media-journalist ecosystem
CREATE VIEW IF NOT EXISTS v_relationship_stats AS
SELECT 
    COUNT(DISTINCT j.id) as total_journalists,
    COUNT(DISTINCT mo.id) as total_outlets,
    COUNT(*) as total_relationships,
    AVG(COUNT(DISTINCT ojrl.media_outlet_id)) OVER () as avg_outlets_per_journalist,
    AVG(COUNT(DISTINCT ojrl.journalist_id)) OVER () as avg_journalists_per_outlet,
    COUNT(*) FILTER (WHERE COUNT(DISTINCT ojrl.media_outlet_id) > 1) as multi_platform_journalists,
    COUNT(*) FILTER (WHERE COUNT(DISTINCT ojrl.journalist_id) > 1) as collaborative_outlets
FROM journalists j
JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id;

-- ============================================
-- INDEXES FOR NAVIGATION PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_journ_rel_media ON outlet_journalist_relations(journalist_id, media_outlet_id);
CREATE INDEX IF NOT EXISTS idx_rel_media_journ ON outlet_journalist_relations(media_outlet_id, journalist_id);
