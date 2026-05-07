import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ mustChangePassword: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    return NextResponse.json({
      mustChangePassword: Boolean((user as any)?.mustChangePassword),
    });
  } catch (_error) {
    return NextResponse.json({ mustChangePassword: false });
  }
}

