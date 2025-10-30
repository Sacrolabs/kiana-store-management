"use client";

import { useState, useEffect } from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store } from "@/lib/types/store";
import { Vendor } from "@/lib/types/vendor";
import { Currency } from "@/lib/types/currency";
import { CurrencyInput } from "@/components/sales/currency-input";
import { formatCurrency } from "@/lib/currency/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExpensesDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stores: Store[];
  storeId?: string; // Optional: pre-select a store
  expenseToEdit?: any; // Optional: existing expense to edit
}

export function ExpensesDialog({
  open,
  onClose,
  onSuccess,
  stores,
  storeId,
  expenseToEdit,
}: ExpensesDialogProps) {
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expenseId, setExpenseId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || "");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("EUR");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");

  // Fetch vendors when dialog opens
  useEffect(() => {
    if (open) {
      fetchVendors();
    }
  }, [open]);

  useEffect(() => {
    if (open && expenseToEdit) {
      // Load existing expense for editing
      setExpenseId(expenseToEdit.id);
      setEditMode(true);
      setSelectedStoreId(expenseToEdit.storeId);
      setSelectedVendorId(expenseToEdit.vendorId);
      setSelectedCurrency(expenseToEdit.currency as Currency);
      setExpenseDate(format(new Date(expenseToEdit.expenseDate), "yyyy-MM-dd"));
      setAmount(expenseToEdit.amount);
      setDescription(expenseToEdit.description || "");
    } else if (open && storeId) {
      setSelectedStoreId(storeId);
      // Set default currency based on store's default currency
      const store = stores.find((s) => s.id === storeId);
      if (store) {
        setSelectedCurrency(store.defaultCurrency as Currency);
      }
    }
  }, [open, storeId, stores, expenseToEdit]);

  useEffect(() => {
    if (selectedStoreId) {
      const store = stores.find((s) => s.id === selectedStoreId);
      if (store && !storeId) {
        // Only update currency if not pre-selected store
        setSelectedCurrency(store.defaultCurrency as Currency);
      }
    }
  }, [selectedStoreId, stores, storeId]);

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const response = await fetch("/api/vendors");
      if (!response.ok) {
        throw new Error("Failed to fetch vendors");
      }
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId) {
      toast.error("Please select a store");
      return;
    }

    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }

    if (amount === 0) {
      toast.error("Please enter an expense amount");
      return;
    }

    setSaving(true);
    try {
      const url = editMode && expenseId ? `/api/expenses/${expenseId}` : "/api/expenses";
      const method = editMode && expenseId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStoreId,
          vendorId: selectedVendorId,
          currency: selectedCurrency,
          expenseDate: new Date(expenseDate).toISOString(),
          amount,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${editMode ? "update" : "record"} expense`);
      }

      toast.success(`Expense ${editMode ? "updated" : "recorded"} successfully`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error(`Error ${editMode ? "updating" : "recording"} expense:`, error);
      toast.error(error.message || `Failed to ${editMode ? "update" : "record"} expense`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedStoreId(storeId || "");
    setSelectedVendorId("");
    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setAmount(0);
    setDescription("");
    setEditMode(false);
    setExpenseId(null);
    onClose();
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Expense" : "Record Expense"}</DialogTitle>
          <DialogDescription>
            {editMode ? "Update expense details" : "Record an expense for a store"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Store Selection */}
          <div className="space-y-2">
            <Label htmlFor="store">Store *</Label>
            <Select
              value={selectedStoreId}
              onValueChange={setSelectedStoreId}
              disabled={!!storeId} // Disable if pre-selected
            >
              <SelectTrigger id="store">
                <SelectValue placeholder="Select a store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor *</Label>
            <Select
              value={selectedVendorId}
              onValueChange={setSelectedVendorId}
              disabled={loadingVendors}
            >
              <SelectTrigger id="vendor">
                <SelectValue placeholder={loadingVendors ? "Loading vendors..." : "Select a vendor"} />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <input
              id="date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Currency Selection */}
          {selectedStore && selectedStore.supportedCurrencies.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(value) => setSelectedCurrency(value as Currency)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedStore.supportedCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <CurrencyInput
              label="Amount *"
              value={amount}
              onChange={setAmount}
              currency={selectedCurrency}
              id="amount"
            />
          </div>

          {/* Amount Summary */}
          {amount > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Expense Amount:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(amount, selectedCurrency)}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this expense..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || amount === 0}>
              <Receipt className="h-4 w-4 mr-2" />
              {saving
                ? editMode
                  ? "Updating..."
                  : "Recording..."
                : editMode
                ? "Update Expense"
                : "Record Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
