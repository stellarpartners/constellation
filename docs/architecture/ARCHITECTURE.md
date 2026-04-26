# Constellation Studio - System Architecture

## Overview

Constellation Studio is a full-stack web application that provides bidirectional navigation between journalists and media outlets. It's built on Flask (Python backend) with vanilla JavaScript frontend, connecting to a PostgreSQL database running in Docker containers.

---

## Technology Stack

### Backend
- **Flask 3.0.2**: Python web framework for REST API
- **Subprocess**: Database queries executed via shell commands
- **Docker**: Containerized PostgreSQL database

### Frontend
- **Vanilla JavaScript**: No frameworks, pure JS for performance
- **HTML5/CSS3**: Modern responsive design
- **Fetch API**: Async HTTP requests to backend

### Database
- **PostgreSQL 15**: Relational database management system
- **Docker Container**: Isolated database environment
- **Views**: Pre-computed SQL views for efficient queries

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Constellation Studio CMS                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐│
│  │   Frontend   │────▶│    Backend    │◀───▶│   Database   ││
│  │  (HTML/JS)   │     │   (Flask API) │     │(PostgreSQL)  ││
│  └──────────────┘     └──────────────┘     └──────────────┘│
│           ▲                    │                     ▲       │
│           │                    │                     │       │
│   User    │              REST  │         SQL Views    │       │
│   Inter-  │          API Calls│      (Pre-computed)  │       │
│   action  │                   │                     │       │
└───────────┼───────────────────┼─────────────────────┼───────┘
            │                   │                     │
            └───────────────────┴─────────────────────┘
                        Docker Network
```

---

## Component Details

### 1. Frontend Application (`templates/index.html`, `static/js/app.js`)

**Responsibilities:**
- User interface rendering and interaction
- Search functionality with real-time filtering
- Bidirectional navigation between entities
- State management for current view and selected entity

**Key Features:**
```javascript
// Navigation state
let currentView = null;      // 'journalists' | 'outlets' | 'cross-platform'
let currentEntity = null;    // Selected journalist or outlet ID

// API calls
fetch('/api/stats')          // Get statistics
fetch('/api/journalists/1')  // Get profile with navigation links
```

**Design Decisions:**
- Vanilla JavaScript for zero dependencies and maximum performance
- Single-page application feel without page reloads
- Responsive design for desktop and mobile devices

### 2. Backend API (`scripts/api_server.py`)

**Responsibilities:**
- RESTful API endpoints for all data access
- Database query execution via subprocess calls
- Data transformation from SQL results to JSON responses
- Error handling and validation

**Key Endpoints:**
```python
@app.route('/api/stats')              # GET - Overall statistics
@app.route('/api/cross-platform-journalists')  # GET - Multi-outlet journalists
@app.route('/api/journalists/<id>')     # GET - Journalist profile + navigation
@app.route('/api/outlets/<id>')         # GET - Outlet profile + navigation
@app.route('/api/search/journalists/<query>')  # GET - Search results
```

**Design Decisions:**
- Subprocess execution for database queries (no direct DB connection)
- Pipe-separated output parsing from psql
- Error handling with detailed logging
- Debug mode enabled during development

### 3. Database Layer (`data/db/`, `data/sql/`)

**Tables:**
```sql
-- Media outlets table
CREATE TABLE media_outlets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    progressive_score DECIMAL(10,2),
    people TEXT  -- Comma-separated journalist names
);

-- Journalists table
CREATE TABLE journalists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    role VARCHAR(100),
    outlets_list TEXT  -- Comma-separated outlet names
);

