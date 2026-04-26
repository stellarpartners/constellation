# 🌟 Constellation Studio CMS

## 🚀 Current Status (Auto-saved 2026-04-26 21:20)

- ✅ PostgreSQL + Adminer running in Docker (`constellation-postgres`, `constellation-adminer`)
- ✅ Flask API server starts successfully on port 5000
- ✅ Node.js 20 + npm installed via nvm (for Svelte frontend builds)
- ✅ Svelte frontend builds successfully (adapter-auto, needs static adapter for Flask serving)
- ⚠️ Database is empty — data import script needs to be run
- ⚠️ Frontend uses basic HTML template (`templates/index.html`) — Svelte build output not wired to Flask yet
- ⚠️ `flask-cors` installed with `--break-system-packages` flag (system Python, no venv)

### Quick Start
```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Partners/operations/active/constellation
bash scripts/start.sh        # Start Flask API + open browser
docker compose -f docker/compose.yml up -d  # Start PostgreSQL + Adminer
```

---

**Stellar Partners Internal Project**  
*A professional media-journalist relationship database with bidirectional navigation*

---

## 📖 Quick Overview

Constellation Studio is a full-featured web application that provides seamless navigation between journalists and media outlets. Built on Flask (Python) with vanilla JavaScript, it connects to a PostgreSQL database running in Docker containers.

### Key Features
- ✅ **Bidirectional Navigation**: Click journalist → see outlets, click outlet → see journalists
- ✅ **Cross-Platform Analysis**: Identify journalists working at multiple outlets
- ✅ **Search Functionality**: Find specific journalists or media outlets instantly
- ✅ **Top Outlets View**: See which outlets have the most journalists associated
- ✅ **Professional UI**: Clean, responsive design with dark theme
- ✅ **Local Deployment**: Runs entirely on your machine via Docker

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.8+ installed
- Docker and Docker Compose installed
- Bash shell (Linux/Mac) or WSL (Windows)

### 2. Install Dependencies

```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Partners/operations/active/constellation
pip install -r requirements.txt
```

### 3. Start the Application

```bash
./scripts/start.sh
```

The script will:
- Check if PostgreSQL is running (starts Docker if needed)
- Launch the Flask API server on port 5000
- Open your browser automatically to http://localhost:5000

### 4. Access the Application

Open your web browser and navigate to: **http://localhost:5000**

---

## 📁 Project Structure

```
constellation/
├── scripts/              # Python & shell scripts
│   ├── api_server.py     # Flask backend API server
│   ├── start.sh          # Application startup script
│   └── cleanup.sh        # Remove legacy files
│
├── templates/            # HTML templates
│   └── index.html        # Main UI application
│
├── static/               # Static assets
│   └── js/app.js         # Frontend JavaScript logic
│
├── data/                 # Data & SQL scripts
│   ├── db/init-db.sql    # Database initialization
│   └── sql/*.sql         # Additional SQL scripts
│
├── docker/               # Docker configuration
│   └── compose.yml       # Docker Compose services
│
├── docs/                 # Documentation
│   ├── api/API_REFERENCE.md      # API documentation
│   ├── user/USER_GUIDE.md        # User manual
│   └── architecture/ARCHITECTURE.md  # Technical docs
│
└── README.md             # This file
```

---

## 🎯 Main Features Explained

### Cross-Platform Journalists View
See journalists who work at multiple media outlets. Perfect for identifying:
- Influential journalists with broad reach
- Journalists covering multiple beats
- Potential conflicts of interest

**How to use:** Click "Cross-Platform Journalists" in the navigation → See list sorted by outlet count → Click any journalist to see their full profile.

### Top Media Outlets View
Discover which media outlets have the most journalists associated with them.

**How to use:** Click "Top Media Outlets" → See ranked list by journalist count → Click any outlet to see all associated journalists.

### Bidirectional Navigation
The core feature - navigate seamlessly between journalists and outlets:
- **Journalist → Outlets**: Click a journalist's name → See their profile with clickable outlet links
- **Outlet → Journalists**: Click an outlet's name → See its profile with clickable journalist links

---

## 📚 Documentation

### For Users
- **[User Guide](docs/user/USER_GUIDE.md)** - Complete user manual with tutorials and tips
- **[Quick Start](docs/QUICK_START.md)** - Fast setup guide for new users

### For Developers
- **[API Reference](docs/api/API_REFERENCE.md)** - Complete API documentation with all endpoints
- **[Architecture](docs/architecture/ARCHITECTURE.md)** - System design and technical details
- **[Project Structure](docs/project_structure.md)** - File organization and conventions

