"use client";

import { useState, useEffect } from "react";
import { DollarSign, Trash2 } from "lucide-react";
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
import { Store } from "@/lib/types/store";
import { Currency } from "@/lib/generated/prisma";
import { CurrencyInput } from "@/components/sales/currency-input";
import { formatCurrency } from "@/lib/currency/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface SalesDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stores: Store[];
  storeId?: string; // Optional: pre-select a store
  saleToEdit?: any; // Optional: existing sale to edit
  onDelete?: (id: string) => void; // Optional: delete callback
}

export function SalesDialog({
  open,
  onClose,
  onSuccess,
  stores,
  storeId,
  saleToEdit,
  onDelete,
}: SalesDialogProps) {
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saleId, setSaleId] = useState<string | null>(null);

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || "");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("EUR");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cash, setCash] = useState(0);
  const [online, setOnline] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [justEat, setJustEat] = useState(0);
  const [mylocal, setMylocal] = useState(0);
  const [creditCard, setCreditCard] = useState(0);
  const [deliveroo, setDeliveroo] = useState(0);
  const [uberEats, setUberEats] = useState(0);
  const [cashInTill, setCashInTill] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && saleToEdit) {
      // Load existing sale for editing
      setSaleId(saleToEdit.id);
      setEditMode(true);
      setSelectedStoreId(saleToEdit.storeId);
      setSelectedCurrency(saleToEdit.currency as Currency);
      setSaleDate(format(new Date(saleToEdit.date), "yyyy-MM-dd"));
      setCash(saleToEdit.cash);
      setOnline(saleToEdit.online);
      setDelivery(saleToEdit.delivery);
      setJustEat(saleToEdit.justEat);
      setMylocal(saleToEdit.mylocal);
      setCreditCard(saleToEdit.creditCard);
      setDeliveroo(saleToEdit.deliveroo || 0);
      setUberEats(saleToEdit.uberEats || 0);
      setCashInTill(saleToEdit.cashInTill || 0);
      setNotes(saleToEdit.notes || "");
    } else if (open && storeId) {
      setSelectedStoreId(storeId);
      // Set default currency based on store's default currency
      const store = stores.find((s) => s.id === storeId);
      if (store) {
        setSelectedCurrency(store.defaultCurrency as Currency);
      }
    }
  }, [open, storeId, stores, saleToEdit]);

  useEffect(() => {
    if (selectedStoreId) {
      const store = stores.find((s) => s.id === selectedStoreId);
      if (store && !storeId) {
        // Only update currency if not pre-selected store
        setSelectedCurrency(store.defaultCurrency as Currency);
      }
    }
  }, [selectedStoreId, stores, storeId]);

  // Check for existing sale when store, currency, or date changes (but not if we're already editing)
  useEffect(() => {
    if (open && selectedStoreId && selectedCurrency && saleDate && !saleToEdit) {
      checkForExistingSale();
    }
  }, [open, selectedStoreId, selectedCurrency, saleDate, saleToEdit]);

  const checkForExistingSale = async () => {
    setChecking(true);
    try {
      const response = await fetch(
        `/api/sales/check?storeId=${selectedStoreId}&currency=${selectedCurrency}&date=${saleDate}`
      );

      if (!response.ok) {
        throw new Error("Failed to check for existing sale");
      }

      const data = await response.json();

      if (data.exists && data.sale) {
        // Load existing sale data
        setSaleId(data.sale.id);
        setEditMode(true);
        setCash(data.sale.cash);
        setOnline(data.sale.online);
        setDelivery(data.sale.delivery);
        setJustEat(data.sale.justEat);
        setMylocal(data.sale.mylocal);
        setCreditCard(data.sale.creditCard);
        setCashInTill(data.sale.cashInTill || 0);
        setNotes(data.sale.notes || "");
        toast.info("Editing existing sale for this date and currency");
      } else {
        // Reset to new entry mode
        setSaleId(null);
        setEditMode(false);
        // Don't reset amounts - let user keep typing
      }
    } catch (error) {
      console.error("Error checking for existing sale:", error);
      // Don't show error to user, just proceed as new entry
      setSaleId(null);
      setEditMode(false);
    } finally {
      setChecking(false);
    }
  };

  const calculateTotal = (): number => {
    return cash + online + delivery + justEat + mylocal + creditCard + deliveroo + uberEats;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId) {
      toast.error("Please select a store");
      return;
    }

    const total = calculateTotal();
    if (total === 0) {
      toast.error("Please enter at least one sale amount");
      return;
    }

    setSaving(true);
    try {
      const url = editMode && saleId ? `/api/sales/${saleId}` : "/api/sales";
      const method = editMode && saleId ? "PATCH" : "POST";

      // Calculate difference: total - cash in till
      const difference = total - cashInTill;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStoreId,
          currency: selectedCurrency,
          date: new Date(saleDate).toISOString(),
          cash,
          online,
          delivery,
          justEat,
          mylocal,
          creditCard,
          deliveroo,
          uberEats,
          cashInTill,
          difference,
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${editMode ? "update" : "record"} sale`);
      }

      toast.success(`Sale ${editMode ? "updated" : "recorded"} successfully`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error(`Error ${editMode ? "updating" : "recording"} sale:`, error);
      toast.error(error.message || `Failed to ${editMode ? "update" : "record"} sale`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedStoreId(storeId || "");
    setSaleDate(format(new Date(), "yyyy-MM-dd"));
    setCash(0);
    setOnline(0);
    setDelivery(0);
    setJustEat(0);
    setMylocal(0);
    setDeliveroo(0);
    setUberEats(0);
    setCreditCard(0);
    setCashInTill(0);
    setNotes("");
    setEditMode(false);
    setSaleId(null);
    onClose();
  };

  const handleDelete = () => {
    if (saleToEdit && saleId && onDelete) {
      onDelete(saleId);
      handleClose();
    }
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);
  const total = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Sale" : "Record Sale"}</DialogTitle>
          <DialogDescription>
            {editMode
              ? "Update sales data for the selected date and currency"
              : "Record daily sales across different payment methods"}
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

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
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

          {/* Payment Methods */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Payment Methods</h3>

            <div className="grid grid-cols-2 gap-3">
              <CurrencyInput
                label="Cash"
                value={cash}
                onChange={setCash}
                currency={selectedCurrency}
                id="cash"
              />

              <CurrencyInput
                label="Online"
                value={online}
                onChange={setOnline}
                currency={selectedCurrency}
                id="online"
              />

              <CurrencyInput
                label="Delivery"
                value={delivery}
                onChange={setDelivery}
                currency={selectedCurrency}
                id="delivery"
              />

              <CurrencyInput
                label="Just Eat"
                value={justEat}
                onChange={setJustEat}
                currency={selectedCurrency}
                id="justEat"
              />

              <CurrencyInput
                label="MyLocal"
                value={mylocal}
                onChange={setMylocal}
                currency={selectedCurrency}
                id="mylocal"
              />

              <CurrencyInput
                label="Credit Card"
                value={creditCard}
                onChange={setCreditCard}
                currency={selectedCurrency}
                id="creditCard"
              />

              <CurrencyInput
                label="Deliveroo"
                value={deliveroo}
                onChange={setDeliveroo}
                currency={selectedCurrency}
                id="deliveroo"
              />

              <CurrencyInput
                label="Uber Eats"
                value={uberEats}
                onChange={setUberEats}
                currency={selectedCurrency}
                id="uberEats"
              />
            </div>
          </div>

          {/* Total Summary */}
          {total > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Sales:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(total, selectedCurrency)}
                </span>
              </div>
            </div>
          )}

          {/* Cash Reconciliation */}
          <div className="space-y-3 pt-3 border-t">
            <div className="space-y-2">
              <Label htmlFor="cashInTill">Cash in Till</Label>
              <CurrencyInput
                label=""
                value={cashInTill}
                onChange={setCashInTill}
                currency={selectedCurrency}
                id="cashInTill"
              />
            </div>

            {/* Difference (Read-only) */}
            {(total > 0 || cashInTill > 0) && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Difference:</span>
                  <span className={`text-lg font-bold ${
                    total - cashInTill === 0 
                      ? "text-green-600" 
                      : total - cashInTill > 0 
                      ? "text-orange-600" 
                      : "text-red-600"
                  }`}>
                    {formatCurrency(total - cashInTill, selectedCurrency)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Sales - Cash in Till
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this sale..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4">
            {editMode && saleToEdit && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className={`flex gap-2 ${!(editMode && saleToEdit && onDelete) ? 'ml-auto' : ''}`}>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || total === 0 || checking}>
                <DollarSign className="h-4 w-4 mr-2" />
                {saving
                  ? editMode
                    ? "Updating..."
                    : "Recording..."
                  : editMode
                  ? "Update Sale"
                  : "Record Sale"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
