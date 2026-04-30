-- Enrichment apply 2026-04-29T14:30:36.483490

UPDATE media_outlets SET website = COALESCE(EXCLUDED.website, media_outlets.website) WHERE id = '202';
UPDATE media_outlets SET website = COALESCE(EXCLUDED.website, media_outlets.website) WHERE id = '186';