-- Junction table for relationships
CREATE TABLE outlet_journalist_relations (
    media_outlet_id INTEGER REFERENCES media_outlets(id),
    journalist_id INTEGER REFERENCES journalists(id),
    role VARCHAR(100),
    PRIMARY KEY (media_outlet_id, journalist_id)
);
```

**Views:**
```sql
-- Pre-computed views for efficient queries
CREATE VIEW v_relationship_stats AS ...;
CREATE VIEW v_cross_platform_journalists AS ...;
CREATE VIEW v_top_media_outlets AS ...;
CREATE VIEW v_journalist_profile AS ...;
CREATE VIEW v_media_profile AS ...;
```

**Design Decisions:**
- Separate tables for clarity and flexibility
- Junction table for many-to-many relationships
- Pre-computed views for performance optimization
- UTF-8 encoding for Greek character support

### 4. Docker Infrastructure (`docker/compose.yml`)

**Services:**
```yaml
postgres:          # PostgreSQL database container
adminer:          # Web-based SQL client (optional)
```

**Design Decisions:**
- Local desktop deployment (no cloud dependencies)
- Persistent volumes for data storage
- Health checks for reliable startup
- Port mapping for easy access

---

## Data Flow

### 1. User Navigation Flow

```
User clicks journalist name
    ↓
Frontend calls /api/journalists/<id>
    ↓
Backend executes SQL query via subprocess
    ↓
PostgreSQL returns results (pipe-separated)
    ↓
Backend parses and transforms to JSON
    ↓
Frontend receives and renders profile page
    ↓
User clicks outlet link in profile
    ↓
Frontend calls /api/outlets/<id>
    ↓
Repeat cycle for outlet navigation
```

### 2. Search Flow

```
User types search query
    ↓
Frontend calls /api/search/journalists/<query>
    ↓
Backend executes SQL LIKE query via subprocess
    ↓
PostgreSQL returns matching results
    ↓
Backend transforms to JSON array
    ↓
Frontend renders search results list
    ↓
User clicks result → Navigate to profile page
```

### 3. Data Import Flow

```
CSV files in data/media/ and data/journalists/
    ↓
Python script reads CSV with utf-8-sig encoding
    ↓
Script parses columns (id, Name, etc.)
    ↓
Script executes INSERT statements via subprocess
    ↓
PostgreSQL stores records in tables
    ↓
Relationships built from "People" column parsing
```

---

## Security Considerations

### Current State
- No authentication required (development mode)
- Database credentials hardcoded in code
- Debug mode enabled for development

### Production Recommendations
1. **Authentication**: Implement JWT or session-based auth
2. **Environment Variables**: Move DB credentials to .env file
3. **Rate Limiting**: Add rate limiting middleware
4. **Input Validation**: Sanitize all user inputs
5. **HTTPS**: Use SSL/TLS for production deployment

---

## Performance Optimization

### Current Optimizations
- Pre-computed SQL views for complex queries
- Pipe-separated output (minimal parsing overhead)
- Single-page application (no page reloads)

### Future Improvements
1. **Database Indexes**: Add indexes on frequently queried columns
2. **Caching**: Implement Redis caching for static data
3. **Pagination**: Add pagination for large result sets
4. **Lazy Loading**: Load navigation links only when needed
5. **WebSockets**: Real-time updates for collaborative features

---

## Deployment Architecture

### Local Development
```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Partners/operations/active/constellation
./scripts/start.sh  # Starts everything locally
```

### Production (Future)
```
Flask API Server (port 5000)
    ↓
Nginx Reverse Proxy (SSL termination)
    ↓
PostgreSQL Database (managed service or dedicated server)
```

---

## Monitoring & Logging

### Current Logging
- Console output from Flask app
- Subprocess stderr for database errors
- Browser console for frontend errors

### Future Enhancements
1. **Structured Logging**: JSON logs for easier analysis
2. **Metrics Collection**: Request duration, error rates
3. **Health Checks**: /health endpoint for load balancers
4. **Error Tracking**: Sentry or similar service integration

---

## Scalability Considerations

### Current Limitations
- Single Flask process (no horizontal scaling)
- No caching layer
- Direct database queries per request

### Scaling Options
1. **Vertical Scaling**: Upgrade server resources
2. **Horizontal Scaling**: Multiple Flask instances behind load balancer
3. **Database Replication**: Read replicas for query offloading
4. **CDN**: Serve static assets from CDN

---

## Maintenance & Updates

### Regular Tasks
- Backup PostgreSQL database daily
- Monitor disk space and log files
- Update dependencies periodically
- Review and clean up unused data

### Version Control
- Git repository with proper branching strategy
- .gitignore excludes sensitive data and Python cache
- Documentation in docs/ directory

---

**Version**: 1.0.0  
**Last Updated**: April 2024  
**Maintained by**: Stellar Partners Team
