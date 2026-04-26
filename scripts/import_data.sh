#!/bin/bash
# Constellation Database Import Script (Shell-based)
# Uses PostgreSQL COPY command for efficient bulk imports

set -e

DB_USER="constellation_user"
DB_PASS="constellation_pass"
DB_NAME="constellation_db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV_DIR="$SCRIPT_DIR/media"

echo "============================================================"
echo "Constellation Database Import Script (Shell-based)"
echo "============================================================"

# Function to import CSV with proper column mapping
import_media_outlets() {
    local csv_file="$1"
    
    echo ""
    echo "📰 Importing Media Outlets from: $(basename "$csv_file")"
    
    # Create a temporary file without BOM (Byte Order Mark)
    tmpfile=$(mktemp)
    tail -n +2 "$csv_file" | sed 's/^\xEF\xBB\xBF//' > "$tmpfile"
    
    # Import with correct column mapping based on actual CSV headers
    docker exec constellation-postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
\COPY media_outlets (id, name, url, website, similarweb_visits_m_dec2022, similarweb_visits_m_jan2023, similarweb_visits_m_feb2023, geographical_level, topics, "Name in Greek", type_of_media, description_greek, media_companies, facebook, twitter_handle, instagram_handle, linkedin_url, youtube_channel, people, articles, eci_articles, progressive_score, eu_coverage_score, combined_score, notes) 
FROM STDIN WITH (FORMAT csv, HEADER true);
EOF
    
    cat "$tmpfile" | \
    docker exec constellation-postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
\COPY media_outlets (id, name, url, website, similarweb_visits_m_dec2022, similarweb_visits_m_jan2023, similarweb_visits_m_feb2023, geographical_level, topics, "Name in Greek", type_of_media, description_greek, media_companies, facebook, twitter_handle, instagram_handle, linkedin_url, youtube_channel, people, articles, eci_articles, progressive_score, eu_coverage_score, combined_score, notes) 
FROM STDIN WITH (FORMAT csv, HEADER true);
EOF
    
    rm -f "$tmpfile"
    
    echo "✓ Media outlets imported successfully"
}

import_journalists() {
    local csv_file="$1"
    
    echo ""
    echo "👤 Importing Journalists from: $(basename "$csv_file")"
    
    # Create a temporary file without BOM
    tmpfile=$(mktemp)
    tail -n +2 "$csv_file" | sed 's/^\xEF\xBB\xBF//' > "$tmpfile"
    
    # Check if it's the NocoDB export format (has outlet_id, role columns)
    first_line=$(head -1 "$csv_file")
    
    if echo "$first_line" | grep -q "outlet_id"; then
        # NocoDB export format
        docker exec constellation-postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
\COPY journalists (id, name, outlet_id, role, notes) 
FROM STDIN WITH (FORMAT csv, HEADER true);
EOF
        
        cat "$tmpfile" | \
        docker exec constellation-postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
\COPY journalists (id, name, outlet_id, role, notes) 
FROM STDIN WITH (FORMAT csv, HEADER true);
EOF
    else
        # Alternative format - adjust columns as needed
        echo "  ⚠️ Journalist CSV has unexpected format. Using default import."
        docker exec constellation-postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
\COPY journalists (id, name, outlet_id, role, notes) 
FROM STDIN WITH (FORMAT csv, HEADER true);
EOF
        
        cat "$tmpfile" | \
        docker exec constellation-postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
\COPY journalists (id, name, outlet_id, role, notes) 
FROM STDIN WITH (FORMAT csv, HEADER true);
EOF
    fi
    
    rm -f "$tmpfile"
    
    echo "✓ Journalists imported successfully"
}

# Check if files exist
MEDIA_CSV="$CSV_DIR/export - Media - Grid view.csv"
JOURNALIST_CSV="$CSV_DIR/export - Journalists - Grid view.csv"

if [ ! -f "$MEDIA_CSV" ]; then
    echo "❌ Media CSV not found: $MEDIA_CSV"
    exit 1
fi

if [ ! -f "$JOURNALIST_CSV" ]; then
    echo "❌ Journalist CSV not found: $JOURNALIST_CSV"
    exit 1
fi

# Import data
import_media_outlets "$MEDIA_CSV"
import_journalists "$JOURNALIST_CSV"

# Verify counts
echo ""
echo "============================================================"
echo "✅ Verification:"
docker exec constellation-postgres psql -U "$DB_USER" -d "$DB_NAME" -t <<EOF
SELECT 
    'media_outlets' as table_name, COUNT(*) as count FROM media_outlets
UNION ALL
SELECT 'journalists', COUNT(*) FROM journalists;
EOF

echo "============================================================"
echo "✅ Import Complete!"
echo "============================================================"
