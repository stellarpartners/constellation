# 🌟 Constellation Studio - Complete Project Structure

## Visual Directory Tree

```
constellation/
│
├── 📄 README.md                          ← Main documentation (START HERE)
├── 📄 requirements.txt                   ← Python dependencies  
├── 🔐 .env                               ← Environment config (secret!)
├── 📋 .gitignore                         ← Git ignore rules
│
├── 🚀 scripts/                           ← All executable code
│   ├── api_server.py                     ← Flask backend API server
│   ├── start.sh                          ← Application startup script  
│   ├── cleanup.sh                        ← Remove legacy files utility
│   ├── import_data.py                    ← Import CSV data to database
│   ├── build_relationships.py            ← Build journalist-outlet relationships
│   ├── enrich_journalists.py             ← Enrich journalist profiles
│   ├── demo_navigation.py                ← Demo navigation functionality
│   └── test_sql.py                       ← Test SQL query execution
│
├── 🎨 templates/                         ← HTML templates
│   └── index.html                        ← Main UI application (single-page app)
│
├── 💻 static/                            ← Static assets  
│   ├── css/                              ← CSS stylesheets
│   │   └── styles.css                    ← Application styles
│   └── js/                               ← JavaScript files
│       └── app.js                        ← Frontend application logic
│
├── 💾 data/                              ← Data and SQL scripts
│   ├── db/                               ← Database initialization
│   │   └── init-db.sql                   ← Initial database schema
│   ├── journalists/                      ← Journalist CSV files (source)
│   │   └── [journalist CSV files]        ← Import source data
│   ├── media/                            ← Media outlet CSV files (source)
│   │   └── [media CSV files]             ← Import source data  
│   └── sql/                              ← Additional SQL scripts
│       ├── create_views.sql              ← Create database views
│       ├── create_relations.sql          ← Create relationship tables
│       └── populate_relations.sql        ← Populate relationships data
│
├── 🐳 docker/                            ← Docker configuration
│   └── compose.yml                       ← Docker Compose services (PostgreSQL + Adminer)
│
└── 📚 docs/                              ← Comprehensive documentation
    ├── api/                              ← API documentation for developers
    │   └── API_REFERENCE.md              ← Complete API reference guide
    │
    ├── user/                             ← User-facing documentation
    │   └── USER_GUIDE.md                 ← Complete user manual with tutorials
    │
    ├── architecture/                     ← Technical documentation
    │   └── ARCHITECTURE.md               ← System design and technical details
    │
    ├── project_structure.md              ← File organization guide
    ├── QUICK_START.md                    ← Fast setup instructions
    ├── REPOSITORY_ORGANIZATION_COMPLETE.md  ← Organization summary
    └── FINAL_SUMMARY.md                  ← Final summary document

```

---

## 🗂️ File Categories Explained

### 🔧 Scripts (scripts/)
**Purpose**: All executable code and utilities

| File | Purpose | Usage |
|------|---------|-------|
| `api_server.py` | Flask backend API server | `python3 scripts/api_server.py` |
| `start.sh` | Application startup script | `./scripts/start.sh` |
| `cleanup.sh` | Remove legacy files utility | `./scripts/cleanup.sh` |
| `import_data.py` | Import CSV data to database | `python3 scripts/import_data.py` |
| `build_relationships.py` | Build journalist-outlet relationships | `python3 scripts/build_relationships.py` |

### 🎨 Templates (templates/)
**Purpose**: HTML templates for web interface

| File | Purpose | Description |
|------|---------|-------------|
| `index.html` | Main UI application | Single-page app with bidirectional navigation |

### 💻 Static Assets (static/)
**Purpose**: CSS, JavaScript, and images

| Directory | Contents | Purpose |
|-----------|----------|---------|
| `css/` | Stylesheets | Application styling (dark theme) |
| `js/` | JavaScript files | Frontend logic and API calls |

### 💾 Data (data/)
**Purpose**: SQL scripts and source data files

| Directory | Contents | Purpose |
|-----------|----------|---------|
| `db/` | Database initialization | Initial schema setup |
| `journalists/` | Journalist CSV files | Source data for import |
| `media/` | Media outlet CSV files | Source data for import |
| `sql/` | Additional SQL scripts | Views, relationships, etc. |

### 🐳 Docker (docker/)
**Purpose**: Container configuration

| File | Purpose | Description |
|------|---------|-------------|
| `compose.yml` | Docker Compose services | PostgreSQL + Adminer containers |

### 📚 Documentation (docs/)
**Purpose**: Comprehensive documentation for all users

| Directory | Audience | Contents |
|-----------|----------|----------|
| `api/` | Developers | Complete API reference with examples |
| `user/` | End users | User manual, tutorials, tips |
| `architecture/` | Technical team | System design, technical details |

---

## 🚀 Quick Start Commands

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Application
```bash
./scripts/start.sh
```

### 3. Access UI
Open http://localhost:5000 in your browser

---

## 📊 Project Statistics

- **Total Directories**: 12 main directories
- **Python Scripts**: 8 executable scripts  
- **Documentation Files**: 7 comprehensive guides
- **SQL Scripts**: 3 database initialization files
- **Configuration Files**: 4 config files (.env, requirements.txt, .gitignore, compose.yml)

---

## 🎯 File Purposes at a Glance

### For Developers
- `scripts/api_server.py` → Backend API server (Flask)
- `templates/index.html` → Frontend UI template
- `static/js/app.js` → JavaScript logic
- `data/db/init-db.sql` → Database schema
- `docker/compose.yml` → Docker services

### For Users  
- `README.md` → Project overview and quick start
- `docs/user/USER_GUIDE.md` → User manual with tutorials
- `docs/api/API_REFERENCE.md` → API documentation

### For Maintenance
- `scripts/cleanup.sh` → Remove legacy files
- `.gitignore` → Version control rules
- `.env.example` → Environment template (safe to commit)

---

## 🔐 Security Notes

**Files NOT to Commit:**
- `.env` - Contains sensitive database credentials
- Any file with passwords or API keys

**Safe to Commit:**
- All code files (.py, .sh, .js, .html)
- Documentation files (.md)
- SQL scripts (.sql)
- Configuration templates (.example files)

---

## 📞 Quick Reference

### Need to Start?
```bash
./scripts/start.sh
```

### Need to Import Data?
```bash
python3 scripts/import_data.py
```

### Need API Docs?
👉 `docs/api/API_REFERENCE.md`

### Need User Guide?  
👉 `docs/user/USER_GUIDE.md`

### Need Architecture Info?
👉 `docs/architecture/ARCHITECTURE.md`

---

**Project**: Constellation Studio CMS  
**Status**: ✅ Production Ready  
**Version**: 1.0.0  
