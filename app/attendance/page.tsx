"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/app-layout";
import { Employee } from "@/lib/types/employee";
import { AttendanceWithRelations } from "@/lib/types/attendance";
import { Store } from "@/lib/types/store";
import { formatCurrency } from "@/lib/currency/utils";
import { DateFilter, DateRange, DateFilterPreset } from "@/components/common/date-filter";
import { AttendanceDialog } from "@/components/attendance/attendance-dialog";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, startOfWeek } from "date-fns";
export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceWithRelations[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);

  // Date filtering state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("week");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchAttendance(), fetchStores()]).finally(() => setLoading(false));
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

  const fetchAttendance = async () => {
    try {
      const response = await fetch("/api/attendance");
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();
      setAttendance(data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance");
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

  // Filter attendance by date range
  const filteredAttendance = attendance.filter((record) => {
    const checkInDate = new Date(record.checkIn);
    return checkInDate >= dateRange.from && checkInDate <= dateRange.to;
  });

  // Calculate totals by currency (from filtered attendance)
  const totals = filteredAttendance.reduce((acc, record) => {
    if (!acc[record.currency]) {
      acc[record.currency] = { amount: 0, hours: 0 };
    }
    acc[record.currency].amount += record.amountToPay;
    acc[record.currency].hours += parseFloat(record.hoursWorked.toString());
    return acc;
  }, {} as Record<string, { amount: number; hours: number }>);

  const handleViewEmployee = (employeeId: string) => {
    window.location.href = `/employees/${employeeId}`;
  };

  const handleManageEmployees = () => {
    window.location.href = "/employees";
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top">
          <div className="p-4">
            <h1 className="text-2xl font-bold">Staff & Attendance</h1>
            <p className="text-sm text-muted-foreground">
              Manage employees and track attendance
            </p>
          </div>

          {/* Date Filter */}
          <div className="px-4 pb-2">
            <DateFilter
              value={dateRange}
              onChange={setDateRange}
              preset={datePreset}
              onPresetChange={setDatePreset}
              limitedPresets={true}
            />
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
                  <div className={`text-lg font-bold ${
                    currency === "EUR" ? "text-eur" : "text-gbp"
                  }`}>
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

        {/* Content with Tabs */}
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="attendance" className="h-full">
            <div className="sticky top-0 z-10 bg-background border-b px-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="attendance">
                  <Clock className="h-4 w-4 mr-2" />
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="employees">
                  <Users className="h-4 w-4 mr-2" />
                  Employees ({employees.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="attendance" className="p-4 space-y-4 mt-0">
              {/* Record Attendance Button */}
              {employees.length > 0 && stores.length > 0 && (
                <Button
                  onClick={() => setAttendanceDialogOpen(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Attendance
                </Button>
              )}

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No employees yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add employees first before recording attendance
                  </p>
                  <Button onClick={() => document.querySelector('[value="employees"]')?.dispatchEvent(new Event('click', { bubbles: true }))}>
                    Go to Employees
                  </Button>
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {attendance.length === 0 ? "No attendance records" : "No attendance for selected period"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {attendance.length === 0
                      ? "Attendance tracking coming in full version"
                      : "Try selecting a different date range"}
                  </p>
                </div>
              ) : (
                filteredAttendance.map((record) => (
                  <Card key={record.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{record.employee.name}</div>
                        <div className="text-sm text-muted-foreground">{record.store.name}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          record.currency === "EUR" ? "text-eur" : "text-gbp"
                        }`}>
                          {formatCurrency(record.amountToPay, record.currency as any)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.hoursWorked.toString()} hours
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(record.checkIn), "MMM dd, HH:mm")} - {format(new Date(record.checkOut), "HH:mm")}
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="employees" className="p-4 space-y-4 mt-0">
              <Button onClick={handleManageEmployees} className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Manage All Employees
              </Button>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading employees...</div>
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No employees yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your first employee to get started
                  </p>
                </div>
              ) : (
                employees.map((employee) => (
                  <Card
                    key={employee.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleViewEmployee(employee.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-lg">{employee.name}</div>
                        {employee.email && (
                          <div className="text-sm text-muted-foreground">{employee.email}</div>
                        )}
                        {employee.phone && (
                          <div className="text-sm text-muted-foreground">{employee.phone}</div>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {employee.hourlyRateEur && (
                          <div className="text-eur">€{employee.hourlyRateEur.toString()}/hr</div>
                        )}
                        {employee.hourlyRateGbp && (
                          <div className="text-gbp">£{employee.hourlyRateGbp.toString()}/hr</div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Attendance Dialog */}
      <AttendanceDialog
        open={attendanceDialogOpen}
        onClose={() => setAttendanceDialogOpen(false)}
        onSuccess={() => {
          fetchAttendance();
          setAttendanceDialogOpen(false);
        }}
        stores={stores}
      />
    </AppLayout>
  );
}

