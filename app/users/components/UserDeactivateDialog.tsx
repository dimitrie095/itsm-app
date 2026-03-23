"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface UserDeactivateDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserDeactivated?: () => void;
}

export function UserDeactivateDialog({ user, open, onOpenChange, onUserDeactivated }: UserDeactivateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationText !== user.email) {
      toast.error("Please type the user's email to confirm");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (response.status === 204) {
        toast.success("User deactivated successfully");
        onUserDeactivated?.();
        onOpenChange(false);
        setConfirmationText("");
        setReason("");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to deactivate user");
      }
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      toast.error(error.message || "An error occurred while deactivating user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate User</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the user account and remove all associated data.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Deleting a user will remove them from the system. They will no longer be able to log in. Any tickets, assets, or other data associated with this user may be affected.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="Why are you deactivating this user?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Please type <strong>{user.email}</strong> to confirm.
              </Label>
              <Input
                id="confirm"
                placeholder="Enter user email"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading || confirmationText !== user.email}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}