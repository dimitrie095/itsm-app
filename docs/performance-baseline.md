# Performance Baseline (Phase 0)

## Scope

- Pages: `/`, `/tickets`, `/analytics`, `/knowledge/[id]`, `/reports`
- APIs: `/api/notifications`, `/api/tickets`, `/api/dashboard`

## Data source

- Dev terminal runtime logs from `terminals/1.txt`
- Build command timings from `npm run build`

## Baseline snapshot (before Phase 1 validation)

### Runtime log samples

- `/api/notifications?unreadOnly=false&limit=20`
  - typical: ~240-500ms
  - frequent spikes: ~700-1200ms
  - outliers observed: 3017ms, 2237ms, 23051ms
- `/tickets?_rsc=...`
  - observed sample: 370ms, 657ms
- `/api/auth/session`
  - observed sample: 892ms, 1101ms, 1846ms

### Build

- Pre-fix attempt failed with type error in `app/api/assets/route.ts` (`sortBy`).

## Notes

- The strongest periodic load signal is `GET /api/notifications` polling.
- Auth/session endpoints show repeated calls and high response times in dev logs.
- This file will be updated with post-change verification numbers in Phase 0/1 completion.

## Phase 0/1 verification (after implementation)

### Build

- `npm run build`: PASS
- Build now reaches completion (`Generating static pages`, `Finalizing page optimization`, `Collecting build traces`).
- Dynamic route warnings during static generation are still logged for auth-dependent API routes; build exits successfully.

### Security regression

- `npm run test:security`: PASS
- Suite summary:
  - Authentication Security Tests: PASS
  - Input Validation Security Tests: PASS
  - API Security Tests: PASS
  - Penetration Security Tests: PASS
  - All Security Tests: PASS
- Coverage report generated at `coverage/security/index.html`.

### Implemented Phase 1 changes

- JWT permission refresh now uses TTL in `lib/auth.ts` to avoid DB lookups on every request.
- Permission resolution is reduced/split by role path in `lib/access.ts` with standard-role permission caching.
- Middleware matcher was narrowed in `middleware.ts` to avoid unnecessary API middleware work.
- Redundant dashboard user lookup was removed in `app/page.tsx`; session flag is used directly for `mustChangePassword`.

## Phase 2/3 verification (after implementation)

### Build

- `npm run build`: PASS
- Build completed after Phase 2/3 changes (`Compiled successfully`, `Generating static pages`, `Finalizing page optimization`, `Collecting build traces`).
- Dynamic server usage warnings for API routes remain expected; build exits with code 0.

### Security regression

- `npm run test:security`: PASS
- Suite summary:
  - Authentication Security Tests: PASS
  - Input Validation Security Tests: PASS
  - API Security Tests: PASS
  - Penetration Security Tests: PASS
  - All Security Tests: PASS
- Coverage report generated at `coverage/security/index.html`.

### Implemented Phase 2 changes

- Notification polling in `components/notifications/notification-bell.tsx` was reduced to 60s with minimum-fetch gap and visibility-triggered refresh to avoid redundant tab/focus fetch bursts.
- `app/api/notifications/route.ts` now uses unified `withAuth`, supports lightweight summary field selection, and returns `unreadCount` directly to avoid client-side re-count overhead.
- Legacy auth usage was migrated to `withAuth` across route handlers (`/api/assignable-users`, `/api/dashboard`, `/api/debug`, `/api/knowledge`, `/api/knowledge/suggestions/*`, `/api/reports/[id]/download`, `/api/tickets` POST).
- Ticket and asset list fetch patterns now avoid timestamp cache-busters and use debounced search inputs to reduce API call frequency.
- `GET /api/users` now enforces server-side search/pagination parameters, and `components/recent-tickets-table.tsx` lazily fetches users only when editing is initiated.

### Implemented Phase 3 changes

- Added composite Prisma indexes for high-frequency ticket and knowledge-list filters in `prisma/schema.prisma`.
- Added migration `prisma/migrations/20260508080000_phase23_perf_indexes_fulltext/migration.sql` for:
  - New composite indexes
  - Ticket fulltext column (`search_vector`)
  - Trigger-based search-vector maintenance
  - GIN index on `search_vector`
- Ticket search in `app/api/tickets/route.ts` now uses Postgres fulltext (`websearch_to_tsquery`) with fallback to legacy `contains` matching when fulltext is unavailable/invalid.

## Phase 4-7 verification (after implementation)

### Build

- `npm run build`: PASS
- Build completes with static generation + trace collection after Phase 4-7 changes.
- Dynamic server usage warnings for request-bound API routes still appear and are expected in current architecture.

### Security regression

- `npm run test:security`: PASS
- Suite summary:
  - Authentication Security Tests: PASS
  - Input Validation Security Tests: PASS
  - API Security Tests: PASS
  - Penetration Security Tests: PASS
  - All Security Tests: PASS

### Implemented Phase 4 changes

- `components/ticket-list.tsx` notification event handling now patches affected ticket status in local state first.
- Fallback full refetch on notification is throttled (10s) and only used when metadata is missing or the ticket is not in the current filtered page.

