# Security Policy Matrix

| Surface | Required Permission(s) | Enforcement Point |
|---|---|---|
| Roles page | `roles.view` | `app/roles/page.tsx` |
| Roles server actions | `roles.view/create/update/delete/assign` | `app/roles/actions.ts` |
| Permission matrix updates | `roles.update` | `app/roles/matrix/actions.ts` |
| Reports page | `reports.view` | `app/reports/page.tsx` |
| Report read operations | `reports.view` | `app/reports/actions.ts` |
| Report generation/edit summary | `reports.create` | `app/reports/actions.ts` |
| Report export/email/download/delete | `reports.export` | `app/reports/actions.ts` |
| Settings read | `settings.view` | `app/settings/actions.ts` |
| Settings integration write/test | `settings.manage_integrations` | `app/settings/actions.ts` |
| Knowledge read | `knowledge.view` | `app/knowledge/actions.ts` |
| Knowledge writes | `knowledge.create/update/delete` | `app/knowledge/actions.ts` |
| Assets actions | `assets.view/create/update/delete` | `app/assets/actions.ts` |
| Tickets actions | `tickets.view/update/create` | `app/tickets/actions.ts`, `app/tickets/new/actions.ts` |
| Automation actions | `automation.view/create/update/delete/execute` | `app/automation/actions.ts` |
| Analytics actions | `analytics.view` | `app/analytics/actions.ts` |
| Assignable users API | `tickets.assign` | `app/api/assignable-users/route.ts` |
| Dashboard API | `dashboard.view` | `app/api/dashboard/route.ts` |
| Debug API | Admin role | `app/api/debug/route.ts` |

## Rollout Steps
1. Deploy middleware/auth changes first (fail-closed + JWT permission refresh).
2. Deploy server-action guard changes.
3. Deploy integration hardening (secret masking/encryption + SSRF checks).
4. Deploy API hardening (error leak removal + test endpoint removal).
5. Execute checklist in `docs/security-regression-checklist.md`.
