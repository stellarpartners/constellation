# Constellation Studio - Database Navigation System

## Overview
A bidirectional navigation system connecting journalists and media outlets, enabling seamless exploration of the database relationships.

## Database Views Created

### 1. v_journalist_profile
Shows complete journalist information with outlet connections:
- Journalist name
- Total number of outlets they work for
- List of all outlets (comma-separated)
- Array of outlet IDs and relation IDs

**Usage:**
```sql
SELECT * FROM v_journalist_profile WHERE id = 11;
-- Returns: Συμέλα Τουχτίδου working at 2 outlets
```

### 2. v_media_profile  
Shows complete media outlet information with journalist roster:
- Outlet name
- Total number of journalists on roster
- List of all journalists (comma-separated)
- Array of relation IDs and journalist IDs

**Usage:**
```sql
SELECT * FROM v_media_profile WHERE id = 3;
-- Returns: Vima with 7 journalists
```

### 3. v_journalist_navigation
Provides clickable navigation links from journalist to outlets:
- Journalist ID and name
- Each outlet as a navigable link with metadata (type, id, name, role)

**Usage:** Click on an outlet link → navigate to that media outlet's page

### 4. v_media_navigation
Provides clickable navigation links from media outlet to journalists:
- Outlet ID and name  
- Each journalist as a navigable link with metadata (type, id, name, role)

**Usage:** Click on a journalist link → navigate to that journalist's page

### 5. v_cross_platform_journalists
Identifies journalists working at multiple outlets:
- Journalist name
- Number of outlets worked for
- List of outlet names
- Array of outlet IDs

**Sample Output:**
```
Συμέλα Τουχτίδου - 2 outlets (Vima, Kathimerini)
Κώστας Δεληγιάννης - 2 outlets (News247, Efsyn)
```

### 6. v_top_media_outlets
Ranks media outlets by journalist count:
- Outlet name
- Journalist count
- Top journalists list
- Rank position

**Top Results:**
1. Vima - 7 journalists
2. Kathimerini - 5 journalists  
3. News247 - 4 journalists

### 7. v_relationship_stats
Overall ecosystem statistics:
- Total journalists: 47
- Total outlets: 29
- Total relationships: 53

## Navigation Flow

### Direction 1: Journalist → Media Outlets
```
User views journalist profile (ID: 11)
↓
Sees "Works at: Vima, Kathimerini"
↓
Clicks on "Vima" link
↓
Navigates to media outlet page (ID: 3)
↓
Sees all 7 journalists working there
```

### Direction 2: Media Outlet → Journalists
```
User views media outlet profile (ID: 3 - Vima)
↓
Sees "Journalists on roster: [list of 7 names]"
↓
Clicks on journalist name (e.g., "Συμέλα Τουχτίδου")
↓
Navigates to journalist page (ID: 11)
↓
Sees all outlets they work for
```

## Files Created

### SQL Scripts
- `create_views.sql` - All view definitions and indexes

### Python Tools
- `demo_navigation.py` - Terminal-based navigation demo showing relationships
- Usage: `python3 demo_navigation.py`

### HTML Interface  
- `navigation_demo.html` - Visual interface demonstrating bidirectional navigation
- Open in browser to see the UI concept

## How It Works (Technical)

### View Structure Example: v_journalist_navigation
```sql
SELECT 
    j.id as journalist_id,
    j.name as journalist_name,
    ojrl.media_outlet_id,
    mo.name as outlet_name,
    json_build_object(
        'type', 'outlet',
        'id', mo.id,
        'name', mo.name
    ) as nav_link
FROM journalists j
JOIN outlet_journalist_relations ojrl ON j.id = ojrl.journalist_id
JOIN media_outlets mo ON ojrl.media_outlet_id = mo.id;
```

This creates a structured JSON object that can be easily consumed by frontend applications for rendering clickable navigation links.

## Next Steps: Building Constellation Studio CMS

### Phase 1: Backend API (Flask)
- Create REST endpoints for each view
- Implement pagination and search
- Add filtering capabilities

### Phase 2: Frontend UI
- Single Page Application (React/Vue)
- Dynamic routing based on navigation links
- Responsive design for mobile/desktop

### Phase 3: Advanced Features
- Search functionality
- Export data to CSV/PDF
- Analytics dashboard
- User authentication and permissions

## Access Points

```bash
# PostgreSQL CLI
docker exec constellation-postgres psql -U constellation_user -d constellation_db

# Test a view
docker exec constellation-postgres psql -U constellation_user -d constellation_db -c "SELECT * FROM v_cross_platform_journalists;"
```

## Key Benefits

1. **Bidirectional Navigation**: Seamless movement between journalists and outlets
2. **Performance Optimized**: Indexed joins for fast queries
3. **Scalable Structure**: Ready to add more tables (articles, campaigns, organizations)
4. **Developer Friendly**: JSON navigation links simplify frontend integration
5. **Data Integrity**: Maintains referential integrity through junction table

## Sample Queries for Exploration

```sql
-- Find all journalists at a specific outlet
SELECT j.name FROM v_media_navigation WHERE outlet_id = 3;

-- Get journalist's full profile with outlets
SELECT * FROM v_journalist_profile WHERE id = 11;

-- See cross-platform journalists only  
SELECT * FROM v_cross_platform_journalists ORDER BY outlet_count DESC;

-- Quick stats overview
SELECT * FROM v_relationship_stats;
```
