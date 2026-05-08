import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/enums";
import { getRequestLogger } from "@/lib/logging/middleware";
import { createAuditLogFromRequest } from "@/lib/logging/audit";
import { userSchema } from "@/lib/validation/schemas";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";

// Custom user update schema without isActive field
const customUserUpdateSchema = userSchema.omit({ isActive: true }).partial();

// Schema for password update (admin reset)
const userPasswordUpdateSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Combined schema for user update (including password)
const userUpdateCombinedSchema = customUserUpdateSchema.merge(userPasswordUpdateSchema.partial());

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request);
  const logger = getRequestLogger(nextRequest);

  try {
    const id = params.id;
    logger.info("Fetching user", {
      category: "api",
      operation: "user_get",
      userId: id,
    });

    // Check authentication and authorization
    const authResult = await withAuth({
      permissions: ["users.view"],
    })(nextRequest);
    if (authResult instanceof NextResponse) {
      logger.warn("Authentication/authorization failed for user fetch", {
        category: "auth",
        event: "auth_failure",
      });
      return authResult;
    }

    const { user } = authResult;

    logger.debug("User authenticated for user fetch", {
      category: "auth",
      userId: user!.id,
      userRole: user!.role,
    });

    // Fetch user
    const userRecord = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        createdAt: true,
        updatedAt: true,
        avatarUrl: true,
        emailVerified: true,
        externalId: true,
        customRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!userRecord) {
      logger.warn("User not found", {
        category: "api",
        operation: "user_get",
        userId: id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Not Found",
          message: "User not found",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // If the requesting user is not an admin and trying to view another user, restrict.
    // Only allow viewing own profile or admin view any.
    if (user!.role !== Role.ADMIN && user!.id !== id) {
      logger.warn("User attempted to view another user's profile", {
        category: "auth",
        userId: user!.id,
        targetUserId: id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "You do not have permission to view this user",
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    logger.debug("User fetched successfully", {
      category: "database",
      operation: "user_get",
      userId: id,
    });

    return NextResponse.json({
      success: true,
      data: userRecord,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request);
  const logger = getRequestLogger(nextRequest);

  try {
    const id = params.id;
    logger.info("Updating user", {
      category: "api",
      operation: "user_update",
      userId: id,
    });

    // Check authentication and authorization
    // For updating user details, require users.update permission.
    // For updating role, require users.manage_roles permission (handled later).
    const authResult = await withAuth({
      permissions: ["users.update"],
    })(nextRequest);
    if (authResult instanceof NextResponse) {
      logger.warn("Authentication/authorization failed for user update", {
        category: "auth",
        event: "auth_failure",
      });
      return authResult;
    }

    const { user } = authResult;

    logger.debug("User authenticated for user update", {
      category: "auth",
      userId: user!.id,
      userRole: user!.role,
    });

    // Parse and validate request body
    const body = await request.json();
    const validatedData = userUpdateCombinedSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, customRoleId: true, email: true, name: true, department: true },
    });

    if (!existingUser) {
      logger.warn("User not found for update", {
        category: "api",
        operation: "user_update",
        userId: id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Not Found",
          message: "User not found",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Permission checks:
    // 1. Only admins can update other users (unless updating own profile?)
    // 2. Changing role requires users.manage_roles permission.
    // 3. Updating password requires users.update (admin reset) or own password change (maybe separate endpoint).
    // For simplicity: if user is not admin and trying to update another user, deny.
    if (user!.role !== Role.ADMIN && user!.id !== id) {
      logger.warn("Non-admin user attempted to update another user", {
        category: "auth",
        userId: user!.id,
        targetUserId: id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "You can only update your own profile",
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    // If changing role, require users.manage_roles permission
    const roleAssignmentChanged =
      (validatedData.role !== undefined && validatedData.role !== existingUser.role) ||
      (validatedData.customRoleId !== undefined && validatedData.customRoleId !== existingUser.customRoleId);
    if (roleAssignmentChanged) {
      // Check if the requesting user has users.manage_roles permission
      const hasManageRoles = user!.permissions.includes("users.manage_roles");
      if (!hasManageRoles && user!.role !== Role.ADMIN) {
        logger.warn("User attempted to change role without permission", {
          category: "auth",
          userId: user!.id,
          targetUserId: id,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
            message: "You do not have permission to change user roles",
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.department !== undefined) updateData.department = validatedData.department;
    if (validatedData.password !== undefined) {
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      updateData.passwordHash = hashedPassword;
    }

    // Handle standard/custom role assignment explicitly
    if (validatedData.role !== undefined || validatedData.customRoleId !== undefined) {
      const nextRole = validatedData.role ?? existingUser.role;

      if (nextRole === Role.CUSTOM) {
        const nextCustomRoleId = validatedData.customRoleId;
        if (!nextCustomRoleId) {
          return NextResponse.json(
            {
              success: false,
              error: "Validation Error",
              message: "customRoleId is required when role is CUSTOM",
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }

        const customRole = await prisma.customRole.findUnique({
          where: { id: nextCustomRoleId },
          select: { id: true, isActive: true },
        });
        if (!customRole || !customRole.isActive) {
          return NextResponse.json(
            {
              success: false,
              error: "Validation Error",
              message: "Selected custom role is not available",
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }

        updateData.role = Role.CUSTOM;
        updateData.customRoleId = customRole.id;
      } else {
        updateData.role = nextRole;
        updateData.customRoleId = null;
      }
    }

    // Update user
    const updateStartTime = Date.now();
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        createdAt: true,
        updatedAt: true,
        avatarUrl: true,
      },
    });
    const updateDuration = Date.now() - updateStartTime;

    logger.debug("User updated in database", {
      category: "database",
      operation: "user_update",
      duration: updateDuration,
      userId: id,
    });

    logger.info("User updated successfully", {
      category: "api",
      operation: "user_update",
      userId: id,
      updatedBy: user!.id,
    });

    // Determine changes for audit logging
    const changes: any = {};
    if (validatedData.name !== undefined && validatedData.name !== existingUser.name) changes.name = validatedData.name;
    if (validatedData.email !== undefined && validatedData.email !== existingUser.email) changes.email = validatedData.email;
    if (validatedData.department !== undefined && validatedData.department !== existingUser.department) changes.department = validatedData.department;
    const roleChanged = validatedData.role !== undefined && validatedData.role !== existingUser.role;
    const passwordChanged = validatedData.password !== undefined;

    // Audit log for role change
    if (roleChanged) {
      await createAuditLogFromRequest(nextRequest, {
        action: "ROLE_CHANGE",
        entityType: "User",
        entityId: id,
        userId: user!.id,
        details: {
          oldRole: existingUser.role,
          newRole: validatedData.role,
          updatedBy: user!.id,
        },
      });
    }

    // Audit log for password reset (admin)
    if (passwordChanged) {
      await createAuditLogFromRequest(nextRequest, {
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: id,
        userId: user!.id,
        details: {
          resetBy: user!.id,
          targetUserId: id,
        },
      });
    }

    // Audit log for other changes
    if (Object.keys(changes).length > 0) {
      await createAuditLogFromRequest(nextRequest, {
        action: "USER_UPDATE",
        entityType: "User",
        entityId: id,
        userId: user!.id,
        details: {
          changes,
          updatedBy: user!.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          details: error.issues,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }
    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request);
  const logger = getRequestLogger(nextRequest);

  try {
    const id = params.id;
    logger.info("Deleting user", {
      category: "api",
      operation: "user_delete",
      userId: id,
    });

    // Check authentication and authorization
    const authResult = await withAuth({
      permissions: ["users.delete"],
    })(nextRequest);
    if (authResult instanceof NextResponse) {
      logger.warn("Authentication/authorization failed for user deletion", {
        category: "auth",
        event: "auth_failure",
      });
      return authResult;
    }

    const { user } = authResult;

    logger.debug("User authenticated for user deletion", {
      category: "auth",
      userId: user!.id,
      userRole: user!.role,
    });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      logger.warn("User not found for deletion", {
        category: "api",
        operation: "user_delete",
        userId: id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Not Found",
          message: "User not found",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Only admins can delete users
    if (user!.role !== Role.ADMIN) {
      logger.warn("Non-admin user attempted to delete another user", {
        category: "auth",
        userId: user!.id,
        targetUserId: id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "You do not have permission to delete users",
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    // Prevent self-deletion (optional)
    if (user!.id === id) {
      logger.warn("User attempted to delete themselves", {
        category: "auth",
        userId: user!.id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request",
          message: "You cannot delete your own account",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Delete user and all related records
    const deleteStartTime = Date.now();

    // Get all ticket IDs created by this user (needed to delete their comments first)
    const userTickets = await prisma.ticket.findMany({
      where: { userId: id },
      select: { id: true },
    });
    const userTicketIds = userTickets.map((t) => t.id);

    await prisma.$transaction([
      // Delete all comments by user
      prisma.comment.deleteMany({ where: { userId: id } }),
      // Delete all comments on tickets created by user (from other users)
      ...(userTicketIds.length > 0
        ? [prisma.comment.deleteMany({ where: { ticketId: { in: userTicketIds } } })]
        : []),
      // Delete user permissions
      prisma.userPermission.deleteMany({ where: { userId: id } }),
      // Nullify audit logs (keep logs, remove user reference)
      prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
      // Nullify assets owned by user
      prisma.asset.updateMany({ where: { userId: id }, data: { userId: null } }),
      // Nullify assigned tickets
      prisma.ticket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
      // Nullify knowledge suggestions authored/reviewed by user
      prisma.knowledgeBaseSuggestion.updateMany({ where: { authorId: id }, data: { authorId: null } }),
      prisma.knowledgeBaseSuggestion.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } }),
      // Delete tickets created by user (userId is required, cannot be nulled)
      prisma.ticket.deleteMany({ where: { userId: id } }),
      // Delete knowledge base articles authored by user (authorId is required)
      prisma.knowledgeBaseArticle.deleteMany({ where: { authorId: id } }),
      // Delete the user (accounts and sessions have onDelete: Cascade)
      prisma.user.delete({ where: { id } }),
    ]);
    const deleteDuration = Date.now() - deleteStartTime;

    logger.debug("User deleted from database", {
      category: "database",
      operation: "user_delete",
      duration: deleteDuration,
      userId: id,
    });

    logger.info("User deleted successfully", {
      category: "api",
      operation: "user_delete",
      userId: id,
      deletedBy: user!.id,
    });

    // Create audit log
    await createAuditLogFromRequest(nextRequest, {
      action: "USER_DELETE",
      entityType: "User",
      entityId: id,
      userId: user!.id,
      details: {
        deletedBy: user!.id,
        deletedUserId: id,
        deletedUserEmail: existingUser?.email,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    // Handle foreign key constraint errors (if user has related records)
    if (error instanceof Error && error.message.includes("foreign key constraint")) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflict",
          message: "Cannot delete user because they have related records (tickets, assets, etc.)",
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }
    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete user",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}