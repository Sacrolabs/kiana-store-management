"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, Receipt, Users, Edit, Plus, CheckCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/app-layout";
import { Store } from "@/lib/types/store";
import { Sale } from "@/lib/types/sale";
import { Expense } from "@/lib/types/expense";
import { AttendanceWithRelations } from "@/lib/types/attendance";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency/utils";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { StoreEmployeesDialog } from "@/components/stores/store-employees-dialog";
import { AttendanceDialog } from "@/components/attendance/attendance-dialog";
import { SalesDialog } from "@/components/sales/sales-dialog";
import { ExpensesDialog } from "@/components/expenses/expenses-dialog";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [attendance, setAttendance] = useState<AttendanceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesDialogOpen, setEmployeesDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [employeesRefreshKey, setEmployeesRefreshKey] = useState(0);

  // Date filtering state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("today");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    Promise.all([
      fetchStore(),
      fetchSales(),
      fetchExpenses(),
      fetchAttendance(),
    ]).finally(() => setLoading(false));
  }, [storeId, dateRange]);

  const fetchStore = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`);
      if (!response.ok) throw new Error("Failed to fetch store");
      const data = await response.json();
      setStore(data);
    } catch (error) {
      console.error("Error fetching store:", error);
      toast.error("Failed to load store");
    }
  };

  const fetchSales = async () => {
    try {
      const response = await fetch(`/api/sales?storeId=${storeId}`);
      if (!response.ok) throw new Error("Failed to fetch sales");
      const data = await response.json();

      // Filter by date range
      const filtered = data.filter((sale: Sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= dateRange.from && saleDate <= dateRange.to;
      });

      setSales(filtered);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Failed to load sales");
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses?storeId=${storeId}`);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();

      // Filter by date range
      const filtered = data.filter((expense: Expense) => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate >= dateRange.from && expenseDate <= dateRange.to;
      });

      setExpenses(filtered);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`/api/attendance?storeId=${storeId}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();

      // Filter by date range
      const filtered = data.filter((record: AttendanceWithRelations) => {
        const checkInDate = new Date(record.checkIn);
        return checkInDate >= dateRange.from && checkInDate <= dateRange.to;
      });

      setAttendance(filtered);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance");
    }
  };

  // Calculate totals by currency
  const salesTotals = sales.reduce((acc, sale) => {
    if (!acc[sale.currency]) acc[sale.currency] = 0;
    acc[sale.currency] += sale.total;
    return acc;
  }, {} as Record<string, number>);

  const expensesTotals = expenses.reduce((acc, expense) => {
    if (!acc[expense.currency]) {
      acc[expense.currency] = { paid: 0, pending: 0, total: 0 };
    }
    acc[expense.currency].total += expense.amount;
    if (expense.status === "PAID") {
      acc[expense.currency].paid += expense.amount;
    } else {
      acc[expense.currency].pending += expense.amount;
    }
    return acc;
  }, {} as Record<string, { paid: number; pending: number; total: number }>);

  const attendanceTotals = attendance.reduce((acc, record) => {
    if (!acc[record.currency]) {
      acc[record.currency] = { amount: 0, hours: 0 };
    }
    acc[record.currency].amount += record.amountToPay;
    acc[record.currency].hours += parseFloat(record.hoursWorked.toString());
    return acc;
  }, {} as Record<string, { amount: number; hours: number }>);

  const handleEdit = () => {
    router.push(`/stores?edit=${storeId}`);
  };

  const handleMarkAsPaid = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark expense as paid");
      }

      toast.success("Expense marked as paid");
      fetchExpenses();
    } catch (error) {
      console.error("Error marking expense as paid:", error);
      toast.error("Failed to mark expense as paid");
    }
  };

  const handleEditSale = (sale: Sale) => {
    setSaleToEdit(sale);
    setSalesDialogOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setExpensesDialogOpen(true);
  };

  const handleCloseSalesDialog = () => {
    setSalesDialogOpen(false);
    setSaleToEdit(null);
  };

  const handleCloseExpensesDialog = () => {
    setExpensesDialogOpen(false);
    setExpenseToEdit(null);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!store) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-lg font-medium mb-4">Store not found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <h1 className="text-2xl font-bold">{store.name}</h1>
            {store.address && (
              <p className="text-sm text-muted-foreground mt-1">{store.address}</p>
            )}
            <div className="flex gap-2 mt-2">
              {store.supportedCurrencies.map((currency) => (
                <span
                  key={currency}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    currency === "EUR"
                      ? "bg-eur/10 text-eur"
                      : "bg-gbp/10 text-gbp"
                  }`}
                >
                  {getCurrencySymbol(currency as any)} {currency}
                  {currency === store.defaultCurrency && " (default)"}
                </span>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="px-4 pb-4">
            <DateFilter
              value={dateRange}
              onChange={setDateRange}
              preset={datePreset}
              onPresetChange={setDatePreset}
            />
          </div>
        </div>

        {/* Content with Tabs */}
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="sales" className="h-full">
            <div className="sticky top-0 z-10 bg-background border-b px-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sales">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="expenses">
                  <Receipt className="h-4 w-4 mr-2" />
                  Expenses
                </TabsTrigger>
                <TabsTrigger value="staff">
                  <Users className="h-4 w-4 mr-2" />
                  Staff
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Sales Tab */}
            <TabsContent value="sales" className="p-4 space-y-4 mt-0">
              {/* Add Sale Button */}
              <Button
                onClick={() => setSalesDialogOpen(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sale
              </Button>

              {/* Sales Totals */}
              {Object.keys(salesTotals).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(salesTotals).map(([currency, total]) => (
                    <div
                      key={currency}
                      className={`px-3 py-2 rounded-lg ${
                        currency === "EUR" ? "bg-eur/10" : "bg-gbp/10"
                      }`}
                    >
                      <div className="text-xs font-medium text-muted-foreground">
                        Total Sales ({currency})
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          currency === "EUR" ? "text-eur" : "text-gbp"
                        }`}
                      >
                        {formatCurrency(total, currency as any)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sales.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sales records</h3>
                  <p className="text-sm text-muted-foreground">
                    No sales found for the selected period
                  </p>
                </div>
              ) : (
                sales.map((sale) => (
                  <Card key={sale.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium">
                          {format(new Date(sale.date), "MMM dd, yyyy")}
                        </div>
                        {sale.notes && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {sale.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              sale.currency === "EUR" ? "text-eur" : "text-gbp"
                            }`}
                          >
                            {formatCurrency(sale.total, sale.currency as any)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditSale(sale)}
                          className="flex-shrink-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="p-4 space-y-4 mt-0">
              {/* Add Expense Button */}
              <Button
                onClick={() => setExpensesDialogOpen(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>

              {/* Expenses Totals */}
              {Object.keys(expensesTotals).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(expensesTotals).map(([currency, data]) => (
                    <div
                      key={currency}
                      className={`px-3 py-2 rounded-lg ${
                        currency === "EUR" ? "bg-eur/10" : "bg-gbp/10"
                      }`}
                    >
                      <div className="text-xs font-medium text-muted-foreground">
                        Total Expenses ({currency})
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          currency === "EUR" ? "text-eur" : "text-gbp"
                        }`}
                      >
                        {formatCurrency(data.total, currency as any)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Paid: {formatCurrency(data.paid, currency as any)}
                      </div>
                      {data.pending > 0 && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-500">
                          Pending: {formatCurrency(data.pending, currency as any)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No expenses</h3>
                  <p className="text-sm text-muted-foreground">
                    No expenses found for the selected period
                  </p>
                </div>
              ) : (
                expenses.map((expense) => (
                  <Card key={expense.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{expense.description}</div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              expense.status === "PAID"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                          >
                            {expense.status === "PAID" ? "Paid" : "Pending"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              expense.currency === "EUR" ? "text-eur" : "text-gbp"
                            }`}
                          >
                            {formatCurrency(expense.amount, expense.currency as any)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditExpense(expense)}
                          className="flex-shrink-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {expense.status === "RAISED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(expense.id)}
                            className="flex-shrink-0"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Staff Tab */}
            <TabsContent value="staff" className="p-4 space-y-4 mt-0">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setEmployeesDialogOpen(true)}
                  className="flex-1"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Employees
                </Button>
                <Button
                  onClick={() => setAttendanceDialogOpen(true)}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Attendance
                </Button>
              </div>

              {/* Attendance Totals */}
              {Object.keys(attendanceTotals).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(attendanceTotals).map(([currency, data]) => (
                    <div
                      key={currency}
                      className={`px-3 py-2 rounded-lg ${
                        currency === "EUR" ? "bg-eur/10" : "bg-gbp/10"
                      }`}
                    >
                      <div className="text-xs font-medium text-muted-foreground">
                        Total Labor Cost ({currency})
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          currency === "EUR" ? "text-eur" : "text-gbp"
                        }`}
                      >
                        {formatCurrency(data.amount, currency as any)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.hours.toFixed(2)} hours
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {attendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No attendance records</h3>
                  <p className="text-sm text-muted-foreground">
                    No staff attendance found for the selected period
                  </p>
                </div>
              ) : (
                attendance.map((record) => (
                  <Card key={record.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{record.employee.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(record.checkIn), "MMM dd, HH:mm")} -{" "}
                          {format(new Date(record.checkOut), "HH:mm")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            record.currency === "EUR" ? "text-eur" : "text-gbp"
                          }`}
                        >
                          {formatCurrency(record.amountToPay, record.currency as any)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.hoursWorked.toString()} hours
                        </div>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="text-sm text-muted-foreground mt-2">
                        {record.notes}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Store Employees Dialog */}
      {store && (
        <StoreEmployeesDialog
          open={employeesDialogOpen}
          onClose={() => setEmployeesDialogOpen(false)}
          onSuccess={() => setEmployeesRefreshKey(prev => prev + 1)}
          storeId={storeId}
          storeName={store.name}
        />
      )}

      {/* Attendance Dialog */}
      {store && (
        <AttendanceDialog
          key={`attendance-${employeesRefreshKey}`}
          open={attendanceDialogOpen}
          onClose={() => setAttendanceDialogOpen(false)}
          onSuccess={() => {
            fetchAttendance();
            setAttendanceDialogOpen(false);
          }}
          stores={[store]}
          storeId={storeId}
        />
      )}

      {/* Sales Dialog */}
      {store && (
        <SalesDialog
          open={salesDialogOpen}
          onClose={handleCloseSalesDialog}
          onSuccess={() => {
            fetchSales();
            handleCloseSalesDialog();
          }}
          stores={[store]}
          storeId={storeId}
          saleToEdit={saleToEdit}
        />
      )}

      {/* Expenses Dialog */}
      {store && (
        <ExpensesDialog
          open={expensesDialogOpen}
          onClose={handleCloseExpensesDialog}
          onSuccess={() => {
            fetchExpenses();
            handleCloseExpensesDialog();
          }}
          stores={[store]}
          storeId={storeId}
          expenseToEdit={expenseToEdit}
        />
      )}
    </AppLayout>
  );
}