---

## 🔧 Technical Details

### Technology Stack
- **Backend**: Flask 3.0.2 (Python)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: PostgreSQL 15 in Docker container
- **Containerization**: Docker Compose

### Database Schema
```sql
-- Media outlets table
media_outlets: id, name, progressive_score, people (journalist names)

-- Journalists table  
journalists: id, name, organization, role, outlets_list

-- Junction table for relationships
outlet_journalist_relations: media_outlet_id, journalist_id, role
```

### API Endpoints
- `GET /api/stats` - Overall statistics
- `GET /api/cross-platform-journalists` - Multi-outlet journalists
- `GET /api/journalists/<id>` - Journalist profile with navigation
- `GET /api/outlets/<id>` - Outlet profile with navigation
- `GET /api/search/journalists/<query>` - Search journalists
- `GET /api/search/outlets/<query>` - Search outlets

---

## 🛠️ Maintenance & Updates

### Importing New Data

If you have new CSV files to import:

```bash
# Place CSV files in appropriate directories
data/media/     # Media outlets CSV
data/journalists/  # Journalists CSV

# Run the import script
python3 scripts/import_data.py

# Build relationships (if needed)
python3 scripts/build_relationships.py
```

### Database Access

For advanced users who need direct database access:

```bash
cd docker/
docker-compose up -d adminer  # Start Adminer service
```

Then visit http://localhost:8081 in your browser to access the SQL interface.

---

## 🐛 Troubleshooting

### API Not Responding

**Problem:** Clicking links shows "Failed to fetch data"

**Solutions:**
```bash
# Check if server is running
curl http://localhost:5000/api/stats

# Restart the server
./scripts/start.sh

# Kill any stuck processes
pkill -f api_server.py
```

### Database Connection Issues

**Problem:** Import scripts fail to connect to database

**Solutions:**
```bash
# Ensure Docker PostgreSQL is running
cd docker/
docker-compose ps

# Restart PostgreSQL if needed
docker-compose restart postgres

# Check database health
docker exec constellation-postgres psql -U constellation_user -d constellation_db -c "SELECT 1;"
```

### Browser Not Opening

**Problem:** Application doesn't open in browser automatically

**Solutions:**
- Manually visit http://localhost:5000
- The `start.sh` script tries multiple methods to open the browser

---

## 📊 Current Data Statistics

As of April 2024, the database contains:
- **111 Journalists** from various media organizations
- **29 Media Outlets** including major Greek publications
- **53 Relationships** between journalists and outlets

Top outlets by journalist count:
1. Vima - 7 journalists
2. Kathimerini - 5 journalists  
3. News247 - 4 journalists

---

## 🔒 Security Notes

### Current State (Development)
- No authentication required
- Database credentials in code
- Debug mode enabled

### Production Recommendations
1. Implement JWT or session-based authentication
2. Move database credentials to `.env` file
3. Disable Flask debug mode
4. Add rate limiting middleware
5. Use HTTPS for production deployment

---

## 🤝 Contributing

This is an internal Stellar Partners project. If you're part of the team:

1. Follow the [Project Structure](docs/project_structure.md) guidelines
2. Update documentation when adding new features
3. Test changes locally before committing
4. Keep `.env` file out of version control

---

## 📝 Version History

### v1.0.0 (April 2024)
- Initial release with full bidirectional navigation
- Complete API reference and documentation
- Professional UI with dark theme
- Docker-based deployment
- Import scripts for CSV data

---

## 🎯 Future Enhancements

Planned features:
- [ ] Export data to CSV/Excel formats
- [ ] Advanced filtering (by role, outlet type)
- [ ] Timeline view of journalist movements
- [ ] Collaboration features for team members
- [ ] Analytics dashboard with visualizations
- [ ] Automated relationship updates from news sources

---

## 📞 Support & Contact

For questions or issues:
1. Check the [User Guide](docs/user/USER_GUIDE.md) and [Troubleshooting](#troubleshooting) section
2. Review the [API Reference](docs/api/API_REFERENCE.md) for developers
3. Contact the Stellar Partners development team

---

## 📄 License

Internal use only - Stellar Partners proprietary project.

---

**Version**: 1.0.0  
**Last Updated**: April 2024  
**Maintained by**: Stellar Partners Team  
**Location**: `~/Insync/spytzo@gmail.com/OneDrive/Stellar Partners/operations/active/constellation/`
