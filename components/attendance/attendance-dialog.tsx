"use client";

import { useState, useEffect } from "react";
import { X, Clock } from "lucide-react";
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
import { Currency } from "@/lib/types/currency";
import { toast } from "sonner";
import { format } from "date-fns";

interface AttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stores: Store[];
  storeId?: string; // Optional: pre-select a store
}

export function AttendanceDialog({
  open,
  onClose,
  onSuccess,
  stores,
  storeId,
}: AttendanceDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [storeEmployees, setStoreEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [checkInDate, setCheckInDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [checkInTime, setCheckInTime] = useState("09:00");
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
    const checkOut = new Date(`${checkInDate}T${checkOutTime}`);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  };

  const calculateAmount = (): number => {
    const hours = calculateHours();
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) return 0;

    const rate =
      selectedCurrency === "EUR"
        ? Number(employee.hourlyRateEur || 0)
        : Number(employee.hourlyRateGbp || 0);

    return Math.round(hours * rate * 100); // Convert to cents/pence
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
      const checkOutDateTime = new Date(`${checkInDate}T${checkOutTime}`);

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          storeId: selectedStoreId,
          checkIn: checkInDateTime.toISOString(),
          checkOut: checkOutDateTime.toISOString(),
          hoursWorked: hours,
          currency: selectedCurrency,
          amountToPay: calculateAmount(),
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record attendance");
      }

      toast.success("Attendance recorded successfully");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error recording attendance:", error);
      toast.error(error.message || "Failed to record attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedStoreId(storeId || "");
    setSelectedEmployeeId("");
    setCheckInDate(format(new Date(), "yyyy-MM-dd"));
    setCheckInTime("09:00");
    setCheckOutTime("17:00");
    setSelectedCurrency("EUR");
    setNotes("");
    onClose();
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
          <DialogTitle>Record Attendance</DialogTitle>
          <DialogDescription>
            Record employee work hours and calculate payment
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

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check In *</Label>
              <Input
                id="checkIn"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check Out *</Label>
              <Input
                id="checkOut"
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hourly Rate:</span>
                  <span className="font-medium">
                    {selectedCurrency === "EUR"
                      ? `€${selectedEmployee.hourlyRateEur || 0}`
                      : `£${selectedEmployee.hourlyRateGbp || 0}`}
                    /hr
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-1 border-t">
                <span className="font-medium">Total Amount:</span>
                <span className="font-bold">
                  {selectedCurrency === "EUR" ? "€" : "£"}
                  {(amount / 100).toFixed(2)}
                </span>
              </div>
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
          <div className="flex justify-end gap-2 pt-4">
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
              {saving ? "Recording..." : "Record Attendance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
