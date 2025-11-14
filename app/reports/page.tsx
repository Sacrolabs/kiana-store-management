"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, DollarSign, Clock, Store as StoreIcon, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/app-layout";
import { formatCurrency } from "@/lib/currency/utils";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { toast } from "sonner";
import { startOfDay, endOfDay, startOfWeek, startOfMonth, format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Date filtering state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("month");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange, selectedStoreId]); // Refetch when date range or store filter changes

  const downloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      setDownloading(true);
      toast.info("Generating PDF...");

      // Get the store name for the filename
      const selectedStore = stores.find((s) => s.id === selectedStoreId);
      const storeName = selectedStore ? selectedStore.name : "All Stores";

      // Format dates for filename and header
      const fromDate = format(dateRange.from, "dd-MMM-yyyy");
      const toDate = format(dateRange.to, "dd-MMM-yyyy");
      const dateRangeText = `${fromDate} to ${toDate}`;

      // Create filename
      const filename = `Report_${storeName.replace(/\s+/g, "_")}_${format(dateRange.from, "ddMMMyyyy")}-${format(dateRange.to, "ddMMMyyyy")}.pdf`;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15;

      // Add header
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Reports & Analytics", margin, 20);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Store: ${storeName} | Period: ${dateRangeText}`, margin, 28);
      pdf.text(`Generated on: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, 33);

      // Draw line under header
      pdf.setLineWidth(0.5);
      pdf.line(margin, 36, pageWidth - margin, 36);

      // Clone the report element to avoid modifying the original
      const element = reportRef.current.cloneNode(true) as HTMLElement;

      // Get all card elements
      const cards = element.querySelectorAll('[class*="card"]');

      // Create a temporary container for rendering
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px"; // Fixed width for consistency
      container.style.backgroundColor = "white";
      document.body.appendChild(container);

      let currentY = 45; // Start below header
      let isFirstPage = true;

      // Process each card separately
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;

        // Clear container and add current card
        container.innerHTML = "";
        const cardClone = card.cloneNode(true) as HTMLElement;
        container.appendChild(cardClone);

        // Generate canvas for this card
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgWidth = pageWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Check if card fits on current page
        if (currentY + imgHeight > pageHeight - margin) {
          // Add new page if not first card
          pdf.addPage();
          currentY = margin;
          isFirstPage = false;
        }

        // Add card image to PDF
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", margin, currentY, imgWidth, imgHeight);

        // Update Y position for next card
        currentY += imgHeight + 5; // 5mm gap between cards
      }

      // Remove temporary container
      document.body.removeChild(container);

      // Save the PDF
      pdf.save(filename);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

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
            deliveroo: 0,
            uberEats: 0,
          };
        }
        acc[sale.currency].cash += sale.cash || 0;
        acc[sale.currency].online += sale.online || 0;
        acc[sale.currency].delivery += sale.delivery || 0;
        acc[sale.currency].justEat += sale.justEat || 0;
        acc[sale.currency].mylocal += sale.mylocal || 0;
        acc[sale.currency].creditCard += sale.creditCard || 0;
        acc[sale.currency].deliveroo += (sale as any).deliveroo || 0;
        acc[sale.currency].uberEats += (sale as any).uberEats || 0;
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

      // Calculate cash reconciliation totals (separate from sales calculations)
      const totalCashInTill = sales.reduce((acc: any, sale: any) => {
        if (!acc[sale.currency]) acc[sale.currency] = 0;
        acc[sale.currency] += sale.cashInTill || 0;
        return acc;
      }, {});

      const totalDifference = sales.reduce((acc: any, sale: any) => {
        if (!acc[sale.currency]) acc[sale.currency] = 0;
        acc[sale.currency] += sale.difference || 0;
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
        totalCashInTill,
        totalDifference,
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Reports & Analytics</h1>
                <p className="text-sm text-muted-foreground">
                  Overview of your business
                </p>
              </div>
              <Button
                onClick={downloadPDF}
                disabled={downloading || loading}
                className="gap-2 w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 pb-4 space-y-3">
            <DateFilter
              value={dateRange}
              onChange={setDateRange}
              preset={datePreset}
              onPresetChange={setDatePreset}
              hideWeekPicker={true}
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
        <div ref={reportRef} className="flex-1 overflow-auto p-4 space-y-4">
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

          {/* Revenue Distribution Table */}
          {stats?.totalSales && Object.keys(stats.totalSales).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Sales breakdown by currency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                          Currency
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const total = Object.values(stats.totalSales).reduce((sum: number, amt: any) => sum + amt, 0);
                        return Object.entries(stats.totalSales).map(([currency, amount]: [string, any]) => {
                          const percentage = ((amount / total) * 100).toFixed(1);
                          return (
                            <tr key={currency} className="border-b last:border-b-0">
                              <td className="py-3 px-3 text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    currency === "EUR" ? "bg-blue-500" : "bg-green-500"
                                  }`} />
                                  {currency}
                                </div>
                              </td>
                              <td className={`py-3 px-3 text-sm font-semibold text-right ${
                                currency === "EUR" ? "text-eur" : "text-gbp"
                              }`}>
                                {formatCurrency(amount, currency as any)}
                              </td>
                              <td className="py-3 px-3 text-sm text-right text-muted-foreground">
                                {percentage}%
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Chart - Hidden for now */}
                {/* <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.totalSales).map(([currency, amount]: [string, any]) => ({
                        name: currency,
                        value: amount / 100,
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
                </ResponsiveContainer> */}
              </CardContent>
            </Card>
          )}

          {/* Sales by Store Table */}
          {stats?.salesByStore && Object.keys(stats.salesByStore).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sales by Store</CardTitle>
                <CardDescription>Revenue comparison across locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                          Store
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                          EUR
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                          GBP
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.salesByStore).map(([storeName, amounts]: [string, any]) => {
                        // Calculate total in a common unit (just for display order, showing actual amounts)
                        const hasEur = amounts.EUR > 0;
                        const hasGbp = amounts.GBP > 0;

                        return (
                          <tr key={storeName} className="border-b last:border-b-0">
                            <td className="py-3 px-3 text-sm font-medium">
                              {storeName}
                            </td>
                            <td className="py-3 px-3 text-sm font-semibold text-right text-eur">
                              {hasEur ? formatCurrency(amounts.EUR, "EUR") : "-"}
                            </td>
                            <td className="py-3 px-3 text-sm font-semibold text-right text-gbp">
                              {hasGbp ? formatCurrency(amounts.GBP, "GBP") : "-"}
                            </td>
                            <td className="py-3 px-3 text-sm text-right text-muted-foreground">
                              {hasEur && hasGbp ? "Mixed" : hasEur ? formatCurrency(amounts.EUR, "EUR") : formatCurrency(amounts.GBP, "GBP")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-3 px-3 text-sm">Total</td>
                        <td className="py-3 px-3 text-sm text-right text-eur">
                          {formatCurrency(
                            Object.values(stats.salesByStore).reduce((sum: number, amounts: any) => sum + amounts.EUR, 0),
                            "EUR"
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm text-right text-gbp">
                          {formatCurrency(
                            Object.values(stats.salesByStore).reduce((sum: number, amounts: any) => sum + amounts.GBP, 0),
                            "GBP"
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm text-right">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Chart - Hidden for now */}
                {/* <ResponsiveContainer width="100%" height={300}>
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
                </ResponsiveContainer> */}
              </CardContent>
            </Card>
          )}

          {/* Payment Method Distribution Table */}
          {stats?.paymentMethodTotals && Object.keys(stats.paymentMethodTotals).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
                <CardDescription>Sales breakdown by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.entries(stats.paymentMethodTotals).map(([currency, methods]: [string, any]) => {
                  // Calculate total for percentage
                  const total = methods.cash + methods.online + methods.delivery +
                                methods.justEat + methods.mylocal + methods.creditCard +
                                ((methods as any).deliveroo || 0) + ((methods as any).uberEats || 0);

                  if (total === 0) return null;

                  // Prepare table data
                  const tableData = [
                    { name: "Cash", amount: methods.cash, color: "text-green-600" },
                    { name: "Online", amount: methods.online, color: "text-blue-600" },
                    { name: "Delivery", amount: methods.delivery, color: "text-amber-600" },
                    { name: "Just Eat", amount: methods.justEat, color: "text-red-600" },
                    { name: "MyLocal", amount: methods.mylocal, color: "text-purple-600" },
                    { name: "Credit Card", amount: methods.creditCard, color: "text-indigo-600" },
                    { name: "Deliveroo", amount: (methods as any).deliveroo || 0, color: "text-teal-600" },
                    { name: "Uber Eats", amount: (methods as any).uberEats || 0, color: "text-lime-600" },
                  ].filter((item) => item.amount > 0); // Only show non-zero values

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

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                                Payment Method
                              </th>
                              <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                                Amount
                              </th>
                              <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                                %
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableData.map((row) => {
                              const percentage = ((row.amount / total) * 100).toFixed(1);
                              return (
                                <tr key={row.name} className="border-b last:border-b-0">
                                  <td className="py-3 px-3 text-sm font-medium">
                                    {row.name}
                                  </td>
                                  <td className={`py-3 px-3 text-sm font-semibold text-right ${row.color}`}>
                                    {formatCurrency(row.amount, currency as any)}
                                  </td>
                                  <td className="py-3 px-3 text-sm text-right text-muted-foreground">
                                    {percentage}%
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-t-2 font-bold">
                              <td className="py-3 px-3 text-sm">Total</td>
                              <td className={`py-3 px-3 text-sm text-right ${
                                currency === "EUR" ? "text-eur" : "text-gbp"
                              }`}>
                                {formatCurrency(total, currency as any)}
                              </td>
                              <td className="py-3 px-3 text-sm text-right">100%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Chart - Hidden for now */}
                      {/* <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={tableData.map(row => ({ name: row.name, value: row.amount / 100 }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry: any) =>
                              `${entry.name}: ${formatCurrency((entry.value as number) * 100, currency as any)}`
                            }
                          />
                          <Tooltip
                            formatter={(value: any) =>
                              formatCurrency((value as number) * 100, currency as any)
                            }
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer> */}
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

          {/* Cash Reconciliation */}
          {stats?.totalCashInTill && Object.keys(stats.totalCashInTill).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cash Reconciliation</CardTitle>
                <CardDescription>Cash in till vs. difference summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.totalCashInTill).map(([currency, cashInTillAmount]: [string, any]) => {
                  const differenceAmount = stats.totalDifference?.[currency] || 0;

                  return (
                    <div key={currency} className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${
                          currency === "EUR" ? "bg-eur" : "bg-gbp"
                        }`} />
                        <span className="font-semibold">{currency}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cash in Till:</span>
                        <span className={`font-medium ${
                          currency === "EUR" ? "text-eur" : "text-gbp"
                        }`}>
                          {formatCurrency(cashInTillAmount, currency as any)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-sm font-medium">Difference:</span>
                        <span className={`font-bold ${
                          differenceAmount === 0
                            ? "text-green-600"
                            : differenceAmount > 0
                            ? "text-orange-600"
                            : "text-red-600"
                        }`}>
                          {formatCurrency(differenceAmount, currency as any)}
                        </span>
                      </div>

                      {differenceAmount !== 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {differenceAmount > 0
                            ? "Sales recorded exceed cash in till"
                            : "Cash in till exceeds sales recorded"}
                        </p>
                      )}
                    </div>
                  );
                })}
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