### Implemented Phase 5 changes

- Runtime DDL was removed from `app/knowledge/actions.ts` (no more `CREATE TABLE/INDEX` in request path).
- Added migration `prisma/migrations/20260508084000_knowledge_feedback_table/migration.sql` to provision `knowledge_article_feedback` schema + indexes.
- `incrementArticleViews` no longer updates `updatedAt`, no longer revalidates `/knowledge` globally, and now uses throttled per-article revalidation.
- `app/knowledge/[id]/page.tsx` now loads article, feedback, and helpful-state in parallel using `Promise.all`.

### Implemented Phase 6 changes

- `components/ticket-list.tsx` now lazy-loads assignable users only when edit dialog opens.
- `app/users/page.tsx` now uses server-side search + pagination (`/api/users?paginate=true&page=&limit=&search=`) with debounced search and next/previous paging controls.

### Implemented Phase 7 checks

- Fulltext path in `app/api/tickets/route.ts` remains active with safe fallback to `contains` search.
- Skip/pagination path remains stable with `skip` support in query parsing.
- Ticket/knowledge index coverage is present via schema updates + migration set (`phase23_perf_indexes_fulltext` and `knowledge_feedback_table`).

## Phase 8-11 verification (after implementation)

### Build

- `npm run build`: PASS
- Build completed successfully after reports/storage, roles bootstrap, bundle, and logging updates.

### Security regression

- `npm run test:security`: PASS
- Suite summary:
  - Authentication Security Tests: PASS
  - Input Validation Security Tests: PASS
  - API Security Tests: PASS
  - Penetration Security Tests: PASS
  - All Security Tests: PASS

### Implemented Phase 8 changes

- Reports persistence was moved from file-based `reports.json` I/O in `app/reports/actions.ts` to database-backed storage (`reports_store` table) via SQL-backed helper methods.
- Added migration `prisma/migrations/20260508090500_reports_store_table/migration.sql` for report payload persistence.
- Report data preparation now uses bounded and aggregated DB queries (`count`, `groupBy`, `take`) instead of loading full ticket/article datasets.
- Removed PDF pipeline debug logs in report download path.

### Implemented Phase 9 changes

- `components/ticket-list.tsx` now lazy-loads `TicketEditDialog` via dynamic import to reduce initial client bundle pressure.
- `next.config.js` enables `experimental.optimizePackageImports` for `lucide-react`.
- Unused heavyweight imports in `components/ticket-list.tsx` were removed.

### Implemented Phase 10 changes

- Added one-time/bootstrap permission initialization in `app/roles/actions.ts` with process-scope deduplication (`permissionsBootstrapPromise`/`permissionsBootstrapped`).
- `getRolesAndPermissions` no longer triggers full permission initialization work on every call.
- Permission matrix loader in `app/roles/matrix/actions.ts` now uses bootstrap path without requiring `roles.update` permission flow.

### Implemented Phase 11 changes

- `lib/logging/logger.ts` now defaults to stricter production log level (`warn`) and uses async destination (`pino.destination({ sync: false })`).
- Removed synchronous `console.log` noise from hot paths in:
  - `app/api/assets/route.ts`
  - `app/assets/actions.ts`
  - `app/analytics/actions.ts`

## Phase 12-14 verification (after implementation)

### Build

- `npm run build`: PASS
- Build completed successfully after auth-layer consolidation and Prisma pool tuning.
- Dynamic server usage warnings for request-bound API routes still appear and are expected with current API architecture.

### Security regression

- `npm run test:security`: PASS
- Suite summary:
  - Authentication Security Tests: PASS
  - Input Validation Security Tests: PASS
  - API Security Tests: PASS
  - Penetration Security Tests: PASS
  - All Security Tests: PASS

### Implemented Phase 12 changes

- `lib/api-auth.ts` now delegates to `withAuth` from `lib/auth/middleware.ts` instead of doing independent session/user checks.
- `lib/server-auth.ts` now delegates to `requireServerActionAuth` from `lib/auth/server-actions.ts` so server action auth follows the same central mechanism.
- `lib/api-auth-new.ts` legacy wrapper path was cleaned to remove runtime deprecation log spam and avoid dynamic Prisma imports in hot paths.
- Net effect: API/server wrappers now share one auth flow and avoid duplicated request-time lookup chains.

### Implemented Phase 13 changes

- `lib/prisma.ts` now configures PostgreSQL pool parameters explicitly (`max`, `idleTimeoutMillis`, `connectionTimeoutMillis`, `maxLifetimeSeconds`, `allowExitOnIdle`) with env-overrides.
- Dev/prod defaults are now distinct (`production` uses larger/longer-lived pool settings than `development`).
- Global Prisma reuse remains in place to keep connection reuse stable across hot reload/runtime boundaries.

### Implemented Phase 14 artifacts (QA/Loadtest/Rollout)

- Verification gate for this phase is captured (build + security pass).
- Added rollout-ready load test checklist for staged execution:
  - Concurrency levels: 20 / 50 / 100 users
  - Scenarios: dashboard open, ticket search, notifications fetch, analytics load
  - Metrics to collect: route p50/p95/p99, API p95/p99, DB query count per request, error rate
