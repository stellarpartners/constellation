-- Create junction table for media-outlet-to-journalist relationships
CREATE TABLE IF NOT EXISTS outlet_journalist_relations (
    id SERIAL PRIMARY KEY,
    media_outlet_id VARCHAR(20) REFERENCES media_outlets(id),
    journalist_id VARCHAR(20) REFERENCES journalists(id),
    role VARCHAR(100),  -- e.g., "Reporter", "Editor", "Contributor"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_relations_outlet ON outlet_journalist_relations(media_outlet_id);
CREATE INDEX IF NOT EXISTS idx_relations_journalist ON outlet_journalist_relations(journalist_id);

-- Add unique constraint to prevent duplicate relationships
CREATE UNIQUE INDEX IF NOT EXISTS idx_relations_unique ON outlet_journalist_relations(media_outlet_id, journalist_id);
