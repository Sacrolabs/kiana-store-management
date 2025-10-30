"use client";

import { useState, useEffect } from "react";
import { Plus, DollarSign, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/app-layout";
import { ExpenseWithRelations } from "@/lib/types/expense";
import { VendorWithExpenseCount } from "@/lib/types/vendor";
import { Store } from "@/lib/types/store";
import { formatCurrency } from "@/lib/currency/utils";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import { VendorDialog } from "@/components/vendors/vendor-dialog";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [vendors, setVendors] = useState<VendorWithExpenseCount[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorWithExpenseCount | null>(null);

  // Date filtering state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("today");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    Promise.all([fetchExpenses(), fetchVendors(), fetchStores()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors");
      if (!response.ok) throw new Error("Failed to fetch vendors");
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to load vendors");
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
    }
  };

  // Filter expenses by date range
  const filteredExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.expenseDate);
    return expenseDate >= dateRange.from && expenseDate <= dateRange.to;
  });

  // Calculate totals by currency (from filtered expenses)
  const totals = filteredExpenses.reduce((acc, expense) => {
    if (!acc[expense.currency]) {
      acc[expense.currency] = 0;
    }
    acc[expense.currency] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleAddVendor = () => {
    setSelectedVendor(null);
    setVendorDialogOpen(true);
  };

  const handleEditVendor = (vendor: VendorWithExpenseCount) => {
    setSelectedVendor(vendor);
    setVendorDialogOpen(true);
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete vendor");
      }

      toast.success("Vendor deleted successfully");
      fetchVendors();
      setVendorDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting vendor:", error);
      toast.error(error.message || "Failed to delete vendor");
    }
  };

  const handleVendorSuccess = () => {
    fetchVendors();
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top">
          <div className="p-4">
            <h1 className="text-2xl font-bold">Expenses & Vendors</h1>
            <p className="text-sm text-muted-foreground">
              Track expenses and manage vendors
            </p>
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
              {Object.entries(totals).map(([currency, amount]) => (
                <div
                  key={currency}
                  className={`px-3 py-2 rounded-lg ${
                    currency === "EUR" ? "bg-eur/10" : "bg-gbp/10"
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    Total {currency}
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      currency === "EUR" ? "text-eur" : "text-gbp"
                    }`}
                  >
                    {formatCurrency(amount, currency as any)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content with Tabs */}
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="expenses" className="h-full">
            <div className="sticky top-0 z-10 bg-background border-b px-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expenses">
                  <Receipt className="h-4 w-4 mr-2" />
                  Expenses
                </TabsTrigger>
                <TabsTrigger value="vendors">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Vendors ({vendors.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="expenses" className="p-4 space-y-4 mt-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : stores.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No stores yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add stores first before recording expenses
                  </p>
                </div>
              ) : vendors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No vendors yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add vendors first before recording expenses
                  </p>
                  <Button
                    onClick={() =>
                      document
                        .querySelector('[value="vendors"]')
                        ?.dispatchEvent(new Event("click", { bubbles: true }))
                    }
                  >
                    Go to Vendors
                  </Button>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {expenses.length === 0 ? "No expenses recorded" : "No expenses for selected period"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {expenses.length === 0
                      ? "Expense tracking coming in full version"
                      : "Try selecting a different date range"}
                  </p>
                </div>
              ) : (
                filteredExpenses.map((expense) => (
                  <Card key={expense.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{expense.vendor.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {expense.store.name}
                        </div>
                        {expense.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {expense.description}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            expense.currency === "EUR" ? "text-eur" : "text-gbp"
                          }`}
                        >
                          {formatCurrency(expense.amount, expense.currency as any)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="vendors" className="p-4 space-y-4 mt-0">
              <Button onClick={handleAddVendor} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading vendors...</div>
                </div>
              ) : vendors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No vendors yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your first vendor to get started
                  </p>
                </div>
              ) : (
                vendors.map((vendor) => (
                  <Card
                    key={vendor.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleEditVendor(vendor)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-lg">{vendor.name}</div>
                        {vendor.contact && (
                          <div className="text-sm text-muted-foreground">
                            {vendor.contact}
                          </div>
                        )}
                        {vendor.email && (
                          <div className="text-sm text-muted-foreground">
                            {vendor.email}
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="text-sm text-muted-foreground">
                            {vendor.phone}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {vendor._count.expenses} expense{vendor._count.expenses !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <VendorDialog
        open={vendorDialogOpen}
        onClose={() => setVendorDialogOpen(false)}
        onSuccess={handleVendorSuccess}
        vendor={selectedVendor}
        onDelete={handleDeleteVendor}
      />
    </AppLayout>
  );
}
