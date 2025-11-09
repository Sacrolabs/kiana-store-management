"use client";

import { useState, useEffect, useRef } from "react";
import { DollarSign, Download, Calendar, User, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { formatCurrency } from "@/lib/currency/utils";
import { toast } from "sonner";
import { format, startOfWeek } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { PaymentDialog } from "@/components/payments/payment-dialog";

interface Employee {
  id: string;
  name: string;
}

interface Payment {
  id: string;
  employeeId: string;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  paidDate: string;
  notes: string | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: new Date(),
  });
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("week");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchPayments()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payments/all");
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
    }
  };

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.paidDate);
    const inDateRange =
      paymentDate >= dateRange.from && paymentDate <= dateRange.to;
    const matchesEmployee =
      selectedEmployeeId === "all" || payment.employeeId === selectedEmployeeId;
    const matchesCurrency =
      selectedCurrency === "all" || payment.currency === selectedCurrency;

    return inDateRange && matchesEmployee && matchesCurrency;
  });

  // Calculate totals
  const totals = filteredPayments.reduce(
    (acc, payment) => {
      if (!acc[payment.currency]) {
        acc[payment.currency] = 0;
      }
      acc[payment.currency] += payment.amountPaid;
      return acc;
    },
    {} as Record<string, number>
  );

  // Group by employee
  const paymentsByEmployee = filteredPayments.reduce((acc, payment) => {
    const employeeName = payment.employee.name;
    if (!acc[employeeName]) {
      acc[employeeName] = [];
    }
    acc[employeeName].push(payment);
    return acc;
  }, {} as Record<string, Payment[]>);

  const downloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      setDownloading(true);
      toast.info("Generating PDF...");

      const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
      const employeeName = selectedEmployee ? selectedEmployee.name : "All Employees";
      const fromDate = format(dateRange.from, "dd-MMM-yyyy");
      const toDate = format(dateRange.to, "dd-MMM-yyyy");
      const filename = `Payments_${employeeName.replace(/\s+/g, "_")}_${format(dateRange.from, "ddMMMyyyy")}-${format(dateRange.to, "ddMMMyyyy")}.pdf`;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;

      // Add header
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Payment Records", margin, 20);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Employee: ${employeeName} | Period: ${fromDate} to ${toDate}`, margin, 28);
      pdf.text(`Generated on: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, 33);

      // Draw line
      pdf.setLineWidth(0.5);
      pdf.line(margin, 36, pageWidth - margin, 36);

      const element = reportRef.current.cloneNode(true) as HTMLElement;
      const cards = element.querySelectorAll('[data-payment-card]');

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px";
      container.style.backgroundColor = "white";
      document.body.appendChild(container);

      let currentY = 45;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        container.innerHTML = "";
        const cardClone = card.cloneNode(true) as HTMLElement;
        container.appendChild(cardClone);

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (currentY + imgHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5;
      }

      document.body.removeChild(container);
      pdf.save(filename);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleDeletePayment = async (id: string) => {
    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete payment");
      }

      toast.success("Payment deleted successfully");
      fetchPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    }
  };

  const handlePaymentSuccess = () => {
    fetchPayments();
    setPaymentDialogOpen(false);
    setSelectedPayment(null);
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

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Payment Records</h1>
              </div>
              <Button
                onClick={downloadPDF}
                disabled={downloading || filteredPayments.length === 0}
                className="gap-2"
                size="sm"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Generating..." : "Download PDF"}
              </Button>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <DateFilter
                value={dateRange}
                onChange={setDateRange}
                preset={dateFilter}
                onPresetChange={setDateFilter}
              />

              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Totals */}
            {Object.keys(totals).length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {Object.entries(totals).map(([currency, amount]) => (
                  <div
                    key={currency}
                    className={`px-3 py-2 rounded-lg ${
                      currency === "EUR" ? "bg-eur/10" : "bg-gbp/10"
                    }`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      Total Paid {currency}
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
        </div>

        {/* Content */}
        <div ref={reportRef} className="flex-1 overflow-auto p-4 space-y-4">
          {filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No payment records</h3>
              <p className="text-sm text-muted-foreground">
                No payments found for the selected filters
              </p>
            </div>
          ) : (
            Object.entries(paymentsByEmployee).map(([employeeName, employeePayments]) => (
              <div key={employeeName} data-payment-card>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {employeeName}
                </h2>
                <div className="space-y-3">
                  {employeePayments.map((payment) => (
                    <Card 
                      key={payment.id} 
                      className="overflow-hidden cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleEditPayment(payment)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(payment.paidDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                          <div
                            className={`text-xl font-bold ${
                              payment.currency === "EUR" ? "text-eur" : "text-gbp"
                            }`}
                          >
                            {formatCurrency(payment.amountPaid, payment.currency as any)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {payment.paymentMethod === "CASH" ? (
                              <>
                                <Banknote className="h-4 w-4" />
                                <span>Cash</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4" />
                                <span>Bank Account</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), "HH:mm")}
                          </div>
                        </div>
                        {payment.notes && (
                          <div className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                            {payment.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedPayment && (
        <PaymentDialog
          open={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            setSelectedPayment(null);
          }}
          onSuccess={handlePaymentSuccess}
          employeeId={selectedPayment.employeeId}
          employeeName={selectedPayment.employee.name}
          defaultCurrency={selectedPayment.currency as any}
          paymentToEdit={selectedPayment}
          onDelete={handleDeletePayment}
        />
      )}
    </AppLayout>
  );
}

