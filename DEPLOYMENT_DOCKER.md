# Docker Deployment for ITSM App

This project uses:
- `docker-compose.yml` as a shared base
- `docker-compose.test.yml` for integration test/staging environment
- `docker-compose.prod.yml` for production environment

The stack is PostgreSQL-first and runs Prisma migrations on app startup.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2+

## Environment Files

Create environment files from examples:

```bash
cp .env.test.example .env.test
cp .env.prod.example .env.prod
```

Set required values at minimum:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `POSTGRES_*` values

## Integration Test/Staging Environment

Start:

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml --env-file .env.test up -d --build
```

Follow logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml --env-file .env.test logs -f itsm-app
```

Stop:

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml --env-file .env.test down
```

App URL (default): `http://localhost:3001`

## Production Environment

Start:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Follow logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod logs -f itsm-app
```

Stop:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod down
```

App URL (default): `http://localhost:${APP_PORT:-3000}`

## Startup Behavior

On each container start, `docker-entrypoint.sh`:
1. Validates `DATABASE_URL` format (`postgresql://...`)
2. Runs `npx prisma migrate deploy` with retry logic
3. Optionally runs `npm run seed` when `RUN_SEED_ON_START=true`
4. Starts the app with `npm start`

## Validation Checklist

After boot for each environment, verify:
- Image build completes successfully
- Database container is healthy (`docker compose ps`)
- App health endpoint returns success: `/api/ready`
- Prisma migrations were applied (check app logs)
- App loads at configured host/port

## Cleanup

Remove stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml --env-file .env.test down -v
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod down -v
```