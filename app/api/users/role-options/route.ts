import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const nextRequest = new NextRequest(request.url, request);

    const authResult = await withAuth({
      roles: [Role.ADMIN],
      permissions: ["users.view"],
    })(nextRequest);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const customRoles = await prisma.customRole.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      standardRoles: [
        { value: "END_USER", label: "End User" },
        { value: "AGENT", label: "Agent" },
        { value: "ADMIN", label: "Admin" },
      ],
      customRoles,
    });
  } catch (error) {
    console.error("GET /api/users/role-options error:", error);
    return NextResponse.json(
      { error: "Failed to fetch role options" },
      { status: 500 }
    );
  }
}
