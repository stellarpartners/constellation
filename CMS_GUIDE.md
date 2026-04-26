# Constellation Studio CMS - Complete Guide

## Overview
Constellation Studio is a full-featured web application providing bidirectional navigation between journalists and media outlets. Built with Flask (backend) and vanilla HTML/CSS/JS (frontend), it offers a seamless user experience for exploring the database relationships.

## Architecture

### Backend (Flask API Server)
- **Port**: 5000
- **Endpoints**: RESTful API for all database views
- **Database**: PostgreSQL via Docker container
- **Technology**: Python 3.12 + Flask 3.0.2

### Frontend (Web UI)
- **Technologies**: Vanilla HTML5, CSS3, JavaScript ES6+
- **No Frameworks**: Pure, lightweight, fast loading
- **Responsive Design**: Works on desktop and mobile devices
- **Features**: Real-time search, bidirectional navigation, statistics dashboard

## Files Structure

```
constellation/
├── api_server.py          # Flask backend API server
├── index.html             # Main HTML file (UI structure)
├── app.js                 # Frontend JavaScript application logic
├── start.sh               # Startup script (Linux/Mac)
├── create_views.sql       # SQL views definitions
├── demo_navigation.py     # Terminal-based navigation demo
├── NAVIGATION_SYSTEM.md   # Database navigation documentation
└── CMS_GUIDE.md           # This file - complete guide
```

## Quick Start

### Step 1: Start the API Server
```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Partners/operations/active/constellation
python3 api_server.py
```

Or use the startup script:
```bash
./start.sh
```

### Step 2: Access the UI
Open your browser and navigate to:
```
http://localhost:5000
```

The application will automatically load statistics and display the main navigation.

## Features

### 1. Statistics Dashboard
Shows real-time database statistics:
- Total journalists (47)
- Total media outlets (29)
- Total relationships (53)

### 2. Cross-Platform Journalists View
Displays journalists working at multiple outlets:
- Shows journalist name and outlet count
- Click to navigate to their full profile
- Identifies freelancers and multi-platform workers

**Sample Output:**
```
Συμέλα Τουχτίδου - 2 outlets →
Κώστας Δεληγιάννης - 2 outlets →
```

### 3. Top Media Outlets View
Ranks media outlets by journalist count:
- Shows outlet name and journalist count
- Click to navigate to outlet profile
- Identifies major media organizations

**Sample Output:**
```
Vima (7 journalists) →
Kathimerini (5 journalists) →
News247 (4 journalists) →
```

### 4. Search Functionality
Search for specific entities:
- **Journalist Search**: Find by name, shows outlet count
- **Outlet Search**: Find by name, shows journalist count
- Real-time results as you type

### 5. Bidirectional Navigation

#### Journalist → Media Outlets
1. Click on a journalist in any list
2. View their full profile with statistics
3. See all outlets they work for (as clickable tags)
4. Click on an outlet to navigate there

#### Media Outlet → Journalists
1. Click on an outlet in the top outlets list
2. View their full profile with statistics  
3. See all journalists on their roster (as clickable links)
4. Click on a journalist to navigate back

This creates a seamless exploration experience where you can:
- Start from any journalist → explore their outlets → click an outlet → see its journalists → click one → etc.

## API Endpoints

### Statistics
```bash
GET /api/stats
Response: {
  "total_journalists": 47,
  "total_outlets": 29,
  "total_relationships": 53
}
```

### Cross-Platform Journalists
```bash
GET /api/cross-platform-journalists
Response: {
  "journalists": [
    {"id": 11, "name": "Συμέλα Τουχτίδου", "outlet_count": 2},
    ...
  ]
}
```

### Top Media Outlets (limit parameter)
```bash
GET /api/top-outlets/15
Response: {
  "outlets": [
    {"id": 3, "name": "Vima", "journalist_count": 7},
    ...
  ]
}
```

### Journalist Profile
```bash
GET /api/journalists/<id>
Response: {
  "profile": {
    "id": 11,
    "name": "Συμέλα Τουχτίδου",
    "total_outlets": 2,
    "outlets_list": ["Vima", "Kathimerini"],
    "outlet_ids": [3, 2]
  },
  "navigation_links": [
    {"outlet_id": 3, "outlet_name": "Vima"},
    ...
  ]
}
```

