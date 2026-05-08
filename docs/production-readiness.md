# Production Readiness Gates

This document defines the minimum technical release gates required before deploying to production.

## Runtime health endpoints

- Liveness: `GET /api/health`
  - Expected response: `200` with `{ status: "ok" }`
- Readiness: `GET /api/ready`
  - Expected response: `200` only when:
    - required environment variables exist (`DATABASE_URL`, `NEXTAUTH_SECRET`)
    - database is reachable (`SELECT 1`)
  - Returns `503` when the app should not receive production traffic.

## Mandatory pre-release checks

Run the full gate:

```bash
npm run production:gate
```

The gate executes these checks in order:

1. `npm run build`
2. `npm run test:security`
3. `npm run test:e2e:core`
4. `npm run test:e2e:roles`

Any failure blocks release.

## Post-deploy smoke gate

After deployment/startup, run:

```bash
npm run deployment:smoke
```

The smoke gate polls:

- `GET /api/health` (expects `200`)
- `GET /api/ready` (expects `200`)

If readiness stays non-200 (for example `503`) until retry budget is exhausted, the script exits with error to stop rollout.

Config via env vars:

- `SMOKE_BASE_URL` (default: `http://localhost:3000`)
- `SMOKE_MAX_ATTEMPTS` (default: `20`)
- `SMOKE_RETRY_DELAY_MS` (default: `3000`)
- `SMOKE_REQUEST_TIMEOUT_MS` (default: `5000`)

## Load test baseline

Authenticated load scenarios are available:

- `npm run test:load:20`
- `npm run test:load:50`
- `npm run test:load:100`

Recommended process:

1. run on staging with production-like data
2. compare p50/p95/p99 against previous baseline
3. release only if error rate and latency remain within target limits
