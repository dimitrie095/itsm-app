import {
  checkApiAuth as checkApiAuthCore,
  checkTicketAccess as checkTicketAccessCore,
  withApiAuth as withApiAuthCore,
  withShortcutAuth as withShortcutAuthCore,
} from "@/lib/api-auth"

/**
 * DEPRECATED COMPAT LAYER:
 * Keep the old module path but delegate to `@/lib/api-auth`
 * to avoid duplicated auth logic.
 */
export const checkApiAuth = checkApiAuthCore
export const checkTicketAccess = checkTicketAccessCore
export const withApiAuth = withApiAuthCore
export const withShortcutAuth = withShortcutAuthCore

/**
 * Migration guide for updating API routes:
 * 
 * OLD:
 * ```typescript
 * import { checkApiAuth } from '@/lib/api-auth'
 * 
 * export async function GET(request: Request) {
 *   const authResult = await checkApiAuth(request)
 *   if (!authResult.isAuthorized) {
 *     return authResult.errorResponse!
 *   }
 *   // ... rest of function
 * }
 * ```
 * 
 * NEW:
 * ```typescript
 * import { withAuth } from '@/lib/auth/middleware'
 * 
 * export async function GET(request: NextRequest) {
 *   const authResult = await withAuth()(request)
 *   if (authResult instanceof NextResponse) {
 *     return authResult // Error response
 *   }
 *   const { user, session } = authResult
 *   // ... rest of function
 * }
 * ```
 * 
 * For role-based access:
 * ```typescript
 * const authResult = await withAuth({ roles: [Role.ADMIN, Role.AGENT] })(request)
 * ```
 * 
 * For permission-based access:
 * ```typescript
 * const authResult = await withAuth({ permissions: ['tickets.read'] })(request)
 * ```
 */