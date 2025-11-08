"use client";

import { useState, useEffect } from "react";
import { Trash2, Calendar } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/sales/currency-input";
import { Store } from "@/lib/types/store";
import { SaleWithStore } from "@/lib/types/sale";
import { Currency } from "@/lib/generated/prisma";
import { formatCurrency } from "@/lib/currency/utils";
import { toast } from "sonner";

interface SalesDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stores: Store[];
  sale?: SaleWithStore | null;
  onDelete?: (id: string) => void;
}

export function SalesDialog({
  open,
  onClose,
  onSuccess,
  stores,
  sale,
  onDelete,
}: SalesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [notes, setNotes] = useState("");

  // EUR amounts (in minor units - cents)
  const [cashEur, setCashEur] = useState(0);
  const [onlineEur, setOnlineEur] = useState(0);
  const [deliveryEur, setDeliveryEur] = useState(0);
  const [justEatEur, setJustEatEur] = useState(0);
  const [mylocalEur, setMylocalEur] = useState(0);
  const [creditCardEur, setCreditCardEur] = useState(0);
  const [cashInTillEur, setCashInTillEur] = useState(0);

  // GBP amounts (in minor units - pence)
  const [cashGbp, setCashGbp] = useState(0);
  const [onlineGbp, setOnlineGbp] = useState(0);
  const [deliveryGbp, setDeliveryGbp] = useState(0);
  const [justEatGbp, setJustEatGbp] = useState(0);
  const [mylocalGbp, setMylocalGbp] = useState(0);
  const [creditCardGbp, setCreditCardGbp] = useState(0);
  const [cashInTillGbp, setCashInTillGbp] = useState(0);

  useEffect(() => {
    if (open) {
      if (sale) {
        // Edit mode - load single sale record
        setSelectedStore(sale.storeId);
        setDate(new Date(sale.date).toISOString().split("T")[0]);
        setNotes(sale.notes || "");

        // Load into the appropriate currency fields
        if (sale.currency === "EUR") {
          setCashEur(sale.cash);
          setOnlineEur(sale.online);
          setDeliveryEur(sale.delivery);
          setJustEatEur(sale.justEat);
          setMylocalEur(sale.mylocal);
          setCreditCardEur(sale.creditCard);
          setCashInTillEur((sale as any).cashInTill || 0);
          // Reset GBP fields
          setCashGbp(0);
          setOnlineGbp(0);
          setDeliveryGbp(0);
          setJustEatGbp(0);
          setMylocalGbp(0);
          setCreditCardGbp(0);
          setCashInTillGbp(0);
        } else {
          setCashGbp(sale.cash);
          setOnlineGbp(sale.online);
          setDeliveryGbp(sale.delivery);
          setJustEatGbp(sale.justEat);
          setMylocalGbp(sale.mylocal);
          setCreditCardGbp(sale.creditCard);
          setCashInTillGbp((sale as any).cashInTill || 0);
          // Reset EUR fields
          setCashEur(0);
          setOnlineEur(0);
          setDeliveryEur(0);
          setJustEatEur(0);
          setMylocalEur(0);
          setCreditCardEur(0);
          setCashInTillEur(0);
        }
      } else {
        // Create mode
        const today = new Date().toISOString().split("T")[0];
        setDate(today);

        // Set first store as default if available
        if (stores.length > 0) {
          setSelectedStore(stores[0].id);
        }

        // Reset all amounts
        setCashEur(0);
        setOnlineEur(0);
        setDeliveryEur(0);
        setJustEatEur(0);
        setMylocalEur(0);
        setCreditCardEur(0);
        setCashGbp(0);
        setOnlineGbp(0);
        setDeliveryGbp(0);
        setJustEatGbp(0);
        setMylocalGbp(0);
        setCreditCardGbp(0);
        setNotes("");
      }
    }
  }, [open, sale, stores]);

  const store = stores.find((s) => s.id === selectedStore);
  const supportedCurrencies = store?.supportedCurrencies || ["EUR"];
  const supportsEur = supportedCurrencies.includes("EUR");
  const supportsGbp = supportedCurrencies.includes("GBP");

  const totalEur = cashEur + onlineEur + deliveryEur + justEatEur + mylocalEur + creditCardEur;
  const totalGbp = cashGbp + onlineGbp + deliveryGbp + justEatGbp + mylocalGbp + creditCardGbp;

  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }

    if (!date) {
      toast.error("Please select a date");
      return;
    }

    // Check if at least one amount is entered
    if (totalEur === 0 && totalGbp === 0) {
      toast.error("Please enter at least one sale amount");
      return;
    }

    try {
      setLoading(true);

      if (sale) {
        // Edit mode - update the single existing sale
        const cashInTill = sale.currency === "EUR" ? cashInTillEur : cashInTillGbp;
        const total = sale.currency === "EUR" ? totalEur : totalGbp;
        const difference = total - cashInTill;

        const payload = {
          storeId: selectedStore,
          currency: sale.currency,
          date,
          cash: sale.currency === "EUR" ? cashEur : cashGbp,
          online: sale.currency === "EUR" ? onlineEur : onlineGbp,
          delivery: sale.currency === "EUR" ? deliveryEur : deliveryGbp,
          justEat: sale.currency === "EUR" ? justEatEur : justEatGbp,
          mylocal: sale.currency === "EUR" ? mylocalEur : mylocalGbp,
          creditCard: sale.currency === "EUR" ? creditCardEur : creditCardGbp,
          cashInTill,
          difference,
          notes: notes.trim() || undefined,
        };

        const response = await fetch(`/api/sales/${sale.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update sale");
        }

        toast.success("Sale updated successfully");
      } else {
        // Create mode - create separate sales for EUR and GBP if both have amounts
        const salesToCreate = [];

        if (totalEur > 0 && supportsEur) {
          const differenceEur = totalEur - cashInTillEur;
          salesToCreate.push({
            storeId: selectedStore,
            currency: "EUR",
            date,
            cash: cashEur,
            online: onlineEur,
            delivery: deliveryEur,
            justEat: justEatEur,
            mylocal: mylocalEur,
            creditCard: creditCardEur,
            cashInTill: cashInTillEur,
            difference: differenceEur,
            notes: notes.trim() || undefined,
          });
        }

        if (totalGbp > 0 && supportsGbp) {
          const differenceGbp = totalGbp - cashInTillGbp;
          salesToCreate.push({
            storeId: selectedStore,
            currency: "GBP",
            date,
            cash: cashGbp,
            online: onlineGbp,
            delivery: deliveryGbp,
            justEat: justEatGbp,
            mylocal: mylocalGbp,
            creditCard: creditCardGbp,
            cashInTill: cashInTillGbp,
            difference: differenceGbp,
            notes: notes.trim() || undefined,
          });
        }

        // Create all sales
        const results = await Promise.all(
          salesToCreate.map((payload) =>
            fetch("/api/sales", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          )
        );

        // Check if all succeeded
        const errors = [];
        for (const response of results) {
          if (!response.ok) {
            const error = await response.json();
            errors.push(error.error || "Failed to save sale");
          }
        }

        if (errors.length > 0) {
          throw new Error(errors.join(", "));
        }

        toast.success(
          salesToCreate.length > 1
            ? "Sales created successfully for both currencies"
            : "Sale created successfully"
        );
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving sale:", error);
      toast.error(error.message || "Failed to save sale");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (sale && onDelete) {
      onDelete(sale.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sale ? "Edit Sale" : "Record Sale"}</DialogTitle>
          <DialogDescription>
            {sale
              ? "Update sales record details"
              : "Record daily sales for a store"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store">
              Store <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedStore} onValueChange={handleStoreChange}>
              <SelectTrigger id="store">
                <SelectValue placeholder="Select store" />
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

          <div className="space-y-2">
            <Label htmlFor="date">
              Date <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="space-y-6">
            {/* EUR Section */}
            {supportsEur && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-eur" />
                  <h3 className="text-sm font-semibold text-eur">EUR (€)</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput
                    label="Cash"
                    id="cash-eur"
                    value={cashEur}
                    onChange={setCashEur}
                    currency="EUR"
                  />
                  <CurrencyInput
                    label="Online"
                    id="online-eur"
                    value={onlineEur}
                    onChange={setOnlineEur}
                    currency="EUR"
                  />
                  <CurrencyInput
                    label="Delivery"
                    id="delivery-eur"
                    value={deliveryEur}
                    onChange={setDeliveryEur}
                    currency="EUR"
                  />
                  <CurrencyInput
                    label="Just Eat"
                    id="justEat-eur"
                    value={justEatEur}
                    onChange={setJustEatEur}
                    currency="EUR"
                  />
                  <CurrencyInput
                    label="MyLocal"
                    id="mylocal-eur"
                    value={mylocalEur}
                    onChange={setMylocalEur}
                    currency="EUR"
                  />
                  <CurrencyInput
                    label="Credit Card"
                    id="creditCard-eur"
                    value={creditCardEur}
                    onChange={setCreditCardEur}
                    currency="EUR"
                  />
                </div>
                {totalEur > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>EUR Total:</span>
                      <span className="text-eur">{formatCurrency(totalEur, "EUR")}</span>
                    </div>
                  </div>
                )}
                {/* Cash Reconciliation */}
                <div className="pt-3 border-t space-y-3">
                  <CurrencyInput
                    label="Cash in Till"
                    id="cashInTill-eur"
                    value={cashInTillEur}
                    onChange={setCashInTillEur}
                    currency="EUR"
                  />
                  {totalEur > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Difference:</span>
                        <span className={`text-lg font-bold ${
                          totalEur - cashInTillEur === 0 
                            ? "text-green-600" 
                            : totalEur - cashInTillEur > 0 
                            ? "text-orange-600" 
                            : "text-red-600"
                        }`}>
                          {formatCurrency(totalEur - cashInTillEur, "EUR")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total Sales - Cash in Till
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GBP Section */}
            {supportsGbp && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gbp" />
                  <h3 className="text-sm font-semibold text-gbp">GBP (£)</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput
                    label="Cash"
                    id="cash-gbp"
                    value={cashGbp}
                    onChange={setCashGbp}
                    currency="GBP"
                  />
                  <CurrencyInput
                    label="Online"
                    id="online-gbp"
                    value={onlineGbp}
                    onChange={setOnlineGbp}
                    currency="GBP"
                  />
                  <CurrencyInput
                    label="Delivery"
                    id="delivery-gbp"
                    value={deliveryGbp}
                    onChange={setDeliveryGbp}
                    currency="GBP"
                  />
                  <CurrencyInput
                    label="Just Eat"
                    id="justEat-gbp"
                    value={justEatGbp}
                    onChange={setJustEatGbp}
                    currency="GBP"
                  />
                  <CurrencyInput
                    label="MyLocal"
                    id="mylocal-gbp"
                    value={mylocalGbp}
                    onChange={setMylocalGbp}
                    currency="GBP"
                  />
                  <CurrencyInput
                    label="Credit Card"
                    id="creditCard-gbp"
                    value={creditCardGbp}
                    onChange={setCreditCardGbp}
                    currency="GBP"
                  />
                </div>
                {totalGbp > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>GBP Total:</span>
                      <span className="text-gbp">{formatCurrency(totalGbp, "GBP")}</span>
                    </div>
                  </div>
                )}
                {/* Cash Reconciliation */}
                <div className="pt-3 border-t space-y-3">
                  <CurrencyInput
                    label="Cash in Till"
                    id="cashInTill-gbp"
                    value={cashInTillGbp}
                    onChange={setCashInTillGbp}
                    currency="GBP"
                  />
                  {totalGbp > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Difference:</span>
                        <span className={`text-lg font-bold ${
                          totalGbp - cashInTillGbp === 0 
                            ? "text-green-600" 
                            : totalGbp - cashInTillGbp > 0 
                            ? "text-orange-600" 
                            : "text-red-600"
                        }`}>
                          {formatCurrency(totalGbp - cashInTillGbp, "GBP")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total Sales - Cash in Till
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            {sale && onDelete && (
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
              {loading ? "Saving..." : sale ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
