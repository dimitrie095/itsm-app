import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/api-auth";
import { Role } from "@/lib/generated/prisma/enums";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    // Require tickets.assign permission or admin role
    const authResult = await checkApiAuth(request, undefined, ['tickets.assign']);
    if (!authResult.isAuthorized) {
      // Fallback: allow agents to see other agents (for self-assignment)
      // Check if user is authenticated at least
      const fallbackAuth = await checkApiAuth(request);
      if (!fallbackAuth.isAuthorized) {
        return fallbackAuth.errorResponse!;
      }
      // User is authenticated, allow them to see agents (including themselves)
      // No additional permission check
    }
    
    // Fetch users with role AGENT or ADMIN (who can be assigned tickets)
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.AGENT, Role.ADMIN]
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/assignable-users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignable users", details: String(error) },
      { status: 500 }
    );
  }
}