#!/bin/bash

# Unified Migration Script for ITSM Application
# Supports: Linux, macOS, Windows (Git Bash/WSL)

echo "========================================"
echo "ITSM Application - Unified Migration Tool"
echo "========================================"
echo ""
echo "WARNING: This script migrates data between databases."
echo "Ensure you have proper backups before proceeding."
echo ""

read -p "Type 'YES' to continue: " confirm
if [ "$confirm" != "YES" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Running data migration from SQLite to PostgreSQL..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH."
    exit 1
fi

# Check if itsm.db exists
if [ ! -f "itsm.db" ]; then
    echo "Error: SQLite database file 'itsm.db' not found."
    exit 1
fi

# Check for environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "Warning: DATABASE_URL environment variable is not set."
    echo "Using default PostgreSQL connection."
fi

# Create backup before migration
echo "Creating backup of SQLite database..."
backup_file="itsm.db.backup.$(date +%Y%m%d.%H%M%S)"
cp "itsm.db" "$backup_file"

if [ $? -eq 0 ]; then
    echo "Backup created successfully: $backup_file"
else
    echo "Warning: Could not create backup."
fi

# Run the migration script
echo ""
echo "Starting data migration..."
node ../js/migrate-data.js

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Data migration completed successfully!"
    echo "========================================"
    echo ""
    echo "Next steps:"
    echo "1. Verify data in PostgreSQL database"
    echo "2. Update DATABASE_URL in .env.local"
    echo "3. Run 'npm run prisma:generate'"
    echo "4. Test the application"
else
    echo ""
    echo "========================================"
    echo "Data migration failed!"
    echo "========================================"
    echo ""
    echo "Check the error messages above."
    echo "If needed, restore from backup:"
    echo "  cp '$backup_file' 'itsm.db'"
    exit 1
fi