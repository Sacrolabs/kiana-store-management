"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Clock, Store as StoreIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/app-layout";
import { formatCurrency } from "@/lib/currency/utils";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { toast } from "sonner";
import { startOfDay, endOfDay, startOfWeek } from "date-fns";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");

  // Date filtering state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("week");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange, selectedStoreId]); // Refetch when date range or store filter changes

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all data
      const [salesRes, storesRes, attendanceRes, expensesRes, deliveriesRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/stores"),
        fetch("/api/attendance"),
        fetch("/api/expenses"),
        fetch("/api/deliveries"),
      ]);

      const salesData = await salesRes.json();
      const storesData = await storesRes.json();
      const attendanceData = await attendanceRes.json();
      const expensesData = await expensesRes.json();
      const deliveriesData = await deliveriesRes.json();

      // Store stores in state for filter - ensure it's always an array
      setStores(Array.isArray(storesData) ? storesData : []);

      // Ensure all data is arrays
      const safeSalesData = Array.isArray(salesData) ? salesData : [];
      const safeAttendanceData = Array.isArray(attendanceData) ? attendanceData : [];
      const safeExpensesData = Array.isArray(expensesData) ? expensesData : [];
      const safeDeliveriesData = Array.isArray(deliveriesData) ? deliveriesData : [];

      // Filter data by date range and store
      const sales = safeSalesData.filter((sale: any) => {
        const saleDate = new Date(sale.date);
        const dateMatch = saleDate >= dateRange.from && saleDate <= dateRange.to;
        const storeMatch = selectedStoreId === "all" || sale.storeId === selectedStoreId;
        return dateMatch && storeMatch;
      });

      const attendance = safeAttendanceData.filter((record: any) => {
        const checkInDate = new Date(record.checkIn);
        const dateMatch = checkInDate >= dateRange.from && checkInDate <= dateRange.to;
        const storeMatch = selectedStoreId === "all" || record.storeId === selectedStoreId;
        return dateMatch && storeMatch;
      });

      const expenses = safeExpensesData.filter((expense: any) => {
        const expenseDate = new Date(expense.expenseDate);
        const dateMatch = expenseDate >= dateRange.from && expenseDate <= dateRange.to;
        const storeMatch = selectedStoreId === "all" || expense.storeId === selectedStoreId;
        return dateMatch && storeMatch;
      });

      const deliveries = safeDeliveriesData.filter((delivery: any) => {
        const deliveryDate = new Date(delivery.deliveryDate);
        const dateMatch = deliveryDate >= dateRange.from && deliveryDate <= dateRange.to;
        const storeMatch = selectedStoreId === "all" || delivery.storeId === selectedStoreId;
        return dateMatch && storeMatch;
      });

      // Calculate statistics
      const salesByStore = sales.reduce((acc: any, sale: any) => {
        if (!acc[sale.store.name]) {
          acc[sale.store.name] = { EUR: 0, GBP: 0 };
        }
        acc[sale.store.name][sale.currency] += sale.total;
        return acc;
      }, {});

      const totalSales = sales.reduce((acc: any, sale: any) => {
        if (!acc[sale.currency]) acc[sale.currency] = 0;
        acc[sale.currency] += sale.total;
        return acc;
      }, {});

      // Calculate payment method totals
      const paymentMethodTotals = sales.reduce((acc: any, sale: any) => {
        if (!acc[sale.currency]) {
          acc[sale.currency] = {
            cash: 0,
            online: 0,
            delivery: 0,
            justEat: 0,
            mylocal: 0,
            creditCard: 0,
          };
        }
        acc[sale.currency].cash += sale.cash || 0;
        acc[sale.currency].online += sale.online || 0;
        acc[sale.currency].delivery += sale.delivery || 0;
        acc[sale.currency].justEat += sale.justEat || 0;
        acc[sale.currency].mylocal += sale.mylocal || 0;
        acc[sale.currency].creditCard += sale.creditCard || 0;
        return acc;
      }, {});

      const totalPayroll = attendance.reduce((acc: any, record: any) => {
        if (!acc[record.currency]) acc[record.currency] = 0;
        acc[record.currency] += record.amountToPay;
        return acc;
      }, {});

      const totalHours = attendance.reduce((sum: number, record: any) => {
        return sum + parseFloat(record.hoursWorked.toString());
      }, 0);

      const totalExpenses = expenses.reduce((acc: any, expense: any) => {
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
      }, {});

      const totalDeliveryExpenses = deliveries.reduce((acc: any, delivery: any) => {
        if (!acc[delivery.currency]) acc[delivery.currency] = 0;
        acc[delivery.currency] += delivery.expenseAmount;
        return acc;
      }, {});

      // Calculate profit (sales - expenses - payroll - delivery expenses)
      const profit: any = {};
      const allCurrencies = new Set([
        ...Object.keys(totalSales),
        ...Object.keys(totalExpenses),
        ...Object.keys(totalPayroll),
        ...Object.keys(totalDeliveryExpenses),
      ]);

      allCurrencies.forEach((currency) => {
        const salesAmount = totalSales[currency] || 0;
        const expensesAmount = totalExpenses[currency]?.total || 0;
        const payrollAmount = totalPayroll[currency] || 0;
        const deliveryExpensesAmount = totalDeliveryExpenses[currency] || 0;
        profit[currency] = salesAmount - expensesAmount - payrollAmount - deliveryExpensesAmount;
      });

      setStats({
        stores: storesData.length,
        totalSales,
        paymentMethodTotals,
        totalPayroll,
        totalExpenses,
        totalDeliveryExpenses,
        profit,
        totalHours,
        salesByStore,
        salesCount: sales.length,
        attendanceCount: attendance.length,
        expensesCount: expenses.length,
        deliveriesCount: deliveries.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading reports...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top">
          <div className="p-4 pb-2">
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Overview of your business
            </p>
          </div>

          {/* Filters */}
          <div className="px-4 pb-4 space-y-3">
            <DateFilter
              value={dateRange}
              onChange={setDateRange}
              preset={datePreset}
              onPresetChange={setDatePreset}
            />

            {/* Store Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Store:</span>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Overview Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Stores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.stores || 0}</div>
              <StoreIcon className="h-4 w-4 text-muted-foreground mt-1" />
            </CardContent>
          </Card>

          {/* Revenue Distribution Chart */}
          {stats?.totalSales && Object.keys(stats.totalSales).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Sales breakdown by currency</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.totalSales).map(([currency, amount]: [string, any]) => ({
                        name: currency,
                        value: amount / 100, // Convert from cents to major units for display
                        fill: currency === "EUR" ? "#3b82f6" : "#10b981",
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.name}: ${formatCurrency((entry.value as number) * 100, entry.name as any)}`}
                    >
                      {Object.entries(stats.totalSales).map(([currency], index) => (
                        <Cell key={`cell-${index}`} fill={currency === "EUR" ? "#3b82f6" : "#10b981"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `${(value as number).toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Sales by Store Chart */}
          {stats?.salesByStore && Object.keys(stats.salesByStore).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sales by Store</CardTitle>
                <CardDescription>Revenue comparison across locations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(stats.salesByStore).map(([storeName, amounts]: [string, any]) => ({
                      store: storeName.length > 15 ? storeName.substring(0, 15) + "..." : storeName,
                      EUR: amounts.EUR / 100,
                      GBP: amounts.GBP / 100,
                    }))}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="store" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        `${name === "EUR" ? "€" : "£"}${(value as number).toFixed(2)}`,
                        name,
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="EUR" fill="#3b82f6" name="EUR (€)" />
                    <Bar dataKey="GBP" fill="#10b981" name="GBP (£)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Payment Method Distribution Chart */}
          {stats?.paymentMethodTotals && Object.keys(stats.paymentMethodTotals).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
                <CardDescription>Sales breakdown by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.entries(stats.paymentMethodTotals).map(([currency, methods]: [string, any]) => {
                  // Convert to chart data format
                  const chartData = [
                    { name: "Cash", value: methods.cash / 100, fill: "#10b981" },
                    { name: "Online", value: methods.online / 100, fill: "#3b82f6" },
                    { name: "Delivery", value: methods.delivery / 100, fill: "#f59e0b" },
                    { name: "Just Eat", value: methods.justEat / 100, fill: "#ef4444" },
                    { name: "MyLocal", value: methods.mylocal / 100, fill: "#8b5cf6" },
                    { name: "Credit Card", value: methods.creditCard / 100, fill: "#6366f1" },
                  ].filter((item) => item.value > 0); // Only show non-zero values

                  if (chartData.length === 0) return null;

                  return (
                    <div key={currency} className="mb-6 last:mb-0">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            currency === "EUR" ? "bg-blue-500" : "bg-green-500"
                          }`}
                        />
                        {currency}
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry: any) =>
                              `${entry.name}: ${formatCurrency((entry.value as number) * 100, currency as any)}`
                            }
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) =>
                              formatCurrency((value as number) * 100, currency as any)
                            }
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Sales Revenue */}
          {stats?.totalSales && Object.keys(stats.totalSales).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Total Revenue</CardTitle>
                <CardDescription>Sales revenue by currency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats.totalSales).map(([currency, amount]: [string, any]) => (
                  <div key={currency} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        currency === "EUR" ? "bg-eur" : "bg-gbp"
                      }`} />
                      <span className="font-medium">{currency}</span>
                    </div>
                    <div className={`text-lg font-bold ${
                      currency === "EUR" ? "text-eur" : "text-gbp"
                    }`}>
                      {formatCurrency(amount, currency as any)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payroll */}
          {stats?.totalPayroll && Object.keys(stats.totalPayroll).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Total Payroll</CardTitle>
                <CardDescription>Staff payments by currency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats.totalPayroll).map(([currency, amount]: [string, any]) => (
                  <div key={currency} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        currency === "EUR" ? "bg-eur" : "bg-gbp"
                      }`} />
                      <span className="font-medium">{currency}</span>
                    </div>
                    <div className={`text-lg font-bold ${
                      currency === "EUR" ? "text-eur" : "text-gbp"
                    }`}>
                      {formatCurrency(amount, currency as any)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Expenses */}
          {stats?.totalExpenses && Object.keys(stats.totalExpenses).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
                <CardDescription>Business expenses by currency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.totalExpenses).map(([currency, amounts]: [string, any]) => (
                  <div key={currency} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          currency === "EUR" ? "bg-eur" : "bg-gbp"
                        }`} />
                        <span className="font-medium">{currency}</span>
                      </div>
                      <div className={`text-lg font-bold ${
                        currency === "EUR" ? "text-eur" : "text-gbp"
                      }`}>
                        {formatCurrency(amounts.total, currency as any)}
                      </div>
                    </div>
                    <div className="ml-4 space-y-1 text-sm">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Paid:</span>
                        <span className="font-medium">{formatCurrency(amounts.paid, currency as any)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Pending:</span>
                        <span className="font-medium">{formatCurrency(amounts.pending, currency as any)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Delivery Expenses */}
          {stats?.totalDeliveryExpenses && Object.keys(stats.totalDeliveryExpenses).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Expenses</CardTitle>
                <CardDescription>Driver delivery costs by currency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats.totalDeliveryExpenses).map(([currency, amount]: [string, any]) => (
                  <div key={currency} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        currency === "EUR" ? "bg-eur" : "bg-gbp"
                      }`} />
                      <span className="font-medium">{currency}</span>
                    </div>
                    <div className={`text-lg font-bold ${
                      currency === "EUR" ? "text-eur" : "text-gbp"
                    }`}>
                      {formatCurrency(amount, currency as any)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Profit Calculation */}
          {stats?.profit && Object.keys(stats.profit).length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Net Profit</CardTitle>
                <CardDescription>Profit calculation breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.profit).map(([currency]: [string, any]) => (
                  <div key={currency} className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${
                        currency === "EUR" ? "bg-eur" : "bg-gbp"
                      }`} />
                      <span className="font-semibold">{currency}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Sales</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(stats.totalSales[currency] || 0, currency as any)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Expenses</span>
                        <span className="font-medium text-red-600">
                          - {formatCurrency(stats.totalExpenses[currency]?.total || 0, currency as any)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Labour Payments</span>
                        <span className="font-medium text-red-600">
                          - {formatCurrency(stats.totalPayroll[currency] || 0, currency as any)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Delivery Expenses</span>
                        <span className="font-medium text-red-600">
                          - {formatCurrency(stats.totalDeliveryExpenses[currency] || 0, currency as any)}
                        </span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Net Profit</span>
                          <span className={`text-lg font-bold ${
                            stats.profit[currency] >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {formatCurrency(stats.profit[currency], currency as any)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sales by Store */}
          {stats?.salesByStore && Object.keys(stats.salesByStore).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sales by Store</CardTitle>
                <CardDescription>Revenue breakdown per location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.salesByStore).map(([storeName, amounts]: [string, any]) => (
                  <div key={storeName}>
                    <div className="font-medium mb-2">{storeName}</div>
                    <div className="space-y-1 pl-4">
                      {amounts.EUR > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">EUR</span>
                          <span className="text-eur font-medium">
                            {formatCurrency(amounts.EUR, "EUR")}
                          </span>
                        </div>
                      )}
                      {amounts.GBP > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">GBP</span>
                          <span className="text-gbp font-medium">
                            {formatCurrency(amounts.GBP, "GBP")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {(!stats?.salesCount && !stats?.attendanceCount && !stats?.expensesCount) && (
            <Card className="p-8">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No data yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start recording sales, attendance, and expenses to see analytics
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

