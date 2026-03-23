"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Building, Calendar, Key, User as UserIcon } from "lucide-react";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  department: string | null;
  createdAt: string;
  avatarUrl: string | null;
  updatedAt?: string;
  emailVerified?: string | null;
  externalId?: string | null;
  customRole?: { id: string; name: string } | null;
}

interface UserProfileDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleColor = (role: string) => {
  switch (role) {
    case "ADMIN": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case "AGENT": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "END_USER": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
};

const roleLabel = (role: string) => {
  switch (role) {
    case "ADMIN": return "Admin";
    case "AGENT": return "Agent";
    case "END_USER": return "End User";
    default: return role;
  }
};

export function UserProfileDialog({ user, open, onOpenChange }: UserProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            Detailed information about {user.name || user.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Avatar and basic info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatarUrl || ""} />
              <AvatarFallback>
                {user.name
                  ? user.name.split(' ').map(n => n[0]).join('')
                  : user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{user.name || "No name"}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
              <div className="mt-2">
                <Badge className={roleColor(user.role)}>
                  {roleLabel(user.role)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserIcon className="h-3 w-3" />
                <span>User ID</span>
              </div>
              <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building className="h-3 w-3" />
                <span>Department</span>
              </div>
              <p className="text-sm text-muted-foreground">{user.department || "No department"}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-3 w-3" />
                <span>Joined</span>
              </div>
              <p className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-3 w-3" />
                <span>Email Verified</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {user.emailVerified ? formatDate(user.emailVerified) : "Not verified"}
              </p>
            </div>
          </div>

          {/* Additional info if available */}
          {user.updatedAt && (
            <div className="text-sm text-muted-foreground">
              Last updated: {formatDate(user.updatedAt)}
            </div>
          )}
          {user.externalId && (
            <div className="text-sm text-muted-foreground">
              External ID: {user.externalId}
            </div>
          )}
          {user.customRole && (
            <div className="text-sm text-muted-foreground">
              Custom Role: {user.customRole.name}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}