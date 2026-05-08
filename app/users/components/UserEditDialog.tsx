"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { competenceCenters } from "../competence-centers";

const roles = [
  { value: "END_USER", label: "End User" },
  { value: "AGENT", label: "Agent" },
  { value: "ADMIN", label: "Admin" },
];

interface CustomRoleOption {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  customRole?: { id: string; name: string } | null;
  department: string | null;
  createdAt: string;
  avatarUrl: string | null;
}

interface UserEditDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
}

export function UserEditDialog({ user, open, onOpenChange, onUserUpdated }: UserEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customRoles, setCustomRoles] = useState<CustomRoleOption[]>([]);
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email,
    role: user.role === "CUSTOM" && user.customRole ? `CUSTOM:${user.customRole.id}` : user.role,
    department: user.department || "none",
  });

  // Update form data when user changes
  useEffect(() => {
    setFormData({
      name: user.name || "",
      email: user.email,
      role: user.role === "CUSTOM" && user.customRole ? `CUSTOM:${user.customRole.id}` : user.role,
      department: user.department || "none",
    });
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const fetchRoleOptions = async () => {
      try {
        const response = await fetch("/api/users/role-options", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setCustomRoles(Array.isArray(data?.customRoles) ? data.customRoles : []);
      } catch (error) {
        console.error("Error loading role options:", error);
      }
    };
    void fetchRoleOptions();
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isCustomRoleSelection = formData.role.startsWith("CUSTOM:");
      const selectedCustomRoleId = isCustomRoleSelection ? formData.role.replace("CUSTOM:", "") : undefined;
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name || undefined,
          email: formData.email,
          role: isCustomRoleSelection ? "CUSTOM" : formData.role,
          customRoleId: selectedCustomRoleId,
          department: formData.department === "none" ? undefined : formData.department,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to update user");
      }

      toast.success("User updated successfully");
      onUserUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "An error occurred while updating the user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information for {user.name || user.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleSelectChange("role", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                  {customRoles.map((role) => (
                    <SelectItem key={role.id} value={`CUSTOM:${role.id}`}>
                      Custom: {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Competence Center</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleSelectChange("department", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select competence center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No competence center</SelectItem>
                  {competenceCenters.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}