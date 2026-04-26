# Constellation Studio CMS - User Guide

## Welcome to Constellation Studio

Constellation Studio is a powerful tool for exploring relationships between journalists and media outlets. Built by Stellar Partners, it provides bidirectional navigation and comprehensive data analysis.

---

## Quick Start

### 1. Launch the Application

```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Partners/operations/active/constellation
./scripts/start.sh
```

The application will:
- Check if PostgreSQL is running
- Start the Flask API server on port 5000
- Open your browser to http://localhost:5000

### 2. Access the UI

Open your web browser and navigate to: **http://localhost:5000**

---

## Main Features

### 🎯 Cross-Platform Journalists View

See journalists who work at multiple media outlets. This is useful for identifying:
- Influential journalists with broad reach
- Journalists covering multiple beats
- Potential conflicts of interest

**How to use:**
1. Click on "Cross-Platform Journalists" in the navigation
2. See a list sorted by number of outlets (highest first)
3. Click on any journalist name to see their full profile and outlet links

### 📰 Top Media Outlets View

Discover which media outlets have the most journalists associated with them.

**How to use:**
1. Click on "Top Media Outlets" in the navigation
2. See a ranked list of outlets by journalist count
3. Click on any outlet name to see all associated journalists

### 🔍 Search Functionality

Find specific journalists or media outlets quickly.

**Search Journalists:**
- Type a name in the search box
- Results show matching journalists with their outlet count
- Click on any result to see full profile

**Search Outlets:**
- Type an outlet name in the search box
- Results show matching outlets with journalist count
- Click on any result to see all associated journalists

### 🔗 Bidirectional Navigation

The core feature of Constellation Studio - navigate seamlessly between journalists and outlets.

**From Journalist → Outlets:**
1. Click on a journalist's name in any view
2. See their profile page with clickable links to each outlet they work at
3. Click on any outlet link to jump directly to that outlet's page

**From Outlet → Journalists:**
1. Click on an outlet's name in any view
2. See their profile page with clickable links to all associated journalists
3. Click on any journalist link to jump directly to that journalist's page

---

## Understanding the Data

### Media Outlets Table

Each media outlet record contains:
- **ID**: Unique identifier
- **Name**: Outlet name (e.g., "Vima", "Kathimerini")
- **Progressive Score**: A calculated score based on various factors
- **People Column**: Contains names of journalists working at this outlet (comma-separated)

### Journalists Table

Each journalist record contains:
- **ID**: Unique identifier
- **Name**: Full name of the journalist
- **Organization**: Their primary organization (if applicable)
- **Role**: Their role (Staff, Contributor, etc.)
- **Outlets List**: Comma-separated list of outlets they work at

### Relationships Table

The junction table that links journalists to outlets:
- **Media Outlet ID**: Reference to media_outlets table
- **Journalist ID**: Reference to journalists table
- **Role**: The journalist's role at this specific outlet

---

## Common Use Cases

### 1. Research a Journalist's Reach

**Scenario:** You want to know which outlets a journalist works for and their influence.

**Steps:**
1. Search for the journalist by name
2. Click on their profile
3. See all outlets they work at with clickable links
4. Click on each outlet to see other journalists there (context)

### 2. Analyze Media Outlet Coverage

**Scenario:** You want to understand which journalists cover a particular topic across different outlets.

**Steps:**
1. Find the top media outlets view
2. Click on an outlet of interest
3. See all journalists associated with that outlet
4. For each journalist, click their name to see other outlets (cross-platform analysis)

### 3. Identify Cross-Platform Influencers

**Scenario:** You want to find journalists who have the broadest reach across multiple outlets.

**Steps:**
1. Go to "Cross-Platform Journalists" view
2. Sort by outlet count (descending)
3. Click on top journalists to see their full profile
4. Analyze which outlets they cover and potential influence

### 4. Track Journalist Movements

**Scenario:** You want to see how a journalist's career has evolved across different media organizations.

**Steps:**
1. Search for the journalist
2. Click on their profile
3. Review all outlets they've worked at (historical data)
4. For each outlet, click to see context and other journalists

---

## Tips & Best Practices

### 💡 Navigation Tips

- **Keyboard Shortcuts**: Use Ctrl+F (Cmd+F on Mac) for quick search within the page
- **Bookmark Important Pages**: Save profiles of key journalists or outlets for quick access
- **Use Browser History**: Navigate back easily if you click too many links

### 🎯 Search Strategies

- **Partial Matches**: Search works with partial names (e.g., "John" finds "John Doe")
- **Case Insensitive**: Searches are not case-sensitive
- **Combine Views**: Use search to find, then navigate to see full context

### 🔗 Understanding Relationships

- **One-to-Many**: One journalist can work at many outlets
- **Many-to-One**: Many journalists can work at one outlet
- **Role Context**: Each relationship has a specific role (Staff, Contributor, etc.)

---

## Data Import & Management

### Importing New Data

If you have new CSV files to import:

1. Place CSV files in appropriate directories:
   - Media outlets → `data/media/`
   - Journalists → `data/journalists/`

2. Run the import script:
   ```bash
   python3 scripts/import_data.py
   ```

3. Build relationships (if needed):
   ```bash
   python3 scripts/build_relationships.py
   ```

### Database Access

For advanced users who need direct database access:

1. Start Docker services:
   ```bash
   cd docker/
   docker-compose up -d
   ```

2. Access Adminer at http://localhost:8081

3. Connect to `constellation_db` with user `constellation_user`

---

## Troubleshooting

### API Not Responding

**Problem:** Clicking links shows "Failed to fetch data"

**Solutions:**
1. Check if server is running: `curl http://localhost:5000/api/stats`
2. Restart the server: `./scripts/start.sh`
3. Check for port conflicts: `lsof -i :5000`

### Database Connection Issues

**Problem:** Import scripts fail to connect to database

**Solutions:**
1. Ensure Docker PostgreSQL is running: `docker-compose ps`
2. Restart PostgreSQL: `cd docker/ && docker-compose restart postgres`
3. Check database health: `docker exec constellation-postgres psql -U constellation_user -d constellation_db -c "SELECT 1;"`

### Browser Not Opening

**Problem:** Application doesn't open in browser automatically

**Solutions:**
1. Manually visit http://localhost:5000
2. Check if a browser is installed on your system
3. Use the `start.sh` script which tries multiple methods to open the browser

---

## Getting Help

If you encounter issues or have questions:

1. **Check Documentation**: Review the README.md and API_REFERENCE.md files
2. **Review Logs**: Check console output when starting the application
3. **Database Queries**: Use Adminer for direct SQL queries if needed
4. **Contact Team**: Reach out to the Stellar Partners development team

---

## Future Enhancements

Planned features for future releases:

- [ ] Export data to CSV/Excel formats
- [ ] Advanced filtering (by role, by outlet type)
- [ ] Timeline view of journalist movements
- [ ] Collaboration features for team members
- [ ] Automated relationship updates from news sources
- [ ] Analytics dashboard with visualizations

---

**Version**: 1.0.0  
**Last Updated**: April 2024  
**Maintained by**: Stellar Partners Team
