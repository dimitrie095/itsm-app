#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required."
  exit 1
fi

if ! echo "$DATABASE_URL" | grep -q '^postgresql://'; then
  echo "DATABASE_URL must start with postgresql://"
  exit 1
fi

DB_URL_LOG=$(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')
echo "Using DATABASE_URL: $DB_URL_LOG"

MAX_RETRIES="${DB_MIGRATION_RETRIES:-20}"
RETRY_DELAY="${DB_MIGRATION_RETRY_DELAY_SECONDS:-3}"
ATTEMPT=1

echo "Applying Prisma migrations..."
until npx prisma migrate deploy; do
  if [ "$ATTEMPT" -ge "$MAX_RETRIES" ]; then
    echo "Migration failed after $ATTEMPT attempts."
    exit 1
  fi
  echo "Migration attempt $ATTEMPT failed, retrying in ${RETRY_DELAY}s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$RETRY_DELAY"
done

if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
  echo "RUN_SEED_ON_START=true, running seed..."
  npm run seed
fi

# Start the application
exec "$@"