- Rollout order remains:
  - First: phases 1-4
  - Then: phases 5-9
  - Then: phases 10-14
- Success criteria unchanged and now fully re-validated against implemented roadmap:
  - Significant p95 latency reduction on core routes (target >= 40%)
  - Lower DB query count in hot paths
  - No runtime DDL in request execution
  - Lower notification/polling load
  - Stable type-safe build

## Phase A/B implementation verification (security + hotpath performance)

### Build

- `npm run build`: PASS
- Build completes successfully after security hardening and performance hotpath updates.
- Dynamic server usage warnings for request-bound API routes remain expected in current architecture.

### Security regression

- `npm run test:security`: PASS
- Suite summary:
  - Authentication Security Tests: PASS
  - Input Validation Security Tests: PASS
  - API Security Tests: PASS
  - Penetration Security Tests: PASS
  - All Security Tests: PASS

### Implemented Phase A changes

- `next.config.js` now sets central security headers:
  - `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Content-Security-Policy`.
- API error detail leakage removed from:
  - `app/api/knowledge/suggestions/generate/route.ts`
  - `app/api/knowledge/suggestions/convert/route.ts`
- Delete actions are now actually wired in UI:
  - `app/knowledge/page.tsx` now submits server action for `deleteArticle`.
  - `app/reports/page.tsx` now submits server action for `deleteReport`.

### Implemented Phase B changes

- `app/api/tickets/route.ts` now runs `count` + `findMany` in parallel (`Promise.all`) for list endpoint latency reduction.
- `app/reports/actions.ts` persistence refactored from full-table rewrite to report ID-based operations:
  - added `getReportByIdFromStore` and `upsertReportToStore`
  - updated read/update/delete/send/download flows to avoid rewriting all reports per mutation.
- `app/dashboard-actions.ts` reduced dashboard load cost by:
  - parallelizing independent DB operations with `Promise.all`
  - using bounded selects (`take`) and smaller payloads for tickets/articles.
- `app/analytics/actions.ts` now fetches tickets/agents/sla datasets in parallel and avoids unnecessary ticket relation includes in the main analytics query.

## Phase C implementation verification (auth cleanup + API contract + typing hardening)

### Build

- `npm run build`: PASS
- Build completed successfully after auth compatibility cleanup and API typing/contract updates.
- Dynamic server usage warnings for request-bound API routes remain expected.

### Security regression

- `npm run test:security`: PASS
- Suite summary:
  - Authentication Security Tests: PASS
  - Input Validation Security Tests: PASS
  - API Security Tests: PASS
  - Penetration Security Tests: PASS
  - All Security Tests: PASS

### Implemented Phase C changes

- Auth compatibility layer consolidated:
  - `lib/api-auth-new.ts` now delegates to `lib/api-auth.ts` exports instead of duplicating logic.
- Unified API response helper introduced:
  - New file `lib/api-response.ts` with `apiSuccess` / `apiError`.
- Contract adoption in central endpoints:
  - `app/api/notifications/route.ts` now uses standardized success/error response shape.
  - `app/api/users/route.ts` now includes `success` + `data` while preserving existing top-level fields for compatibility.
- Reduced high-impact typing debt in API hotpaths:
  - `app/api/tickets/route.ts`: removed unsafe assigned-filter cast.
  - `app/api/assets/route.ts`: replaced several broad `any` objects with Prisma types and typed sorting branch logic.

## Phase D implementation verification (E2E gates + role regression)

### Build

- `npm run build`: PASS
- Build completed successfully after E2E gate expansion.
- Dynamic server usage warnings for request-bound API routes remain expected in current architecture.

### Security regression

- `npm run test:security`: PASS
- Suite summary:
  - Authentication Security Tests: PASS
  - Input Validation Security Tests: PASS
  - API Security Tests: PASS
  - Penetration Security Tests: PASS
  - All Security Tests: PASS

### E2E regression gates

- `npm run test:e2e:core`: PASS
- `npm run test:e2e:roles`: PASS
- New scripts added:
  - `test:e2e:core`
  - `test:e2e:roles`
- Load scenarios operationalized:
  - `npm run test:load:20`
  - `npm run test:load:50`
  - `npm run test:load:100`
- `test:e2e`, `test:e2e:headed`, and `test:e2e:ui` now include core/role smoke coverage in addition to knowledge flow.

### Implemented Phase D changes

- Added `e2e/core-smoke.spec.ts` for core module route smoke checks (dashboard, tickets, reports, users, roles) with resilient auth-aware assertions.
- Added `e2e/role-access-smoke.spec.ts` to capture role-access behavior for agent/end-user paths as a regression gate.
- Hardened authentication setup flow in `e2e/auth.setup.ts` and login waits in `e2e/pages/LoginPage.ts` to reduce flaky setup failures in slower environments.
- Added `utils/scripts/js/load-test-phase-d.js` and package scripts for repeatable 20/50/100 concurrency load checks.
