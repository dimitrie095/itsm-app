"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/logging/audit";
import bcryptjs from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: { name?: string; department?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        department: data.department,
      },
    });
    
    revalidatePath("/user-settings");
    return { success: true, message: "Profile updated successfully" };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, message: "Failed to update profile" };
  }
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    
    if (!user) {
      return { success: false, message: "User not found" };
    }
    
    // Check current password
    let isValid = false;
    if (user.passwordHash) {
      isValid = await bcryptjs.compare(data.currentPassword, user.passwordHash);
    } else {
      // For demo users without password hash
      isValid = data.currentPassword === "demo123";
    }
    
    if (!isValid) {
      return { success: false, message: "Current password is incorrect" };
    }
    
    // Hash new password
    const hashedPassword = await bcryptjs.hash(data.newPassword, 10);
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hashedPassword },
    });
    
    // Create audit log for password change (self)
    await createAuditLog({
      action: "PASSWORD_CHANGE",
      entityType: "User",
      entityId: session.user.id,
      userId: session.user.id,
      details: {
        changedBy: session.user.id,
      },
    });
    
    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, message: "Failed to change password" };
  }
}

export async function updateNotificationPreferences(data: {
  emailNotifications: boolean;
  ticketUpdates: boolean;
  newTicketAssigned: boolean;
  weeklyDigest: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }
    
    // In a real app, you would store these preferences in a database
    // For now, we'll just simulate success
    console.log("Notification preferences updated:", data);
    
    revalidatePath("/user-settings");
    return { success: true, message: "Notification preferences updated" };
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return { success: false, message: "Failed to update notification preferences" };
  }
}

export async function updateDisplayPreferences(data: {
  theme: string;
  timezone: string;
  language: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }
    
    // In a real app, you would store these preferences in a database
    // For now, we'll just simulate success
    console.log("Display preferences updated:", data);
    
    revalidatePath("/user-settings");
    return { success: true, message: "Display preferences updated" };
  } catch (error) {
    console.error("Error updating display preferences:", error);
    return { success: false, message: "Failed to update display preferences" };
  }
}