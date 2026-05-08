import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/enums";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const nextRequest = new NextRequest(request.url, request)
    const authResult = await withAuth({ permissions: ['tickets.assign'] })(nextRequest);
    if (authResult instanceof NextResponse) {
      return authResult;
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
      { error: "Failed to fetch assignable users" },
      { status: 500 }
    );
  }
}