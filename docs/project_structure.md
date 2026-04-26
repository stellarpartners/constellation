# Constellation Studio - Project Structure

## Overview

This document describes the organized structure of the Constellation Studio CMS repository. All files are arranged in a professional, maintainable layout following best practices for Python web applications.

---

## Directory Tree

```
constellation/
├── .env                      # Environment variables (sensitive data)
├── .env.example              # Template for environment variables
├── .gitignore               # Git ignore rules
├── README.md                # Main project documentation
│
├── scripts/                 # Python and shell scripts
│   ├── api_server.py        # Flask backend API server
│   ├── start.sh             # Application startup script
│   ├── import_data.py       # Import CSV data to database
│   ├── import_csv.py        # Alternative CSV importer
│   ├── build_relationships.py  # Build journalist-outlet relationships
│   ├── enrich_journalists.py    # Enrich journalist profiles
│   ├── demo_navigation.py   # Demo navigation functionality
│   └── test_sql.py          # Test SQL query execution
│
├── templates/               # HTML templates
│   └── index.html           # Main UI application (single-page app)
│
├── static/                  # Static assets
│   ├── css/                 # CSS stylesheets
│   │   └── styles.css       # Application styles (if needed)
│   └── js/                  # JavaScript files
│       └── app.js           # Frontend application logic
│
├── data/                    # Data files and SQL scripts
│   ├── db/                  # Database initialization scripts
│   │   └── init-db.sql      # Initial database schema and setup
│   └── sql/                 # Additional SQL scripts
│       ├── create_views.sql     # Create database views
│       ├── create_relations.sql  # Create relationship tables
│       └── populate_relations.sql  # Populate relationships data
│
├── docker/                  # Docker configuration
│   └── compose.yml          # Docker Compose services definition
│
├── docs/                    # Documentation files
│   ├── api/                 # API documentation
│   │   └── API_REFERENCE.md    # Complete API reference guide
│   ├── user/                # User-facing documentation
│   │   └── USER_GUIDE.md       # User manual and tutorials
│   ├── architecture/         # Technical documentation
│   │   └── ARCHITECTURE.md     # System architecture details
│   ├── nocodb_config.json    # NocoDB configuration (legacy)
│   └── navigation_demo.html  # Navigation demo page (legacy)
│
├── import/                  # Import utilities (legacy)
│   └── media/               # Media-related import tools
│       └── csv_to_json.py   # CSV to JSON converter
│
├── ngodatabase/             # NGO database tools (legacy)
│   └── [contents]           # Legacy NGO database scripts
│
└── docs_legacy/             # Legacy documentation (deprecated)
    ├── CONSTELLATION_SYSTEM_ARCHITECTURE.md  # Old architecture doc
    ├── NAVIGATION_SYSTEM.md                  # Old navigation guide
    └── RELATIONSHIPS.md                     # Old relationships guide

```

---

## File Descriptions

### Root Level Files

#### `.env`
Environment variables for configuration. Contains sensitive data like database passwords. **Never commit this file to version control.**

#### `.env.example`
Template file showing required environment variables. Safe to commit to version control. Users should copy this to `.env` and fill in their values.

#### `.gitignore`
Git ignore rules to exclude unnecessary files from version control (Python cache, virtual environments, sensitive data).

#### `README.md`
Main project documentation with quick start guide, features overview, and troubleshooting tips.

---

### Scripts Directory (`scripts/`)

#### `api_server.py`
**Purpose**: Flask backend API server that provides REST endpoints for all database operations.

**Functionality**:
- Executes SQL queries via subprocess calls to Docker PostgreSQL container
- Transforms pipe-separated output from psql into JSON responses
- Provides bidirectional navigation between journalists and outlets
- Handles search functionality with LIKE queries

**Usage**:
```bash
python3 scripts/api_server.py
# or
./scripts/start.sh  # Starts this automatically
```

#### `start.sh`
**Purpose**: Application startup script that checks dependencies and launches the server.

**Functionality**:
- Checks if API is already running on port 5000
- Kills any existing processes on port 5000 before restart
- Starts Flask API server in background
- Opens browser to application URL (platform-specific)
- Displays helpful status messages and feature list

**Usage**:
```bash
./scripts/start.sh
```

#### `import_data.py`
**Purpose**: Import CSV files from GOPA ECI and SIMA sources into the database.

**Functionality**:
- Reads media_outlets.csv and journalists.csv with UTF-8 encoding
- Parses CSV columns (id, Name, etc.)
- Executes INSERT statements via subprocess to PostgreSQL
- Handles duplicate prevention with ON CONFLICT clauses

**Usage**:
```bash
python3 scripts/import_data.py
```

#### `build_relationships.py`
**Purpose**: Build relationships between journalists and outlets based on the "People" column.

**Functionality**:
- Reads media_outlets.csv to get outlet names and associated journalist names
- Queries database for existing journalist IDs by name matching
- Inserts records into outlet_journalist_relations junction table
- Uses ON CONFLICT DO NOTHING to prevent duplicates

**Usage**:
```bash
python3 scripts/build_relationships.py
```

#### `enrich_journalists.py`
**Purpose**: Enrich journalist profiles with additional data from various sources.

**Functionality**:
- Fetches additional information about journalists
- Updates journalist records in database
- May include organization details, roles, contact information

**Usage**:
```bash
python3 scripts/enrich_journalists.py
```

#### `demo_navigation.py`
**Purpose**: Demonstrate bidirectional navigation functionality.

**Functionality**:
- Queries cross-platform journalists and top outlets
- Displays formatted output showing relationships
- Useful for testing and understanding the data structure

**Usage**:
```bash
python3 scripts/demo_navigation.py
```

