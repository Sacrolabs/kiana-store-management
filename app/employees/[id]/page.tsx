"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Calendar, DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { Employee } from "@/lib/types/employee";
import { AttendanceWithRelations } from "@/lib/types/attendance";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { formatCurrency } from "@/lib/currency/utils";
import { toast } from "sonner";
import { format, startOfWeek, endOfDay, startOfDay, startOfMonth, startOfYear, subMonths, subYears } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceWithRelations[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("month");
  const [downloadingPayments, setDownloadingPayments] = useState(false);
  const [downloadingAttendance, setDownloadingAttendance] = useState(false);

  const paymentRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchEmployee(), fetchAttendance(), fetchPayments()]).finally(() =>
      setLoading(false)
    );
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (!response.ok) throw new Error("Failed to fetch employee");
      const data = await response.json();
      setEmployee(data);
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("Failed to load employee");
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`/api/attendance?employeeId=${employeeId}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();
      setAttendance(data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance");
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/payments?employeeId=${employeeId}`);
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
    }
  };

  // Calculate earnings totals from attendance
  const totals = attendance.reduce(
    (acc, record) => {
      if (!acc[record.currency]) {
        acc[record.currency] = { amount: 0, hours: 0 };
      }
      acc[record.currency].amount += record.amountToPay;
      acc[record.currency].hours += parseFloat(record.hoursWorked.toString());
      return acc;
    },
    {} as Record<string, { amount: number; hours: number }>
  );

  // Calculate payment totals
  const paymentTotals = payments.reduce(
    (acc, payment) => {
      if (!acc[payment.currency]) {
        acc[payment.currency] = 0;
      }
      acc[payment.currency] += payment.amountPaid;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate remaining balance
  const remainingBalance: Record<string, number> = {};
  Object.keys(totals).forEach((currency) => {
    const earned = totals[currency].amount;
    const paid = paymentTotals[currency] || 0;
    remainingBalance[currency] = earned - paid;
  });

  const handleAddPayment = () => {
    setSelectedPayment(null);
    setPaymentDialogOpen(true);
  };

  const handleEditPayment = (payment: any) => {
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

  // Filter payments by date range
  const filteredPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.paidDate);
    return paymentDate >= dateRange.from && paymentDate <= dateRange.to;
  });

  // Filter attendance by date range
  const filteredAttendance = attendance.filter((record) => {
    const checkInDate = new Date(record.checkIn);
    return checkInDate >= dateRange.from && checkInDate <= dateRange.to;
  });

  // Calculate totals for filtered data
  const filteredTotals = filteredAttendance.reduce(
    (acc, record) => {
      if (!acc[record.currency]) {
        acc[record.currency] = { amount: 0, hours: 0, days: 0 };
      }
      acc[record.currency].amount += record.amountToPay;
      acc[record.currency].hours += parseFloat(record.hoursWorked.toString());
      acc[record.currency].days += 1; // Count each attendance record as 1 day
      return acc;
    },
    {} as Record<string, { amount: number; hours: number; days: number }>
  );

  // Calculate filtered payment totals
  const filteredPaymentTotals = filteredPayments.reduce(
    (acc, payment) => {
      if (!acc[payment.currency]) {
        acc[payment.currency] = 0;
      }
      acc[payment.currency] += payment.amountPaid;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate filtered remaining balance
  const filteredRemainingBalance: Record<string, number> = {};
  Object.keys(filteredTotals).forEach((currency) => {
    const earned = filteredTotals[currency].amount;
    const paid = filteredPaymentTotals[currency] || 0;
    filteredRemainingBalance[currency] = earned - paid;
  });

  // Group attendance by store (using filtered data)
  const attendanceByStore = filteredAttendance.reduce((acc, record) => {
    const storeName = record.store.name;
    if (!acc[storeName]) {
      acc[storeName] = [];
    }
    acc[storeName].push(record);
    return acc;
  }, {} as Record<string, AttendanceWithRelations[]>);

  // Download payment records as PDF
  const downloadPaymentsPDF = async () => {
    if (!employee) return;

    try {
      setDownloadingPayments(true);
      toast.info("Generating PDF...");

      const fromDate = format(dateRange.from, "dd-MMM-yyyy");
      const toDate = format(dateRange.to, "dd-MMM-yyyy");
      const filename = `Payments_${employee.name.replace(/\s+/g, "_")}_${format(dateRange.from, "ddMMMyyyy")}-${format(dateRange.to, "ddMMMyyyy")}.pdf`;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      let currentY = 20;

      // Add header
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Payment Records", margin, currentY);

      currentY += 8;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Employee: ${employee.name} | Period: ${fromDate} to ${toDate}`, margin, currentY);
      
      currentY += 5;
      pdf.text(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, currentY);

      currentY += 5;
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // Add summary section
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", margin, currentY);
      currentY += 6;

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      
      Object.entries(filteredTotals).forEach(([currency, data]) => {
        const totalDue = data.amount;
        const totalPaid = filteredPaymentTotals[currency] || 0;
        const balance = filteredRemainingBalance[currency] || 0;

        pdf.setFont("helvetica", "bold");
        pdf.text(`${currency}:`, margin, currentY);
        pdf.setFont("helvetica", "normal");
        
        currentY += 4;
        pdf.text(`Total Due: ${formatCurrency(totalDue, currency as any)}`, margin + 5, currentY);
        
        currentY += 4;
        pdf.text(`Total Paid: ${formatCurrency(totalPaid, currency as any)}`, margin + 5, currentY);
        
        currentY += 4;
        pdf.setFont("helvetica", "bold");
        pdf.text(`Balance: ${formatCurrency(balance, currency as any)}`, margin + 5, currentY);
        pdf.setFont("helvetica", "normal");
        
        currentY += 6;
      });

      currentY += 2;
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // Add payment records
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Payment History", margin, currentY);
      currentY += 6;

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");

      if (filteredPayments.length === 0) {
        pdf.text("No payment records found for this period.", margin, currentY);
      } else {
        filteredPayments.forEach((payment, index) => {
          // Check if we need a new page
          if (currentY > pageHeight - 40) {
            pdf.addPage();
            currentY = 20;
          }

          // Date and amount on first line
          pdf.setFont("helvetica", "bold");
          pdf.text(format(new Date(payment.paidDate), "dd MMM yyyy"), margin, currentY);
          pdf.setFont("helvetica", "normal");
          
          const amountText = formatCurrency(payment.amountPaid, payment.currency as any);
          pdf.text(amountText, pageWidth - margin - pdf.getTextWidth(amountText), currentY);
          
          currentY += 4;
          
          // Method
          pdf.text(`Method: ${payment.paymentMethod === "CASH" ? "Cash" : "Bank Account"}`, margin + 5, currentY);
          
          currentY += 4;
          
          // Notes if any
          if (payment.notes) {
            const notesText = `Notes: ${payment.notes}`;
            const maxWidth = pageWidth - (2 * margin) - 10;
            const lines = pdf.splitTextToSize(notesText, maxWidth);
            lines.forEach((line: string) => {
              if (currentY > pageHeight - 20) {
                pdf.addPage();
                currentY = 20;
              }
              pdf.text(line, margin + 5, currentY);
              currentY += 4;
            });
          }
          
          currentY += 3;
          
          // Separator line
          if (index < filteredPayments.length - 1) {
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 5;
          }
        });
      }

      pdf.save(filename);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingPayments(false);
    }
  };

  // Download attendance records as PDF
  const downloadAttendancePDF = async () => {
    if (!employee) return;

    try {
      setDownloadingAttendance(true);
      toast.info("Generating PDF...");

      const fromDate = format(dateRange.from, "dd-MMM-yyyy");
      const toDate = format(dateRange.to, "dd-MMM-yyyy");
      const filename = `Attendance_${employee.name.replace(/\s+/g, "_")}_${format(dateRange.from, "ddMMMyyyy")}-${format(dateRange.to, "ddMMMyyyy")}.pdf`;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      let currentY = 20;

      // Add header
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Attendance Records", margin, currentY);

      currentY += 8;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Employee: ${employee.name} | Period: ${fromDate} to ${toDate}`, margin, currentY);
      
      currentY += 5;
      pdf.text(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, margin, currentY);

      currentY += 5;
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // Add summary section
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", margin, currentY);
      currentY += 6;

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      
      Object.entries(filteredTotals).forEach(([currency, data]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${currency}:`, margin, currentY);
        pdf.setFont("helvetica", "normal");
        
        currentY += 4;
        pdf.text(`Total Hours: ${data.hours.toFixed(2)} hours`, margin + 5, currentY);
        
        currentY += 4;
        pdf.text(`Days Present: ${data.days} ${data.days === 1 ? 'day' : 'days'}`, margin + 5, currentY);
        
        currentY += 4;
        pdf.setFont("helvetica", "bold");
        pdf.text(`Total Amount: ${formatCurrency(data.amount, currency as any)}`, margin + 5, currentY);
        pdf.setFont("helvetica", "normal");
        
        currentY += 6;
      });

      currentY += 2;
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // Add attendance records grouped by store
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Attendance Details", margin, currentY);
      currentY += 6;

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");

      if (filteredAttendance.length === 0) {
        pdf.text("No attendance records found for this period.", margin, currentY);
      } else {
        Object.entries(attendanceByStore).forEach(([storeName, records]) => {
          // Check if we need a new page for store header
          if (currentY > pageHeight - 30) {
            pdf.addPage();
            currentY = 20;
          }

          // Store name header
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.text(storeName, margin, currentY);
          currentY += 5;

          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");

          records.forEach((record, index) => {
            // Check if we need a new page
            if (currentY > pageHeight - 30) {
              pdf.addPage();
              currentY = 20;
            }

            // Date
            pdf.setFont("helvetica", "bold");
            pdf.text(format(new Date(record.checkIn), "dd MMM yyyy"), margin + 3, currentY);
            pdf.setFont("helvetica", "normal");
            
            currentY += 4;
            
            // Time
            const checkInTime = format(new Date(record.checkIn), "HH:mm");
            const checkOutTime = format(new Date(record.checkOut), "HH:mm");
            pdf.text(`${checkInTime} - ${checkOutTime}`, margin + 6, currentY);
            
            currentY += 4;
            
            // Hours and Amount
            const hours = parseFloat(record.hoursWorked.toString()).toFixed(2);
            pdf.text(`Hours: ${hours} | Amount: ${formatCurrency(record.amountToPay, record.currency as any)}`, margin + 6, currentY);
            
            currentY += 4;
            
            // Notes if any
            if (record.notes) {
              const notesText = `Notes: ${record.notes}`;
              const maxWidth = pageWidth - (2 * margin) - 12;
              const lines = pdf.splitTextToSize(notesText, maxWidth);
              lines.forEach((line: string) => {
                if (currentY > pageHeight - 20) {
                  pdf.addPage();
                  currentY = 20;
                }
                pdf.text(line, margin + 6, currentY);
                currentY += 4;
              });
            }
            
            currentY += 2;
            
            // Separator line
            if (index < records.length - 1) {
              pdf.setDrawColor(220, 220, 220);
              pdf.line(margin + 3, currentY, pageWidth - margin - 3, currentY);
              currentY += 4;
            }
          });

          currentY += 6;
        });
      }

      pdf.save(filename);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingAttendance(false);
    }
  };

  // Determine default currency for payment dialog
  const defaultCurrency = employee?.hourlyRateEur || (employee as any)?.weeklyWageEur ? "EUR" : "GBP";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-lg font-medium mb-4">Employee not found</h2>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">{employee.name}</h1>
            <div className="text-sm text-muted-foreground space-y-1 mt-2">
              {employee.email && <div>{employee.email}</div>}
              {employee.phone && <div>{employee.phone}</div>}
              <div className="flex gap-3 mt-2">
                {((employee as any).wageType || "HOURLY") === "HOURLY" ? (
                  <>
                    {employee.hourlyRateEur && (
                      <span className="text-eur">
                        €{employee.hourlyRateEur.toString()}/hr
                      </span>
                    )}
                    {employee.hourlyRateGbp && (
                      <span className="text-gbp">
                        £{employee.hourlyRateGbp.toString()}/hr
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {(employee as any).weeklyWageEur && (
                      <span className="text-eur">
                        €{(employee as any).weeklyWageEur.toString()}/day
                      </span>
                    )}
                    {(employee as any).weeklyWageGbp && (
                      <span className="text-gbp">
                        £{(employee as any).weeklyWageGbp.toString()}/day
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Date Filter and Download Buttons */}
          <div className="px-4 pb-4 space-y-3">
            <DateFilter
              value={dateRange}
              onChange={setDateRange}
              preset={dateFilter}
              onPresetChange={setDateFilter}
            />
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={downloadPaymentsPDF}
                disabled={downloadingPayments || filteredPayments.length === 0}
                variant="outline"
                className="gap-2"
                size="sm"
              >
                <Download className="h-4 w-4" />
                {downloadingPayments ? "Generating..." : "Payments PDF"}
              </Button>
              <Button
                onClick={downloadAttendancePDF}
                disabled={downloadingAttendance || filteredAttendance.length === 0}
                variant="outline"
                className="gap-2"
                size="sm"
              >
                <Download className="h-4 w-4" />
                {downloadingAttendance ? "Generating..." : "Attendance PDF"}
              </Button>
            </div>
          </div>

          {/* Payment Summary */}
          {Object.keys(filteredTotals).length > 0 && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(filteredTotals).map(([currency, data]) => (
                  <div key={currency} className="flex-1 min-w-[200px]">
                    <div
                      className={`p-3 rounded-lg border-2 ${
                        currency === "EUR"
                          ? "border-eur/20 bg-eur/5"
                          : "border-gbp/20 bg-gbp/5"
                      }`}
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Total Earnings ({currency})
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          currency === "EUR" ? "text-eur" : "text-gbp"
                        }`}
                      >
                        {formatCurrency(data.amount, currency as any)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{data.hours.toFixed(2)} hours</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{data.days} {data.days === 1 ? 'day' : 'days'}</span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Paid:</span>
                          <span className="font-medium">
                            {formatCurrency(filteredPaymentTotals[currency] || 0, currency as any)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Remaining:</span>
                          <span
                            className={
                              filteredRemainingBalance[currency] > 0
                                ? "text-orange-600"
                                : filteredRemainingBalance[currency] < 0
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {formatCurrency(filteredRemainingBalance[currency] || 0, currency as any)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={handleAddPayment} 
                className="w-full"
                size="lg"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Payment History */}
          {filteredPayments.length > 0 && (
            <div ref={paymentRef}>
              <h2 className="text-lg font-semibold mb-3">Payment History</h2>
              <div className="space-y-3">
                {filteredPayments.map((payment) => (
                  <Card 
                    key={payment.id} 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleEditPayment(payment)}
                  >
                    <div className="flex items-start justify-between mb-2">
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        {payment.paymentMethod === "CASH" ? "💵 Cash" : "💳 Bank Account"}
                      </div>
                      <div className="text-xs">
                        {format(new Date(payment.createdAt), "HH:mm")}
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded">
                        {payment.notes}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Records */}
          {filteredAttendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No attendance records</h3>
              <p className="text-sm text-muted-foreground">
                This employee has no recorded work hours yet
              </p>
            </div>
          ) : (
            <div ref={attendanceRef}>
              {Object.entries(attendanceByStore).map(([storeName, records]) => (
              <div key={storeName}>
                <h2 className="text-lg font-semibold mb-3">{storeName}</h2>
                <div className="space-y-3">
                  {records.map((record) => (
                    <Card key={record.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(record.checkIn), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            record.currency === "EUR" ? "text-eur" : "text-gbp"
                          }`}
                        >
                          {formatCurrency(record.amountToPay, record.currency as any)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(record.checkIn), "HH:mm")} -{" "}
                          {format(new Date(record.checkOut), "HH:mm")}
                        </div>
                        <div>{record.hoursWorked.toString()} hours</div>
                      </div>
                      {record.notes && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {record.notes}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setSelectedPayment(null);
        }}
        onSuccess={handlePaymentSuccess}
        employeeId={employeeId}
        employeeName={employee.name}
        defaultCurrency={defaultCurrency as any}
        paymentToEdit={selectedPayment}
        onDelete={handleDeletePayment}
      />
    </AppLayout>
  );
}