### Outlet Profile
```bash
GET /api/outlets/<id>
Response: {
  "profile": {
    "id": 3,
    "name": "Vima",
    "total_journalists": 7,
    "journalists_list": ["Name1", "Name2", ...],
    "journalist_ids": [11, 17, ...]
  },
  "navigation_links": [
    {"journalist_id": 11, "journalist_name": "Συμέλα Τουχτίδου"},
    ...
  ]
}
```

### Search Endpoints
```bash
GET /api/search/journalists/<query>
GET /api/search/outlets/<query>
```

### Relationships
```bash
GET /api/relationships/<journalist_id>
GET /api/relationships/<outlet_id>
```

## Usage Examples

### Example 1: Explore a Cross-Platform Journalist
1. Navigate to "Cross-Platform Journalists" tab
2. Click on "Συμέλα Τουχτίδου"
3. View profile showing they work at Vima and Kathimerini
4. Click on "Vima" tag/link
5. Navigate to Vima's page showing all 7 journalists

### Example 2: Search for a Specific Outlet
1. Navigate to "Search Outlets" tab
2. Type "Efsyn" in search box
3. Press Enter or click results
4. Click on Efsyn result
5. View outlet profile with journalist roster
6. Click any journalist to navigate back

### Example 3: Discover Top Media Organizations
1. Navigate to "Top Media Outlets" tab
2. See Vima ranked #1 with 7 journalists
3. Click on Vima
4. Explore all journalists working there
5. Click a journalist to see their other outlets

## Technical Details

### Database Views Used
- `v_journalist_profile` - Journalist details with outlet info
- `v_media_profile` - Media outlet details with journalist roster
- `v_journalist_navigation` - Navigation links from journalist → outlets
- `v_media_navigation` - Navigation links from outlet → journalists
- `v_cross_platform_journalists` - Multi-outlet journalists
- `v_top_media_outlets` - Ranked outlets by journalist count

### Performance Optimizations
- Indexed joins on junction table
- Efficient SQL queries with LIMIT clauses
- Minimal JavaScript for fast page loads
- No framework overhead

### Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Troubleshooting

### API Server Not Starting
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill existing process
killall python3

# Restart server
python3 api_server.py
```

### UI Shows "Failed to load statistics"
- Verify API server is running: `curl http://localhost:5000/api/stats`
- Check Docker PostgreSQL container: `docker ps | grep constellation-postgres`
- Review browser console for JavaScript errors (F12)

### Database Connection Issues
```bash
# Test database connection
docker exec constellation-postgres psql -U constellation_user -d constellation_db -c "SELECT 1;"

# Check if views exist
docker exec constellation-postgres psql -U constellation_user -d constellation_db -c "\dv"
```

## Future Enhancements

### Phase 2 Features (Planned)
- [ ] User authentication and permissions
- [ ] Export data to CSV/PDF
- [ ] Advanced filtering (by region, role, etc.)
- [ ] Analytics dashboard with charts
- [ ] Real-time search suggestions
- [ ] Bookmark/favorite entities
- [ ] Dark mode toggle

### Phase 3 Features (Long-term)
- [ ] Article content integration
- [ ] Campaign tracking
- [ ] Organization management
- [ ] Social media connections
- [ ] Multi-language support
- [ ] Mobile app version

## Deployment Options

### Local Development (Current)
```bash
python3 api_server.py  # Runs on http://localhost:5000
```

### Production Deployment
1. Set up production Flask server with gunicorn/uwsgi
2. Configure environment variables for database credentials
3. Enable HTTPS/TLS
4. Set up reverse proxy (nginx)
5. Implement rate limiting and security headers

Example production setup:
```bash
gunicorn --bind 0.0.0.0:5000 --workers 4 api_server:app
```

## Support & Maintenance

### Restarting Services
```bash
# Stop all constellation services
docker-compose down

# Start fresh
docker-compose up -d
```

### Updating Database Views
1. Modify `create_views.sql`
2. Re-run in database:
   ```bash
   docker exec constellation-postgres psql -U constellation_user -d constellation_db -f create_views.sql
   ```

### Adding New Features
1. Add new SQL view to `create_views.sql`
2. Create Flask endpoint in `api_server.py`
3. Update UI in `index.html` and `app.js`
4. Test thoroughly before deployment

## Contact & Feedback
For issues, suggestions, or questions:
- Check this documentation first
- Review the code comments for inline explanations
- Examine database views with SQL queries

---

**Built with ❤️ for Stellar Partners - Constellation Project**
