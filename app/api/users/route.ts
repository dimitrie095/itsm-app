import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/enums";
import bcrypt from "bcryptjs";
import { createAuditLogFromRequest } from "@/lib/logging/audit";
import { sendOutlookEmail } from "@/lib/outlook-mailer";

export const runtime = "nodejs";

function isMissingMustChangePasswordColumn(error: unknown) {
  return String(error).includes("Unknown argument `mustChangePassword`");
}

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
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          email,
          name: name || null,
          role: role in Role ? role : Role.END_USER,
          department: department || null,
          passwordHash: hashedPassword,
          mustChangePassword: true,
        } as any,
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
    } catch (createError) {
      if (!isMissingMustChangePasswordColumn(createError)) {
        throw createError;
      }
      newUser = await prisma.user.create({
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
    }

    const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your Ponturo ITSM account is ready</h2>
        <p>Hello ${newUser.name || newUser.email},</p>
        <p>An account was created for you.</p>
        <p><strong>Login:</strong> ${newUser.email}<br/>
        <strong>Initial password:</strong> ${password}</p>
        <p>Please sign in using this link: <a href="${loginUrl}">${loginUrl}</a></p>
        <p>You will be asked to change your password immediately after your first login.</p>
      </div>
    `;

    try {
      await sendOutlookEmail({
        to: newUser.email,
        subject: "Your Ponturo ITSM login details",
        html: welcomeHtml,
      });
    } catch (mailError) {
      console.error("Failed to send new user credentials email:", mailError);
    }
    
    // Audit log for user creation
    await createAuditLogFromRequest(nextRequest, {
      action: "USER_CREATE",
      entityType: "User",
      entityId: newUser.id,
      userId: user!.id,
      details: {
        createdBy: user!.id,
        newUserId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
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