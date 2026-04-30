# Import Data

Canonical source CSV files for the Constellation database. These are the original exports — they are not modified after import.

## Files

| File | Description |
|------|-------------|
| `media/export - Journalists - Grid view.csv` | Journalists with Media, Primary Beat, Articles columns |
| `media/export - Media - Grid view.csv` | Media outlets |

## NGO Data (not yet imported)

The `ngodatabase/` folder contains CSV exports from the Greek NGO registry (OKOIP). These tables are planned for future migration to Neon but are not part of the current schema.

## Re-importing

After schema is live on Neon, run:

```bash
python3 ../migrate_to_neon.py
```
