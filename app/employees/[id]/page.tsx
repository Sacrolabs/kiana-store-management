"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { Employee } from "@/lib/types/employee";
import { AttendanceWithRelations } from "@/lib/types/attendance";
import { formatCurrency } from "@/lib/currency/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchEmployee(), fetchAttendance()]).finally(() =>
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

  // Calculate totals
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

  // Group attendance by store
  const attendanceByStore = attendance.reduce((acc, record) => {
    const storeName = record.store.name;
    if (!acc[storeName]) {
      acc[storeName] = [];
    }
    acc[storeName].push(record);
    return acc;
  }, {} as Record<string, AttendanceWithRelations[]>);

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
              {(employee.hourlyRateEur || employee.hourlyRateGbp) && (
                <div className="flex gap-3 mt-2">
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
                </div>
              )}
            </div>
          </div>

          {/* Totals Summary */}
          {Object.keys(totals).length > 0 && (
            <div className="px-4 pb-4 flex gap-2 flex-wrap">
              {Object.entries(totals).map(([currency, data]) => (
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
                    {formatCurrency(data.amount, currency as any)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.hours.toFixed(2)} hours
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {attendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No attendance records</h3>
              <p className="text-sm text-muted-foreground">
                This employee has no recorded work hours yet
              </p>
            </div>
          ) : (
            Object.entries(attendanceByStore).map(([storeName, records]) => (
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
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