#### `test_sql.py`
**Purpose**: Test SQL query execution via subprocess.

**Functionality**:
- Tests psql command execution through Docker
- Validates query parsing logic
- Debug tool for troubleshooting database connectivity

**Usage**:
```bash
python3 scripts/test_sql.py
```

---

### Templates Directory (`templates/`)

#### `index.html`
**Purpose**: Main single-page application interface.

**Features**:
- Responsive design with dark theme
- Navigation tabs for different views
- Search functionality with real-time filtering
- Bidirectional navigation between entities
- Cross-platform journalists view
- Top media outlets view
- Journalist and outlet profile pages

**Technology**: Vanilla HTML5, CSS3, JavaScript (no frameworks)

---

### Static Directory (`static/`)

#### `js/app.js`
**Purpose**: Frontend application logic.

**Features**:
- State management for current view and selected entity
- API call functions for all endpoints
- Search filtering with debouncing
- Navigation link rendering
- Responsive layout updates

---

### Data Directory (`data/`)

#### `db/init-db.sql`
**Purpose**: Initialize database schema on first run.

**Contents**:
- CREATE TABLE statements for media_outlets, journalists, outlet_journalist_relations
- CREATE VIEW statements for pre-computed queries
- INSERT statements for initial test data

#### `sql/create_views.sql`
**Purpose**: Create additional database views for complex queries.

**Views Created**:
- v_relationship_stats: Overall statistics
- v_cross_platform_journalists: Journalists at multiple outlets
- v_top_media_outlets: Top outlets by journalist count
- v_journalist_profile: Detailed journalist profile with outlets
- v_media_profile: Detailed outlet profile with journalists

#### `sql/create_relations.sql`
**Purpose**: Create relationship junction table.

**Table Created**:
- outlet_journalist_relations: Many-to-many relationship between media_outlets and journalists

#### `sql/populate_relations.sql`
**Purpose**: Populate relationships from CSV data.

**Functionality**:
- Parses "People" column from media_outlets.csv
- Matches journalist names to IDs
- Creates relationship records in junction table

---

### Docker Directory (`docker/`)

#### `compose.yml`
**Purpose**: Define Docker Compose services for local development.

**Services**:
1. **postgres**: PostgreSQL 15 database container
   - Auto-initializes with init-db.sql on first run
   - Persistent volume for data storage
   - Health checks for reliable startup
   
2. **adminer**: Web-based SQL client (optional)
   - Provides GUI for direct database access
   - Useful for debugging and ad-hoc queries

**Usage**:
```bash
cd docker/
docker-compose up -d  # Start services in background
docker-compose ps     # Check service status
docker-compose down   # Stop and remove services
```

---

### Docs Directory (`docs/`)

#### `api/API_REFERENCE.md`
**Purpose**: Complete API documentation for developers.

**Contents**:
- All available endpoints with examples
- Request/response formats
- Error codes and handling
- Rate limiting information

#### `user/USER_GUIDE.md`
**Purpose**: User manual for end users.

**Contents**:
- Quick start guide
- Feature explanations
- Use case scenarios
- Troubleshooting tips
- Tips and best practices

#### `architecture/ARCHITECTURE.md`
**Purpose**: Technical documentation for developers.

**Contents**:
- System architecture overview
- Technology stack details
- Data flow diagrams
- Security considerations
- Performance optimization
- Scalability options

---

### Legacy Directories (Deprecated)

#### `import/`
Contains older import utilities that have been superseded by scripts/import_data.py. Consider removing or archiving.

#### `ngodatabase/`
Legacy NGO database tools. May still be useful but not part of the main application flow.

#### `docs_legacy/`
Old documentation files that have been replaced with more comprehensive docs in the docs/ directory. Can be removed after review.

---

## File Organization Principles

### 1. Separation of Concerns
- **Scripts**: All Python and shell scripts in `scripts/`
- **Templates**: HTML templates in `templates/`
- **Static Assets**: CSS, JS, images in `static/`
- **Data Files**: SQL scripts and data files in `data/`

### 2. Documentation Hierarchy
- **README.md**: High-level overview for all users
- **API_REFERENCE.md**: Technical API documentation for developers
- **USER_GUIDE.md**: User manual for end users
- **ARCHITECTURE.md**: System design for technical team

### 3. Environment Configuration
- `.env`: Local configuration (never commit)
- `.env.example`: Template for new installations (safe to commit)

### 4. Version Control
- `.gitignore`: Excludes cache, sensitive data, and build artifacts
- Git repository tracks code, documentation, and SQL scripts only

---

## Adding New Features

When adding new features, follow this structure:

1. **Backend API**: Add endpoint to `scripts/api_server.py`
2. **Frontend UI**: Update `templates/index.html` or add new template
3. **JavaScript Logic**: Add functions to `static/js/app.js`
4. **Documentation**: Update relevant docs in `docs/` directory
5. **Tests**: Add test cases if applicable

---

## Migration from Legacy Structure

The following files have been moved:

| Old Location | New Location | Status |
|-------------|--------------|--------|
| `api_server.py` | `scripts/api_server.py` | Active |
| `index.html` | `templates/index.html` | Active |
| `app.js` | `static/js/app.js` | Active |
| `start.sh` | `scripts/start.sh` | Active |
| `import_data.py` | `scripts/import_data.py` | Active |
| `build_relationships.py` | `scripts/build_relationships.py` | Active |
| `docker-compose.yml` | `docker/compose.yml` | Active |
| `init-db.sql` | `data/db/init-db.sql` | Active |
| `create_views.sql` | `data/sql/create_views.sql` | Active |

---

**Version**: 1.0.0  
**Last Updated**: April 2024  
**Maintained by**: Stellar Partners Team
