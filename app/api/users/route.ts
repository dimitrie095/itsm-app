import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/enums";
import bcrypt from "bcryptjs";
import { createAuditLogFromRequest } from "@/lib/logging/audit";
import { sendOutlookEmail } from "@/lib/outlook-mailer";
import { apiError, apiSuccess } from "@/lib/api-response";

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
    
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
    const search = (searchParams.get("search") || "").trim()
    const paginate = searchParams.get("paginate") === "true"

    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { department: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        customRole: {
          select: {
            id: true,
            name: true,
          },
        },
        department: true,
        createdAt: true,
        avatarUrl: true,
      },
      orderBy: { createdAt: "desc" },
      ...(paginate ? { skip: (page - 1) * limit, take: limit } : { take: limit }),
    });

    if (!paginate) {
      return NextResponse.json({
        success: true,
        data: users,
        users,
      });
    }

    const total = await prisma.user.count({ where: whereClause })
    const payload = {
      users,
      total,
      pagination: {
        page,
        limit,
        hasMore: page * limit < total,
      },
    }
    return NextResponse.json({
      success: true,
      data: payload,
      ...payload,
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return apiError("Failed to fetch users", 500);
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
    const { email, name, role, customRoleId, department, password } = body;
    
    // Validation
    if (!email) {
      return apiError("Email is required", 400);
    }
    
    if (!password) {
      return apiError("Password is required", 400);
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return apiError("User with this email already exists", 409);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Resolve role assignment (standard/custom)
    const resolvedRole = role in Role ? role : Role.END_USER;
    let resolvedCustomRoleId: string | null = null;
    if (resolvedRole === Role.CUSTOM) {
      if (!customRoleId || typeof customRoleId !== "string") {
        return NextResponse.json(
          { error: "customRoleId is required when role is CUSTOM" },
          { status: 400 }
        );
      }
      const customRole = await prisma.customRole.findUnique({
        where: { id: customRoleId },
        select: { id: true, isActive: true },
      });
      if (!customRole || !customRole.isActive) {
        return apiError("Selected custom role is not available", 400);
      }
      resolvedCustomRoleId = customRole.id;
    }

    // Create user
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          email,
          name: name || null,
          role: resolvedRole,
          customRoleId: resolvedCustomRoleId,
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
          role: resolvedRole,
          customRoleId: resolvedCustomRoleId,
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

    // Hard guarantee: set reset-required flag even when create fallback path was used.
    // This helps when Prisma Client and DB schema are temporarily out of sync.
    try {
      await prisma.$executeRaw`UPDATE "users" SET "mustChangePassword" = true WHERE "id" = ${newUser.id}`;
    } catch (flagError) {
      if (!String(flagError).toLowerCase().includes("mustchangepassword")) {
        console.warn("Unable to force mustChangePassword flag:", flagError);
      }
    }

    const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your Ponturo ITSM account is ready</h2>
        <p>Hello ${newUser.name || newUser.email},</p>
        <p>An account was created for you.</p>
        <p><strong>Login:</strong> ${newUser.email}</p>
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
    
    return apiSuccess(newUser, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return apiError("Failed to create user", 500);
  }
}