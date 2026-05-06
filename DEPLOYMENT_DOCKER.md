# Docker Deployment for ITSM App

This guide explains how to run the ITSM application using Docker and Docker Compose.

## Prerequisites

- Docker Engine (version 20.10+)
- Docker Compose (version 2.0+)
- Git (to clone the repository)

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd itsm-app
   ```

2. Copy the example environment file:
   ```bash
   cp .env.docker .env
   ```
   Edit `.env` and set at least `NEXTAUTH_SECRET` (a strong secret) and `ENCRYPTION_KEY`.

3. Build and start the container:
   ```bash
   docker-compose up --build -d
   ```

4. Wait for the container to start (check logs with `docker-compose logs -f`). The application will be available at [http://localhost:3000](http://localhost:3000).

5. The database (SQLite) will be automatically initialized with seed data on first run. The SQLite file is stored in a Docker volume named `itsm-data`.

## Docker Compose Configuration

The `docker-compose.yml` defines a single service `itsm-app` with:

- Port 3000 exposed
- SQLite database stored in persistent volume `itsm-data`
- Health check using curl
- Environment variables from `.env` file

### Customizing the Database

By default, the app uses SQLite. To switch to PostgreSQL, uncomment the `postgres` service in `docker-compose.yml` and adjust the `DATABASE_URL` environment variable.

## Building the Docker Image Manually

You can build the Docker image without Docker Compose:

```bash
docker build -t itsm-app .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -v itsm-data:/app/.data \
  --env-file .env \
  itsm-app
```

## Environment Variables

Required environment variables (see `.env.docker` for examples):

- `DATABASE_URL`: Database connection string (SQLite default: `postgresql://postgres:D090799t@localhost:5432/itsm?schema=public`)
- `NEXTAUTH_URL`: The base URL of your application (e.g., `http://localhost:3000`)
- `NEXTAUTH_SECRET`: A secret key for NextAuth.js (min 32 characters)
- `ENCRYPTION_KEY`: Encryption key for secure data (min 32 characters)

Optional:
- `DEMO_ADMIN_PASSWORD`, `DEMO_AGENT_PASSWORD`, `DEMO_USER_PASSWORD`: Passwords for demo accounts.

## How the Application Works in Docker

1. **Entrypoint Script**: The container runs `docker-entrypoint.sh` on startup, which:
   - Creates the database directory if missing.
   - Runs Prisma migrations (`prisma migrate deploy`).
   - Seeds the database with sample data (`npm run seed`) if the database file does not exist.
   - Starts the Next.js production server (`npm start`).

2. **Data Persistence**: The SQLite database file is stored in the Docker volume `itsm-data`. To backup, you can copy the volume data.

3. **Notifications & Real‑Time Updates**: The application uses client‑side polling (every 30 seconds) to fetch new notifications. When a ticket status changes, the server creates a notification of type `ticket_status_changed`. The client receives this notification and automatically refreshes the ticket list via a custom event listener. This functionality works out‑of‑the‑box in the Docker environment.

## Troubleshooting

### Container fails to start with permission errors

Ensure the Docker volume is writable by the non‑root user inside the container. You can run:

```bash
docker-compose down -v
docker-compose up --build
```

This will recreate the volume with correct ownership.

### Health check fails

The health check pings `http://localhost:3000/`. If the application takes longer to start, increase `start_period` in the compose file. Check logs with `docker-compose logs itsm-app`.

### Missing notifications or ticket list not updating

Verify that the notification polling is working by checking the browser’s network tab for calls to `/api/notifications`. The polling interval is 30 seconds. Also ensure the notification bell component is present (top‑right corner) and displays unread counts.

### Database not seeding

If the database file already exists (from a previous run), seeding is skipped. To force a reseed, remove the volume and restart:

```bash
docker-compose down -v
docker-compose up --build
```

## Development with Docker

For development, you may want to mount the source code as a volume and enable hot‑reload. Adjust the `docker-compose.yml`:

```yaml
volumes:
  - .:/app
  - /app/node_modules
  - /app/.next
```

And change the command to `npm run dev`. Remember to rebuild the Prisma client after schema changes.

## Production Considerations

- Use a strong `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`.
- Consider using PostgreSQL for production (uncomment the postgres service and adjust `DATABASE_URL`).
- Set up a reverse proxy (Nginx, Traefik) for SSL termination.
- Monitor container resources and logs.

## Cleanup

To stop and remove containers, volumes, and images:

```bash
docker-compose down -v --rmi all
```

This will delete the database volume (all data will be lost).