"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Driver } from "@/lib/types/driver";
import { toast } from "sonner";

interface DriverDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driver?: Driver | null;
  onDelete?: (id: string) => void;
}

export function DriverDialog({
  open,
  onClose,
  onSuccess,
  driver,
  onDelete,
}: DriverDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (open) {
      if (driver) {
        // Edit mode
        setName(driver.name);
        setEmail(driver.email || "");
        setPhone(driver.phone || "");
      } else {
        // Create mode
        setName("");
        setEmail("");
        setPhone("");
      }
    }
  }, [open, driver]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Driver name is required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      const url = driver ? `/api/drivers/${driver.id}` : "/api/drivers";
      const method = driver ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save driver");
      }

      toast.success(
        driver ? "Driver updated successfully" : "Driver created successfully"
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving driver:", error);
      toast.error(error.message || "Failed to save driver");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (driver && onDelete) {
      onDelete(driver.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{driver ? "Edit Driver" : "Add Driver"}</DialogTitle>
          <DialogDescription>
            {driver
              ? "Update driver details"
              : "Add a new driver to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Driver name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="driver@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 123 456 7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            {driver && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : driver ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
