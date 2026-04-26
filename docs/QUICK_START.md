# CONSTELLATION Quick Start Guide

**Stellar Partners Internal Project**  
*Get your Constellation database running in 5 minutes*

---

## 🚀 Prerequisites

- Docker installed on your system
- Docker Compose installed
- Access to project folder: `~/Insync/spytzo@gmail.com/OneDrive/Stellar Partners/operations/active/constellation`

---

## ⚡ 5-Minute Deployment

### Step 1: Navigate to Project Folder

```bash
cd ~/Insync/spytzo@gmail.com/OneDrive/Stellar\ Partners/operations/active/constellation
```

### Step 2: Deploy Docker Services

```bash
docker-compose up -d
```

This starts three services:
- **PostgreSQL** (port 5432) - Your database
- **NocoDB** (port 8080) - No-code interface
- **Adminer** (port 8081) - Direct SQL access (optional)

### Step 3: Access the Interface

Open your browser to:

**NocoDB UI**: http://localhost:8080
- Login with admin credentials (see `.env` file)
- Default: Check `docker-compose.yml` or `.env` for setup

**Direct SQL** (optional): http://localhost:8081
- Use Adminer for direct database queries

### Step 4: Import Your Data

```bash
python3 import_data.py
```

This automatically imports:
- Media outlets CSV (252 records)
- Journalists CSV (110 records)  
- Organizations CSV (~803 NGOs)

**Expected output:**
```
📥 Importing media outlets from ...
  ✓ Efsyn... (Score: 6)
  ✓ Avgi... (Score: 5)
✅ Imported 252 media outlets

📥 Importing journalists from ...
  ✓ * Newsroom *...
  ✓ Newroom in.gr...
✅ Imported 110 journalists

📥 Importing organizations from ...
  ✓ Ελληνικός Σύλλογος Προστασίας Ιπποειδών... (Category: Φιλοζωία)
  ✓ Mediterranean Information Office...
✅ Imported 803 organizations

✅ IMPORT COMPLETE: 1165 records loaded
```

---

## ✅ Verification Checklist

After deployment, verify everything is working:

- [ ] Docker services running: `docker-compose ps` (all should show "Up")
- [ ] NocoDB accessible at http://localhost:8080
- [ ] Login successful with admin credentials
- [ ] Data import completed without errors
- [ ] Can view tables in NocoDB interface

---

## 🔧 Common Issues & Solutions

### Issue: Port 8080 already in use

**Solution:** Check what's using the port and either stop it or change the port in `docker-compose.yml`:
```bash
lsof -i :8080
# Or change port in docker-compose.yml:
#   ports:
#     - "8081:8080"  # Use 8081 instead
```

### Issue: Can't access NocoDB

**Solution:** Check service status and logs:
```bash
docker-compose ps
docker-compose logs nocodb
```

### Issue: Import script errors

**Solution:** Verify CSV files exist and are UTF-8 encoded:
```bash
ls -la media/*.csv
file media/*.csv  # Should show "ASCII text" or "UTF-8 Unicode text"
```

### Issue: Database connection refused

**Solution:** Wait for PostgreSQL to initialize (takes ~30 seconds):
```bash
docker-compose logs postgres | tail -20
```

---

## 📊 What You Have Now

After successful deployment and import, you have:

✅ **PostgreSQL database** with 1,165 records across 3 core tables  
✅ **NocoDB interface** for easy data entry and relationship mapping  
✅ **Automated import script** ready for future data updates  
✅ **Complete schema** matching your existing CSV structure  

---

## 🎯 Next Steps

### Immediate (Today)
1. ✅ Deploy Docker services (done!)
2. ✅ Import base data (done!)
3. 🔜 Explore NocoDB interface - click on each table to see the data

### Short-term (This Week)
4. 🔜 Parse "people" column from media_outlets → create individual journalist records
5. 🔜 Link journalists to their primary media outlets via foreign keys
6. 🔜 Start mapping relationships between NGOs and media outlets

### Medium-term (Next Sprint)
7. 🚀 Build relationship tables (organization_media_relations, etc.)
8. 🚀 Create constellation visualization patterns
9. 🚀 Add scoring/weighting logic for relationship strength

---

## 🛠️ Useful Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs postgres
docker-compose logs nocodb

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Import data again (if needed)
python3 import_data.py

# Backup database
docker exec constellation-postgres pg_dump constellation_db > backup_$(date +%Y%m%d).sql
```

---

## 📚 Additional Documentation

- **Full Guide**: See `README.md` for complete documentation
- **Architecture**: See `docs/ARCHITECTURE.md` for system design details
- **Schema Details**: See `docs/SCHEMA.md` for table specifications
- **Research Notes**: See `docs/research/stellar-databases-research.md`

---

## 🆘 Need Help?

### Check Logs First
```bash
docker-compose logs --tail 50
```

### Restart Services
```bash
docker-compose restart
```

### Reset Admin Password (if needed)
```bash
docker exec constellation-postgres psql -U constellation_user -d constellation_db << EOF
ALTER USER constellation_user WITH PASSWORD 'newpassword123';
EOF
```

---

*You're ready! Open http://localhost:8080 and start exploring your constellation database 🚀*

*Last updated: April 26, 2026*  
*Stellar Partners Internal Use Only — Confidential*
