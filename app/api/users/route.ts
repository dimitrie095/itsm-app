import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/enums";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    // Convert Request to NextRequest for middleware compatibility
    const nextRequest = new NextRequest(request.url, request)
    
    // Only admins can list users
    const authResult = await withAuth({ 
      roles: [Role.ADMIN],
      permissions: ['users.view']
    })(nextRequest)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }
    
    const { user, session } = authResult
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        createdAt: true,
        avatarUrl: true,
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Convert Request to NextRequest for middleware compatibility
    const nextRequest = new NextRequest(request.url, request)
    
    // Check authentication and authorization - only admins can create users
    const authResult = await withAuth({ 
      roles: [Role.ADMIN],
      permissions: ['users.create']
    })(nextRequest)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }
    
    const { user, session } = authResult
    
    const body = await request.json();
    const { email, name, role, department, password } = body;
    
    // Validation
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null,
        role: role in Role ? role : Role.END_USER,
        department: department || null,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        createdAt: true,
        avatarUrl: true,
      },
    });
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { error: "Failed to create user", details: String(error) },
      { status: 500 }
    );
  }
}