#!/bin/bash
echo "Testing PostgreSQL connection..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set."
    exit 1
fi

echo "DATABASE_URL is set."

# Try to connect using psql if available
if command -v psql &> /dev/null; then
    echo "Using psql to test connection..."
    psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null
    if [ $? -eq 0 ]; then
        echo "SUCCESS: PostgreSQL connection test passed."
        exit 0
    else
        echo "ERROR: PostgreSQL connection test failed with psql."
    fi
fi

# Fallback to using Prisma CLI
echo "Trying Prisma CLI..."
npx prisma db execute --file ../../db/test_postgresql.sql &> /dev/null
if [ $? -eq 0 ]; then
    echo "SUCCESS: PostgreSQL connection test passed via Prisma."
    exit 0
else
    echo "ERROR: PostgreSQL connection test failed via Prisma."
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Ensure PostgreSQL is running on localhost:5432"
    echo "2. Verify the username and password in DATABASE_URL are correct"
    echo "3. Check if the database 'itsm' exists"
    echo "4. Ensure the PostgreSQL user has access to the database"
    exit 1
fi