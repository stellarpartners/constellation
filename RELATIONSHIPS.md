# Constellation Database - Two-Way Media-Journalist Relationships

## Overview
The constellation database now has a **many-to-many relationship** between media outlets and journalists, allowing for flexible querying of both directions.

## Schema Structure

### Tables Created:
1. **media_outlets** (143 records)
   - Core outlet information from GOPA ECI CSV
   
2. **journalists** (111 records)  
   - Journalist profiles from SIMA CSV

3. **outlet_journalist_relations** (53 relationships)
   - Junction table connecting media outlets to journalists
   - Columns: `id`, `media_outlet_id`, `journalist_id`, `role`, `created_at`

## Two-Way Connections

### Direction 1: Media Outlet → Journalists
```sql
-- Find all journalists working at a specific outlet
SELECT j.name, ojrl.role 
FROM outlet_journalist_relations ojrl
JOIN journalists j ON ojrl.journalist_id = j.id
WHERE ojrl.media_outlet_id = '162'  -- Efsyn's ID
ORDER BY j.name;

-- Count journalists per outlet
SELECT mo.name as outlet, COUNT(DISTINCT ojrl.journalist_id) as journalist_count
FROM media_outlets mo
LEFT JOIN outlet_journalist_relations ojrl ON mo.id = ojrl.media_outlet_id
GROUP BY mo.id, mo.name
ORDER BY journalist_count DESC;
```

### Direction 2: Journalist → Media Outlets
```sql
-- Find all outlets a journalist works for
SELECT mo.name as outlet
FROM outlet_journalist_relations ojrl
JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id
WHERE ojrl.journalist_id = '3'  -- Example journalist ID
ORDER BY mo.name;

-- Count outlets per journalist (freelancers vs staff)
SELECT j.name as journalist, COUNT(DISTINCT ojrl.media_outlet_id) as outlet_count
FROM journalists j
JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
GROUP BY j.id, j.name
ORDER BY outlet_count DESC;
```

## Sample Data Insights

### Top Media Outlets by Journalist Count:
1. **Vima** - 7 journalists
2. **Kathimerini** - 5 journalists  
3. **News247** - 4 journalists
4. **Efsyn** - 3 journalists
5. **LiFO** - 3 journalists

### Journalists Working at Multiple Outlets:
1. **Συμέλα Τουχτίδου** - 2 outlets
2. **Βίκυ Κουρλιμπίνη** - 2 outlets
3. **Κώστας Δεληγιάννης** - 2 outlets

## How Relationships Were Built

The relationships were created by:
1. Parsing the **"People"** column from media_outlets CSV (contains journalist names)
2. Matching those names against the journalists table
3. Creating junction records in `outlet_journalist_relations`

Example match:
- Media outlet: **Efsyn** has "Τάσος Σαραντής,Κώστας Ζαφειρόπουλος,Μαρία Ψαρά" in People column
- These names were matched to existing journalist records
- Relationships created for each match

## Next Steps Available

1. **Add more columns**: Include `role` (Reporter, Editor, Contributor) when parsing
2. **Enrich journalists table**: Populate `media_outlet_name` column from relationships
3. **Build queries**: Create views or reports showing the two-way connections
4. **Import additional data**: Organizations, campaigns, articles tables

## Access Points

```bash
# PostgreSQL CLI
docker exec constellation-postgres psql -U constellation_user -d constellation_db

# Adminer (visual interface)
http://localhost:8081
```
