#!/bin/sh
set -e

# Set default database URL if not set
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgresql://postgres:D090799t@postgres:5432/itsm?schema=public"
    echo "DATABASE_URL not set, using default: $DATABASE_URL"
else
    echo "DATABASE_URL is already set"
fi

# Log database URL (with masked password)
DB_URL_LOG=$(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')
echo "Database URL: $DB_URL_LOG"

# Extract database file path from SQLite URL
if echo "$DATABASE_URL" | grep -q '^file:'; then
    DB_FILE=$(echo "$DATABASE_URL" | sed 's/file://')
    # Ensure directory exists
    mkdir -p "$(dirname "$DB_FILE")"
    # If database file does not exist, run migrations and seed
    if [ ! -f "$DB_FILE" ]; then
        echo "Database file not found. Initializing database..."
        npx prisma migrate deploy
        npm run seed
    else
        echo "Database file exists. Skipping initialization."
    fi
else
    # Für PostgreSQL
    echo "Warte auf Datenbank-Bereitschaft..."
    
    # Optional: Ein kleiner Check ob wir im Dev-Modus sind
    if [ "$NODE_ENV" = "production" ]; then
        echo "Produktions-Modus: Starte npx prisma migrate deploy"
        npx prisma migrate deploy
    else
        echo "Development-Modus: Nutze db push für schnelle Synchronisation"
        npx prisma db push --accept-data-loss
    fi

    # Prüfe ob der Befehl erfolgreich war
    if [ $? -eq 0 ]; then
        echo "Datenbank erfolgreich synchronisiert."
    else
        echo "WARNUNG: Datenbank-Sync fehlgeschlagen! Die App startet trotzdem..."
    fi
fi

# Start the application
exec "$@"