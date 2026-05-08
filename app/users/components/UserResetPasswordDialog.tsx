"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface UserResetPasswordDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordReset?: () => void;
}

export function UserResetPasswordDialog({ user, open, onOpenChange, onPasswordReset }: UserResetPasswordDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manualPassword, setManualPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      setLoading(false);
      setMode("auto");
      setManualPassword("");
    }
  }, [open]);

  const handleConfirmReset = async () => {
    if (mode === "manual" && manualPassword.trim().length < 8) {
      toast.error("Manual password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          ...(mode === "manual" ? { password: manualPassword.trim() } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to reset password");
      }

      toast.success("Password reset successfully", {
        description:
          mode === "manual"
            ? "The manual password was set and sent via email."
            : "A new random password was generated and sent via email.",
      });
      onPasswordReset?.();
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "An error occurred while resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a password for {user.name || user.email} and send it by email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Password mode</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "auto" ? "default" : "outline"}
                onClick={() => setMode("auto")}
                disabled={loading}
              >
                Automatic
              </Button>
              <Button
                type="button"
                variant={mode === "manual" ? "default" : "outline"}
                onClick={() => setMode("manual")}
                disabled={loading}
              >
                Manual
              </Button>
            </div>
          </div>
          {mode === "manual" && (
            <div className="space-y-2">
              <Label htmlFor="manual-password">Manual Password</Label>
              <Input
                id="manual-password"
                type="text"
                placeholder="At least 8 characters"
                value={manualPassword}
                onChange={(e) => setManualPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            After confirmation, the system will {mode === "manual" ? "set your manual password" : "create a random password"},
            apply it for this user, and send it to <span className="font-medium">{user.email}</span>.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => setConfirmOpen(true)} disabled={loading}>
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Password Reset</DialogTitle>
            <DialogDescription>
              Do you want to reset the password for {user.name || user.email} using{" "}
              <span className="font-medium">{mode === "manual" ? "manual" : "automatic"}</span> mode
              and send it by email?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmReset} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}