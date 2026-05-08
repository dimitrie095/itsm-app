"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";

type SessionUser = {
  id: string;
  role: Role;
  permissions?: string[];
};

function hasAnyPermission(user: SessionUser, requiredPermissions: string[]) {
  if (user.role === Role.ADMIN) {
    return true;
  }
  const perms = user.permissions || [];
  return requiredPermissions.some((permission) => perms.includes(permission));
}

export async function requireServerActionAuth(options?: {
  roles?: Role[];
  permissions?: string[];
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  if (options?.roles?.length && !options.roles.includes(user.role)) {
    throw new Error("Forbidden");
  }

  if (options?.permissions?.length && !hasAnyPermission(user, options.permissions)) {
    throw new Error("Forbidden");
  }

  return user;
}
