import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import bcrypt from "bcryptjs";
import { createAuditLogFromRequest } from "@/lib/logging/audit";
import { getRequestLogger } from "@/lib/logging/middleware";
import { sendOutlookEmail } from "@/lib/outlook-mailer";
import { z } from "zod";

export const runtime = "nodejs";

const resetPasswordSchema = z.object({
  mode: z.enum(["auto", "manual"]).default("auto"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const cryptoObj = globalThis.crypto;
  const randomValues = cryptoObj.getRandomValues(new Uint32Array(length));
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars[randomValues[i] % chars.length];
  }
  return password;
}

function buildResetPasswordEmailHtml(userName: string | null, newPassword: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Your password has been reset</h2>
      <p>Hello ${userName || "User"},</p>
      <p>Your ITSM account password has been reset by an administrator.</p>
      <p><strong>New temporary password:</strong> ${newPassword}</p>
      <p>Please sign in and change your password immediately.</p>
    </div>
  `;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const nextRequest = new NextRequest(request.url, request);
  const logger = getRequestLogger(nextRequest);

  try {
    const id = params.id;

    const authResult = await withAuth({ permissions: ["users.update"] })(nextRequest);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
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

    const body = await request.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: parsed.error.issues[0]?.message || "Invalid request payload",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { mode, password } = parsed.data;
    const newPassword = mode === "manual" ? (password as string) : generateRandomPassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await sendOutlookEmail({
      to: targetUser.email,
      subject: "Your password has been reset",
      html: buildResetPasswordEmailHtml(targetUser.name, newPassword),
    });

    await createAuditLogFromRequest(nextRequest, {
      action: "PASSWORD_RESET",
      entityType: "User",
      entityId: id,
      userId: user!.id,
      details: {
        resetBy: user!.id,
        targetUserId: id,
        delivery: "email",
        mode,
      },
    });

    logger.info("User password reset and email sent", {
      category: "api",
      operation: "user_reset_password",
      userId: id,
      updatedBy: user!.id,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset and email sent successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/users/[id]/reset-password error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reset password",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
