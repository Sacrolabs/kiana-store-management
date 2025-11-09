"use client";

import { useState, useEffect } from "react";
import { DollarSign, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Currency, PaymentMethod } from "@/lib/generated/prisma";
import { formatCurrency } from "@/lib/currency/utils";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string;
  employeeName: string;
  defaultCurrency?: Currency;
  paymentToEdit?: any; // Optional: existing payment to edit
  onDelete?: (id: string) => void; // Optional: delete callback
}

export function PaymentDialog({
  open,
  onClose,
  onSuccess,
  employeeId,
  employeeName,
  defaultCurrency = "EUR",
  paymentToEdit,
  onDelete,
}: PaymentDialogProps) {
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(defaultCurrency);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ACCOUNT");
  const [paidDate, setPaidDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      if (paymentToEdit) {
        // Edit mode - load existing payment data
        setEditMode(true);
        setPaymentId(paymentToEdit.id);
        setAmountPaid((paymentToEdit.amountPaid / 100).toFixed(2)); // Convert from cents/pence
        setSelectedCurrency(paymentToEdit.currency as Currency);
        setPaymentMethod(paymentToEdit.paymentMethod as PaymentMethod);
        setPaidDate(new Date(paymentToEdit.paidDate).toISOString().split("T")[0]);
        setNotes(paymentToEdit.notes || "");
      } else {
        // Create mode - reset form
        setEditMode(false);
        setPaymentId(null);
        setAmountPaid("");
        setSelectedCurrency(defaultCurrency);
        setPaymentMethod("ACCOUNT");
        setPaidDate(new Date().toISOString().split("T")[0]);
        setNotes("");
      }
    }
  }, [open, defaultCurrency, paymentToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!paidDate) {
      toast.error("Please select a payment date");
      return;
    }

    try {
      setSaving(true);

      // Convert amount to cents/pence
      const amountInMinorUnits = Math.round(parseFloat(amountPaid) * 100);

      const payload = {
        employeeId,
        amountPaid: amountInMinorUnits,
        currency: selectedCurrency,
        paymentMethod,
        paidDate,
        notes: notes.trim() || undefined,
      };

      const url = editMode && paymentId ? `/api/payments/${paymentId}` : "/api/payments";
      const method = editMode && paymentId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record payment");
      }

      toast.success(editMode ? "Payment updated successfully" : "Payment recorded successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!paymentId || !onDelete) return;

    if (!confirm("Are you sure you want to delete this payment record?")) {
      return;
    }

    try {
      setSaving(true);
      await onDelete(paymentId);
      onClose();
    } catch (error) {
      console.error("Error deleting payment:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {editMode ? "Edit Payment" : "Record Payment"}
          </DialogTitle>
          <DialogDescription>
            {editMode ? `Update payment for ${employeeName}` : `Record payment for ${employeeName}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">
              Currency <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={selectedCurrency}
              onValueChange={(value) => setSelectedCurrency(value as Currency)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="EUR" id="eur" />
                <Label htmlFor="eur" className="font-normal cursor-pointer">
                  EUR (€)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="GBP" id="gbp" />
                <Label htmlFor="gbp" className="font-normal cursor-pointer">
                  GBP (£)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountPaid">
              Amount Paid <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {selectedCurrency === "EUR" ? "€" : "£"}
              </span>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="pl-8"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidDate">
              Paid Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="paidDate"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Payment Method <span className="text-destructive">*</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCOUNT">Bank Account</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            {editMode && paymentToEdit && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={saving}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving 
                ? (editMode ? "Updating..." : "Recording...") 
                : (editMode ? "Update Payment" : "Record Payment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

