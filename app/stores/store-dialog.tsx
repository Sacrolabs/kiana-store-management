"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, CreateStoreInput } from "@/lib/types/store";
import { toast } from "sonner";

interface StoreDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  store?: Store | null;
  onDelete?: (id: string) => void;
}

export function StoreDialog({
  open,
  onClose,
  onSuccess,
  store,
  onDelete,
}: StoreDialogProps) {
  const [loading, setLoading] = useState(false);
  const [currencyEur, setCurrencyEur] = useState(true);
  const [currencyGbp, setCurrencyGbp] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<"EUR" | "GBP">("EUR");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStoreInput>();

  useEffect(() => {
    if (open) {
      if (store) {
        // Edit mode
        reset({
          name: store.name,
          address: store.address || "",
          phone: store.phone || "",
          managerName: store.managerName || "",
        });
        setCurrencyEur(store.supportedCurrencies.includes("EUR"));
        setCurrencyGbp(store.supportedCurrencies.includes("GBP"));
        setDefaultCurrency(store.defaultCurrency as "EUR" | "GBP");
      } else {
        // Create mode
        reset({
          name: "",
          address: "",
          phone: "",
          managerName: "",
        });
        setCurrencyEur(true);
        setCurrencyGbp(false);
        setDefaultCurrency("EUR");
      }
    }
  }, [open, store, reset]);

  const onSubmit = async (data: CreateStoreInput) => {
    try {
      setLoading(true);

      const supportedCurrencies = [];
      if (currencyEur) supportedCurrencies.push("EUR");
      if (currencyGbp) supportedCurrencies.push("GBP");

      if (supportedCurrencies.length === 0) {
        toast.error("Please select at least one currency");
        return;
      }

      // Ensure default currency is in supported currencies
      if (!supportedCurrencies.includes(defaultCurrency)) {
        toast.error("Default currency must be in supported currencies");
        return;
      }

      const payload = {
        ...data,
        supportedCurrencies,
        defaultCurrency,
      };

      const url = store ? `/api/stores/${store.id}` : "/api/stores";
      const method = store ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save store");
      }

      toast.success(store ? "Store updated successfully" : "Store created successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Error saving store:", error);
      toast.error(error.message || "Failed to save store");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (store && onDelete) {
      onDelete(store.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{store ? "Edit Store" : "Add Store"}</DialogTitle>
          <DialogDescription>
            {store
              ? "Update store details and currency settings"
              : "Create a new store location with currency configuration"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Downtown Store"
              {...register("name", { required: "Store name is required" })}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="e.g., 123 Main St, London"
              {...register("address")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g., +44 20 1234 5678"
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerName">Manager Name</Label>
            <Input
              id="managerName"
              placeholder="e.g., John Smith"
              {...register("managerName")}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Supported Currencies <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currencyEur}
                  onChange={(e) => setCurrencyEur(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm">EUR (€)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currencyGbp}
                  onChange={(e) => setCurrencyGbp(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm">GBP (£)</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">
              Default Currency <span className="text-destructive">*</span>
            </Label>
            <Select
              value={defaultCurrency}
              onValueChange={(value: "EUR" | "GBP") => setDefaultCurrency(value)}
            >
              <SelectTrigger id="defaultCurrency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            {store && onDelete && (
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
              {loading ? "Saving..." : store ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
