# Security Regression Checklist

## Authentication and Route Protection
- Unauthenticated access to protected routes redirects to `/login`.
- Authenticated users with `mustChangePassword=true` are forced to `/reset-initial-password`.
- Authenticated users without reset requirement cannot access `/reset-initial-password`.

## Authorization (Server Actions)
- `roles/*` actions require `roles.*` permissions.
- `reports/*` actions require `reports.view/create/export` permissions.
- `settings/*` integration actions require `settings.view` or `settings.manage_integrations`.
- `knowledge/*` write actions require matching `knowledge.*` permissions.
- `tickets/assets/automation/analytics` actions require matching domain permissions.

## API Error Exposure
- API 500 responses do not return internal stack traces or raw `error.message`.
- `app/api/debug/route.ts` does not leak stack traces in responses.

## Integration Security
- Outlook SMTP password is write-only in UI and not returned from server actions.
- Teams webhook URL is write-only in UI and not returned from server actions.
- Webhook URL validation rejects non-HTTPS and private/local targets.
- Teams sender rejects invalid/private webhook URLs at runtime.

## Injection and Output Encoding
- Email HTML templates escape user-controlled fields.
- Teams message payload text/title sanitizes user-controlled content.
- Report email subject/body HTML escapes user-controlled content.

## Raw SQL Safety
- Runtime code paths use safe `$executeRaw` / `$queryRaw` instead of unsafe variants.
- Login/auth flow contains no runtime schema migration/DDL.

## Operational Hardening
- `next.config.js` has `typescript.ignoreBuildErrors=false`.
- `/api/test` endpoint is removed.

## Notes from Current Verification Run
- `npm run lint` currently fails due to ESLint package/config incompatibility:
  - `Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './config' is not defined by "exports"...`
  - This appears to be repository tooling/config drift, not introduced by this security patch set.
