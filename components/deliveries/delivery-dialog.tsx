"use client";

import { useState, useEffect } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Driver } from "@/lib/types/driver";
import { Store } from "@/lib/types/store";
import { Currency } from "@/lib/generated/prisma";
import { CurrencyInput } from "@/components/sales/currency-input";
import { formatCurrency } from "@/lib/currency/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface DeliveryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stores: Store[];
  storeId?: string; // Optional: pre-select a store
}

export function DeliveryDialog({
  open,
  onClose,
  onSuccess,
  stores,
  storeId,
}: DeliveryDialogProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [storeDrivers, setStoreDrivers] = useState<Driver[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || "");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [numberOfDeliveries, setNumberOfDeliveries] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("EUR");
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchDrivers();
      if (storeId) {
        setSelectedStoreId(storeId);
        const store = stores.find((s) => s.id === storeId);
        if (store) {
          setSelectedCurrency(store.defaultCurrency as Currency);
        }
      }
    }
  }, [open, storeId, stores]);

  useEffect(() => {
    if (selectedStoreId) {
      fetchStoreDrivers(selectedStoreId);
      // Update currency based on store
      const store = stores.find((s) => s.id === selectedStoreId);
      if (store && !storeId) {
        setSelectedCurrency(store.defaultCurrency as Currency);
      }
    }
  }, [selectedStoreId, stores, storeId]);

  const fetchDrivers = async () => {
    try {
      const response = await fetch("/api/drivers");
      if (!response.ok) throw new Error("Failed to fetch drivers");
      const data = await response.json();
      setDrivers(data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers");
    }
  };

  const fetchStoreDrivers = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/drivers`);
      if (!response.ok) throw new Error("Failed to fetch store drivers");
      const data = await response.json();
      setStoreDrivers(data);
    } catch (error) {
      console.error("Error fetching store drivers:", error);
      toast.error("Failed to load store drivers");
      setStoreDrivers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId) {
      toast.error("Please select a store");
      return;
    }

    if (!selectedDriverId) {
      toast.error("Please select a driver");
      return;
    }

    if (!numberOfDeliveries || parseInt(numberOfDeliveries) <= 0) {
      toast.error("Please enter a valid number of deliveries");
      return;
    }

    if (expenseAmount < 0) {
      toast.error("Expense amount cannot be negative");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: selectedDriverId,
          storeId: selectedStoreId,
          deliveryDate: new Date(deliveryDate).toISOString(),
          numberOfDeliveries: parseInt(numberOfDeliveries),
          currency: selectedCurrency,
          expenseAmount, // Already in cents/pence from CurrencyInput
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record delivery");
      }

      toast.success("Delivery recorded successfully");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error recording delivery:", error);
      toast.error(error.message || "Failed to record delivery");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedStoreId(storeId || "");
    setSelectedDriverId("");
    setDeliveryDate(format(new Date(), "yyyy-MM-dd"));
    setNumberOfDeliveries("");
    setSelectedCurrency("EUR");
    setExpenseAmount(0);
    setNotes("");
    onClose();
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);
  const availableDrivers = storeDrivers;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Record Delivery</DialogTitle>
          <DialogDescription>
            Record driver deliveries and expenses
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Store Selection */}
          <div className="space-y-2">
            <Label htmlFor="store">Store *</Label>
            <Select
              value={selectedStoreId}
              onValueChange={setSelectedStoreId}
              disabled={!!storeId}
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

          {/* Driver Selection */}
          <div className="space-y-2">
            <Label htmlFor="driver">Driver *</Label>
            <Select
              value={selectedDriverId}
              onValueChange={setSelectedDriverId}
              disabled={!selectedStoreId}
            >
              <SelectTrigger id="driver">
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {storeDrivers.length === 0 && selectedStoreId && (
              <p className="text-xs text-yellow-600">
                No drivers assigned to this store. Please assign drivers to this store first.
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
              required
            />
          </div>

          {/* Number of Deliveries */}
          <div className="space-y-2">
            <Label htmlFor="numberOfDeliveries">Number of Deliveries *</Label>
            <Input
              id="numberOfDeliveries"
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={numberOfDeliveries}
              onChange={(e) => setNumberOfDeliveries(e.target.value)}
              required
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

          {/* Expense Amount */}
          <div className="space-y-2">
            <CurrencyInput
              label="Expense Amount *"
              value={expenseAmount}
              onChange={setExpenseAmount}
              currency={selectedCurrency}
              id="expenseAmount"
            />
          </div>

          {/* Summary */}
          {expenseAmount > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Expense:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(expenseAmount, selectedCurrency)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            <Button type="submit" disabled={saving}>
              <Truck className="h-4 w-4 mr-2" />
              {saving ? "Recording..." : "Record Delivery"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
