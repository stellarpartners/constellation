-- Enrichment apply 2026-04-29T14:33:00.295929

UPDATE media_outlets SET website = COALESCE(EXCLUDED.website, media_outlets.website) WHERE id = '200';
UPDATE media_outlets SET website = COALESCE(EXCLUDED.website, media_outlets.website) WHERE id = '202';
UPDATE media_outlets SET website = COALESCE(EXCLUDED.website, media_outlets.website) WHERE id = '186';