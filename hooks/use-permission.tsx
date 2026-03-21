"use client";

import { Fragment } from "react";
import { useSession } from "next-auth/react";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/permission-utils";

/**
 * Hook to check permissions for the current user
 */
export function usePermission() {
  const { data: session, status } = useSession();
  
  const isLoading = status === "loading";
  const isAuthenticated = !!session;
  
  const checkPermission = (permissionName: string): boolean => {
    if (!session) return false;
    return hasPermission(session, permissionName);
  };
  
  const checkAnyPermission = (permissionNames: string[]): boolean => {
    if (!session) return false;
    return hasAnyPermission(session, permissionNames);
  };
  
  const checkAllPermissions = (permissionNames: string[]): boolean => {
    if (!session) return false;
    return hasAllPermissions(session, permissionNames);
  };
  
  const getUserRole = (): string | undefined => {
    return session?.user?.role;
  };
  
  const getUserPermissions = (): string[] => {
    const user = session?.user as any;
    return user?.permissions || [];
  };
  
  return {
    session,
    isLoading,
    isAuthenticated,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    getUserRole,
    getUserPermissions,
    isAdmin: session?.user?.role === "ADMIN",
    isAgent: session?.user?.role === "AGENT",
    isEndUser: session?.user?.role === "END_USER",
  };
}

/**
 * Component guard that renders children only if user has required permission
 */
export function WithPermission({
  permission,
  anyPermission,
  allPermissions,
  children,
  fallback = null,
}: {
  permission?: string;
  anyPermission?: string[];
  allPermissions?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermission();
  
  if (isLoading) {
    return null; // Or a loading spinner
  }
  
  let hasAccess = false;
  
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermission) {
    hasAccess = hasAnyPermission(anyPermission);
  } else if (allPermissions) {
    hasAccess = hasAllPermissions(allPermissions);
  }
  
  if (hasAccess) {
    return <>{children}</>;
  } else {
    return <>{fallback}</>;
  }
}

/**
 * Component guard that renders children only for specific roles
 */
export function WithRole({
  role,
  roles,
  children,
  fallback = null,
}: {
  role?: string;
  roles?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { getUserRole, isLoading } = usePermission();
  
  if (isLoading) {
    return null;
  }
  
  const userRole = getUserRole();
  let hasAccess = false;
  
  if (role) {
    hasAccess = userRole === role;
  } else if (roles) {
    hasAccess = roles.includes(userRole || "");
  }
  
  if (hasAccess) {
    return <>{children}</>;
  } else {
    return <>{fallback}</>;
  }
}