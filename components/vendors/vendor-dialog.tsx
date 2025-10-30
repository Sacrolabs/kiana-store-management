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
import { VendorWithExpenseCount } from "@/lib/types/vendor";
import { toast } from "sonner";

interface VendorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendor?: VendorWithExpenseCount | null;
  onDelete?: (id: string) => void;
}

export function VendorDialog({
  open,
  onClose,
  onSuccess,
  vendor,
  onDelete,
}: VendorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (open) {
      if (vendor) {
        // Edit mode
        setName(vendor.name);
        setContact(vendor.contact || "");
        setEmail(vendor.email || "");
        setPhone(vendor.phone || "");
      } else {
        // Create mode
        setName("");
        setContact("");
        setEmail("");
        setPhone("");
      }
    }
  }, [open, vendor]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        contact: contact.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      const url = vendor ? `/api/vendors/${vendor.id}` : "/api/vendors";
      const method = vendor ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save vendor");
      }

      toast.success(
        vendor ? "Vendor updated successfully" : "Vendor created successfully"
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving vendor:", error);
      toast.error(error.message || "Failed to save vendor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (vendor && onDelete) {
      onDelete(vendor.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          <DialogDescription>
            {vendor
              ? "Update vendor details"
              : "Add a new vendor to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Vendor Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Vendor name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Person (optional)</Label>
            <Input
              id="contact"
              placeholder="Contact person name"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="vendor@example.com"
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
            {vendor && onDelete && (
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
              {loading ? "Saving..." : vendor ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
