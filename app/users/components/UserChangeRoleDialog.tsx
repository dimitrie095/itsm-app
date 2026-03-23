"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const roles = [
  { value: "END_USER", label: "End User" },
  { value: "AGENT", label: "Agent" },
  { value: "ADMIN", label: "Admin" },
];

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface UserChangeRoleDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleChanged?: () => void;
}

export function UserChangeRoleDialog({ user, open, onOpenChange, onRoleChanged }: UserChangeRoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);

  // Update selectedRole when user changes
  useEffect(() => {
    setSelectedRole(user.role);
  }, [user.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === user.role) {
      toast.info("No change in role");
      onOpenChange(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to change role");
      }

      toast.success("User role updated successfully");
      onRoleChanged?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error changing user role:", error);
      toast.error(error.message || "An error occurred while changing role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Update the role for {user.name || user.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Role</label>
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                {roles.find(r => r.value === user.role)?.label || user.role}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Role *</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}