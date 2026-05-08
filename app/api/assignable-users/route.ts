import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/enums";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const nextRequest = new NextRequest(request.url, request)
    const target = nextRequest.nextUrl.searchParams.get("target")
    const requiredPermission = target === "assets" ? "assets.assign" : "tickets.assign"
    const authResult = await withAuth({ permissions: [requiredPermission] })(nextRequest);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    // For assets allow all users, for tickets keep AGENT/ADMIN restriction.
    const whereClause = target === "assets"
      ? {}
      : {
          role: {
            in: [Role.AGENT, Role.ADMIN]
          }
        }

    const users = await prisma.user.findMany({
      where: whereClause,
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