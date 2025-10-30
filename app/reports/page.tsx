"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Clock, Store as StoreIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { formatCurrency } from "@/lib/currency/utils";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { toast } from "sonner";
import { startOfDay, endOfDay } from "date-fns";
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

  // Date filtering state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("today");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange]); // Refetch when date range changes

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all data
      const [salesRes, storesRes, attendanceRes, expensesRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/stores"),
        fetch("/api/attendance"),
        fetch("/api/expenses"),
      ]);

      const salesData = await salesRes.json();
      const stores = await storesRes.json();
      const attendanceData = await attendanceRes.json();
      const expensesData = await expensesRes.json();

      // Filter data by date range
      const sales = salesData.filter((sale: any) => {
        const saleDate = new Date(sale.date);
        return saleDate >= dateRange.from && saleDate <= dateRange.to;
      });

      const attendance = attendanceData.filter((record: any) => {
        const checkInDate = new Date(record.checkIn);
        return checkInDate >= dateRange.from && checkInDate <= dateRange.to;
      });

      const expenses = expensesData.filter((expense: any) => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate >= dateRange.from && expenseDate <= dateRange.to;
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

      setStats({
        stores: stores.length,
        totalSales,
        totalPayroll,
        totalExpenses,
        totalHours,
        salesByStore,
        salesCount: sales.length,
        attendanceCount: attendance.length,
        expensesCount: expenses.length,
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.salesCount || 0}</div>
                <DollarSign className="h-4 w-4 text-muted-foreground mt-1" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Attendance Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.attendanceCount || 0}</div>
                <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalHours?.toFixed(1) || "0.0"}</div>
                <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              </CardContent>
            </Card>
          </div>

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
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value * 100, entry.name as any)}`}
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
              <CardContent className="space-y-3">
                {Object.entries(stats.totalExpenses).map(([currency, amount]: [string, any]) => (
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

