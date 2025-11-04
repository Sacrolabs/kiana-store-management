"use client";

import { useState, useEffect } from "react";
import { Plus, DollarSign, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { SalesDialog } from "./sales-dialog";
import { Store } from "@/lib/types/store";
import { SaleWithStore } from "@/lib/types/sale";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency/utils";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, startOfWeek } from "date-fns";

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithStore[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithStore | null>(null);

  // Date filtering state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("week");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    Promise.all([fetchSales(), fetchStores()]).finally(() => setLoading(false));
  }, []);

  const fetchSales = async () => {
    try {
      const response = await fetch("/api/sales");
      if (!response.ok) throw new Error("Failed to fetch sales");
      const data = await response.json();
      setSales(data);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Failed to load sales");
    }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch("/api/stores");
      if (!response.ok) throw new Error("Failed to fetch stores");
      const data = await response.json();
      setStores(data);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("Failed to load stores");
    }
  };

  const handleEdit = (sale: SaleWithStore) => {
    setSelectedSale(sale);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedSale(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedSale(null);
  };

  const handleSuccess = () => {
    fetchSales();
    handleDialogClose();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sale?")) {
      return;
    }

    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete sale");

      toast.success("Sale deleted successfully");
      fetchSales();
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast.error("Failed to delete sale");
    }
  };

  // Filter sales by date range
  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    return saleDate >= dateRange.from && saleDate <= dateRange.to;
  });

  // Calculate totals by currency (from filtered sales)
  const totals = filteredSales.reduce((acc, sale) => {
    if (!acc[sale.currency]) {
      acc[sale.currency] = 0;
    }
    acc[sale.currency] += sale.total;
    return acc;
  }, {} as Record<string, number>);

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), "MMM dd, yyyy");
    } catch {
      return String(date);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-2xl font-bold">Sales</h1>
              <p className="text-sm text-muted-foreground">
                Track daily sales by store
              </p>
            </div>
            <Button onClick={handleAdd} size="icon" className="h-11 w-11" disabled={stores.length === 0}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Date Filter */}
          <div className="px-4 pb-2">
            <DateFilter
              value={dateRange}
              onChange={setDateRange}
              preset={datePreset}
              onPresetChange={setDatePreset}
            />
          </div>

          {/* Totals Summary */}
          {Object.keys(totals).length > 0 && (
            <div className="px-4 pb-4 flex gap-2 flex-wrap">
              {Object.entries(totals).map(([currency, total]) => (
                <div
                  key={currency}
                  className={`px-3 py-2 rounded-lg ${
                    currency === "EUR" ? "bg-eur/10" : "bg-gbp/10"
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    Total {currency}
                  </div>
                  <div className={`text-lg font-bold ${
                    currency === "EUR" ? "text-eur" : "text-gbp"
                  }`}>
                    {formatCurrency(total, currency as any)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading sales...</div>
            </div>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No stores yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a store first before recording sales
              </p>
              <Button onClick={() => window.location.href = "/stores"}>
                Go to Stores
              </Button>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {sales.length === 0 ? "No sales recorded" : "No sales for selected period"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {sales.length === 0
                  ? "Start by recording your first sale"
                  : "Try selecting a different date range"
                }
              </p>
              {sales.length === 0 && (
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Sale
                </Button>
              )}
            </div>
          ) : (
            filteredSales.map((sale) => (
              <Card
                key={sale.id}
                className="tap-highlight-none active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => handleEdit(sale)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {sale.store.name}
                        <span className={`text-sm font-normal px-2 py-0.5 rounded ${
                          sale.currency === "EUR" ? "bg-eur/10 text-eur" : "bg-gbp/10 text-gbp"
                        }`}>
                          {getCurrencySymbol(sale.currency as any)} {sale.currency}
                        </span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(sale.date)}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className={`text-xl font-bold ${
                        sale.currency === "EUR" ? "text-eur" : "text-gbp"
                      }`}>
                        {formatCurrency(sale.total, sale.currency as any)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Cash</div>
                    <div className="font-medium">{formatCurrency(sale.cash, sale.currency as any)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Online</div>
                    <div className="font-medium">{formatCurrency(sale.online, sale.currency as any)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Delivery</div>
                    <div className="font-medium">{formatCurrency(sale.delivery, sale.currency as any)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Just Eat</div>
                    <div className="font-medium">{formatCurrency(sale.justEat, sale.currency as any)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">MyLocal</div>
                    <div className="font-medium">{formatCurrency(sale.mylocal, sale.currency as any)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Card</div>
                    <div className="font-medium">{formatCurrency(sale.creditCard, sale.currency as any)}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <SalesDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleSuccess}
        stores={stores}
        sale={selectedSale}
        onDelete={handleDelete}
      />
    </AppLayout>
  );
}

