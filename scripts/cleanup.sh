#!/bin/bash
# Constellation Studio - Cleanup Script
# Removes legacy and unused files from the repository

echo "🧹 Starting Constellation Studio cleanup..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Files to remove (legacy/deprecated)
LEGACY_FILES=(
    "import_data.sh"
    "import_csv.py"
    "test_sql.py"
    "enrich_journalists.py"
    "demo_navigation.py"
    "build_relationships.py"
    "CMS_GUIDE.md"
    "NAVIGATION_SYSTEM.md"
    "RELATIONSHIPS.md"
)

# Directories to remove (legacy)
LEGACY_DIRS=(
    "import/"
    "ngodatabase/"
)

echo "📋 Files marked for removal:"
for file in "${LEGACY_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ $file"
    else
        echo "  ✓ $file (already removed)"
    fi
done

echo ""
echo "📁 Directories marked for removal:"
for dir in "${LEGACY_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ❌ $dir/"
    else
        echo "  ✓ $dir/ (already removed)"
    fi
done

echo ""
read -p "Do you want to remove these files and directories? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
    echo ""
    echo "🗑️  Removing legacy files..."
    for file in "${LEGACY_FILES[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "  ✓ Removed: $file"
        fi
    done

    echo ""
    echo "🗑️  Removing legacy directories..."
    for dir in "${LEGACY_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"
            echo "  ✓ Removed: $dir/"
        fi
    done

    echo ""
    echo "✅ Cleanup complete!"
else
    echo "⚠️  Cleanup cancelled. No files were removed."
fi

echo ""
echo "📁 Current project structure:"
find . -type f \( -name "*.py" -o -name "*.sh" -o -name "*.md" -o -name "*.html" -o -name "*.js" -o -name "*.sql" \) | grep -v ".git" | sort
