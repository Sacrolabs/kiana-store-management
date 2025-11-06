"use client";

import { useState, useEffect } from "react";
import { X, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Employee } from "@/lib/types/employee";
import { Store } from "@/lib/types/store";
import { Currency } from "@/lib/generated/prisma";
import { toast } from "sonner";
import { format } from "date-fns";

interface AttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stores: Store[];
  storeId?: string; // Optional: pre-select a store
  attendanceToEdit?: any; // Optional: existing attendance to edit
  onDelete?: (id: string) => void; // Optional: delete callback
}

export function AttendanceDialog({
  open,
  onClose,
  onSuccess,
  stores,
  storeId,
  attendanceToEdit,
  onDelete,
}: AttendanceDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [storeEmployees, setStoreEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [checkInDate, setCheckInDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [checkOutDate, setCheckOutDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [checkOutTime, setCheckOutTime] = useState("17:00");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("EUR");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchEmployees();
      if (storeId) {
        setSelectedStoreId(storeId);
      }
    }
  }, [open, storeId]);

  useEffect(() => {
    if (selectedStoreId) {
      fetchStoreEmployees(selectedStoreId);
    }
  }, [selectedStoreId]);

  // Load existing attendance data when editing
  useEffect(() => {
    if (attendanceToEdit && open) {
      setEditMode(true);
      setAttendanceId(attendanceToEdit.id);
      setSelectedStoreId(attendanceToEdit.storeId);
      setSelectedEmployeeId(attendanceToEdit.employeeId);
      setCheckInDate(format(new Date(attendanceToEdit.checkIn), "yyyy-MM-dd"));
      setCheckInTime(format(new Date(attendanceToEdit.checkIn), "HH:mm"));
      setCheckOutDate(format(new Date(attendanceToEdit.checkOut), "yyyy-MM-dd"));
      setCheckOutTime(format(new Date(attendanceToEdit.checkOut), "HH:mm"));
      setSelectedCurrency(attendanceToEdit.currency as Currency);
      setNotes(attendanceToEdit.notes || "");
    } else if (open && !attendanceToEdit) {
      setEditMode(false);
      setAttendanceId(null);
    }
  }, [attendanceToEdit, open]);

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

  const fetchStoreEmployees = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/employees`);
      if (!response.ok) throw new Error("Failed to fetch store employees");
      const data = await response.json();
      setStoreEmployees(data);
    } catch (error) {
      console.error("Error fetching store employees:", error);
      toast.error("Failed to load store employees");
      setStoreEmployees([]);
    }
  };

  const calculateHours = (): number => {
    const checkIn = new Date(`${checkInDate}T${checkInTime}`);
    const checkOut = new Date(`${checkOutDate}T${checkOutTime}`);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    // Round to 2 decimal places to avoid floating-point precision issues
    return Math.max(0, Math.round(diffHours * 100) / 100);
  };

  const calculateAmount = (): number => {
    const hours = calculateHours();
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) return 0;

    const employeeAny = employee as any;
    const wageType = employeeAny.wageType || "HOURLY";

    if (wageType === "FIXED") {
      // Fixed daily wage - count full days worked
      const dailyWage =
        selectedCurrency === "EUR"
          ? Number(employeeAny.weeklyWageEur || 0)
          : Number(employeeAny.weeklyWageGbp || 0);
      
      // Count number of days: minimum 1 day if any hours worked
      // For standard work: 1-8 hours = 1 day, 9-16 hours = 2 days, etc.
      const days = Math.max(1, Math.ceil(hours / 24));
      return Math.round(dailyWage * days * 100); // Convert to cents/pence
    } else {
      // Hourly rate
      const rate =
        selectedCurrency === "EUR"
          ? Number(employee.hourlyRateEur || 0)
          : Number(employee.hourlyRateGbp || 0);

      return Math.round(hours * rate * 100); // Convert to cents/pence
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId) {
      toast.error("Please select a store");
      return;
    }

    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    const hours = calculateHours();
    if (hours <= 0) {
      toast.error("Check-out time must be after check-in time");
      return;
    }

    setSaving(true);
    try {
      const checkInDateTime = new Date(`${checkInDate}T${checkInTime}`);
      const checkOutDateTime = new Date(`${checkOutDate}T${checkOutTime}`);

      const url = editMode && attendanceId ? `/api/attendance/${attendanceId}` : "/api/attendance";
      const method = editMode && attendanceId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          storeId: selectedStoreId,
          checkIn: checkInDateTime.toISOString(),
          checkOut: checkOutDateTime.toISOString(),
          hoursWorked: hours,
          currency: selectedCurrency,
          amountToPay: calculateAmount(),
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${editMode ? "update" : "record"} attendance`);
      }

      toast.success(`Attendance ${editMode ? "updated" : "recorded"} successfully`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error(`Error ${editMode ? "updating" : "recording"} attendance:`, error);
      toast.error(error.message || `Failed to ${editMode ? "update" : "record"} attendance`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedStoreId(storeId || "");
    setSelectedEmployeeId("");
    setCheckInDate(format(new Date(), "yyyy-MM-dd"));
    setCheckInTime("09:00");
    setCheckOutDate(format(new Date(), "yyyy-MM-dd"));
    setCheckOutTime("17:00");
    setSelectedCurrency("EUR");
    setNotes("");
    setEditMode(false);
    setAttendanceId(null);
    onClose();
  };

  const handleDelete = () => {
    if (attendanceToEdit && attendanceId && onDelete) {
      onDelete(attendanceId);
      handleClose();
    }
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);
  const hours = calculateHours();
  const amount = calculateAmount();
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Only show employees assigned to the selected store
  const availableEmployees = storeEmployees;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Attendance" : "Record Attendance"}</DialogTitle>
          <DialogDescription>
            {editMode ? "Update employee work hours and payment" : "Record employee work hours and calculate payment"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Store Selection */}
          <div className="space-y-2">
            <Label htmlFor="store">Store *</Label>
            <Select
              value={selectedStoreId}
              onValueChange={setSelectedStoreId}
              disabled={!!storeId} // Disable if pre-selected
            >
              <SelectTrigger id="store">
                <SelectValue placeholder="Select a store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={!selectedStoreId}
            >
              <SelectTrigger id="employee">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {storeEmployees.length === 0 && selectedStoreId && (
              <p className="text-xs text-yellow-600">
                No employees assigned to this store. Please assign employees to this store first.
              </p>
            )}
          </div>

          {/* Check In Date & Time */}
          <div className="space-y-2">
            <Label>Check In *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={checkInDate}
                onChange={(e) => {
                  setCheckInDate(e.target.value);
                  // Auto-update checkout date to match (can be changed manually)
                  if (checkOutDate < e.target.value) {
                    setCheckOutDate(e.target.value);
                  }
                }}
                max={format(new Date(), "yyyy-MM-dd")}
                required
              />
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Check Out Date & Time */}
          <div className="space-y-2">
            <Label>Check Out *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                min={checkInDate}
                max={format(new Date(), "yyyy-MM-dd")}
                required
              />
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Currency Selection */}
          {selectedStore && selectedStore.supportedCurrencies.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(value) => setSelectedCurrency(value as Currency)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedStore.supportedCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Calculation Summary */}
          {selectedEmployeeId && hours > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hours Worked:</span>
                <span className="font-medium">{hours.toFixed(2)}</span>
              </div>
              {selectedEmployee && (
                <>
                  {((selectedEmployee as any).wageType || "HOURLY") === "HOURLY" ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hourly Rate:</span>
                        <span className="font-medium">
                          {selectedCurrency === "EUR"
                            ? `€${selectedEmployee.hourlyRateEur || 0}`
                            : `£${selectedEmployee.hourlyRateGbp || 0}`}
                          /hr
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-1 border-t">
                        <span className="font-medium">Total Amount:</span>
                        <span className="font-bold">
                          {selectedCurrency === "EUR" ? "€" : "£"}
                          {(amount / 100).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Days Worked:</span>
                        <span className="font-medium">{Math.max(1, Math.ceil(hours / 24))}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-1 border-t">
                        <span className="font-medium">Daily Wage:</span>
                        <span className="font-bold">
                          {selectedCurrency === "EUR"
                            ? `€${(selectedEmployee as any).weeklyWageEur || 0}`
                            : `£${(selectedEmployee as any).weeklyWageGbp || 0}`}
                          /day
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this attendance record..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4">
            {editMode && attendanceToEdit && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className={`flex gap-2 ${!(editMode && attendanceToEdit && onDelete) ? 'ml-auto' : ''}`}>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Clock className="h-4 w-4 mr-2" />
                {saving 
                  ? editMode ? "Updating..." : "Recording..." 
                  : editMode ? "Update Attendance" : "Record Attendance"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
