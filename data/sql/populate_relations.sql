-- Populate outlet_journalist_relations from existing data
-- This creates relationships based on matching journalist names in media outlets' People column

INSERT INTO outlet_journalist_relations (media_outlet_id, journalist_id, role)
SELECT 
    mo.id as media_outlet_id,
    j.id as journalist_id,
    'Staff' as role
FROM media_outlets mo
CROSS JOIN LATERAL (
    SELECT unnest(string_to_array(
        regexp_replace(mo."People", E'[\"\'\s]', '', 'g'), 
        ','
    )) as name
) people
JOIN journalists j ON LOWER(trim(people.name)) = LOWER(trim(j.name))
ON CONFLICT (media_outlet_id, journalist_id) DO NOTHING;
