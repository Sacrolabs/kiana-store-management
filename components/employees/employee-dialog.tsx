"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Employee } from "@/lib/types/employee";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface EmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee?: Employee | null;
  onDelete?: (id: string) => void;
}

export function EmployeeDialog({
  open,
  onClose,
  onSuccess,
  employee,
  onDelete,
}: EmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wageType, setWageType] = useState<"HOURLY" | "FIXED">("HOURLY");
  const [hourlyRateEur, setHourlyRateEur] = useState("");
  const [hourlyRateGbp, setHourlyRateGbp] = useState("");
  const [dailyWageEur, setDailyWageEur] = useState("");
  const [dailyWageGbp, setDailyWageGbp] = useState("");

  useEffect(() => {
    if (open) {
      if (employee) {
        // Edit mode
        setName(employee.name);
        setEmail(employee.email || "");
        setPhone(employee.phone || "");
        setWageType((employee as any).wageType || "HOURLY");
        setHourlyRateEur(employee.hourlyRateEur?.toString() || "");
        setHourlyRateGbp(employee.hourlyRateGbp?.toString() || "");
        setDailyWageEur((employee as any).weeklyWageEur?.toString() || "");
        setDailyWageGbp((employee as any).weeklyWageGbp?.toString() || "");
      } else {
        // Create mode
        setName("");
        setEmail("");
        setPhone("");
        setWageType("HOURLY");
        setHourlyRateEur("");
        setHourlyRateGbp("");
        setDailyWageEur("");
        setDailyWageGbp("");
      }
    }
  }, [open, employee]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Employee name is required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        wageType,
        hourlyRateEur: wageType === "HOURLY" && hourlyRateEur ? parseFloat(hourlyRateEur) : undefined,
        hourlyRateGbp: wageType === "HOURLY" && hourlyRateGbp ? parseFloat(hourlyRateGbp) : undefined,
        weeklyWageEur: wageType === "FIXED" && dailyWageEur ? parseFloat(dailyWageEur) : undefined,
        weeklyWageGbp: wageType === "FIXED" && dailyWageGbp ? parseFloat(dailyWageGbp) : undefined,
      };

      const url = employee ? `/api/employees/${employee.id}` : "/api/employees";
      const method = employee ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save employee");
      }

      toast.success(
        employee ? "Employee updated successfully" : "Employee created successfully"
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving employee:", error);
      toast.error(error.message || "Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (employee && onDelete) {
      onDelete(employee.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
          <DialogDescription>
            {employee
              ? "Update employee details"
              : "Add a new employee to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Employee name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="employee@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 123 456 7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Wage Type Selection */}
          <div className="space-y-3">
            <Label>Wage Type</Label>
            <RadioGroup
              value={wageType}
              onValueChange={(value) => setWageType(value as "HOURLY" | "FIXED")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="HOURLY" id="hourly" />
                <Label htmlFor="hourly" className="font-normal cursor-pointer">
                  Hourly Rate
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FIXED" id="fixed" />
                <Label htmlFor="fixed" className="font-normal cursor-pointer">
                  Fixed Daily Wage
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Hourly Rate Fields */}
          {wageType === "HOURLY" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hourlyRateEur">EUR Hourly Rate (€)</Label>
                <Input
                  id="hourlyRateEur"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={hourlyRateEur}
                  onChange={(e) => setHourlyRateEur(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyRateGbp">GBP Hourly Rate (£)</Label>
                <Input
                  id="hourlyRateGbp"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={hourlyRateGbp}
                  onChange={(e) => setHourlyRateGbp(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Daily Wage Fields */}
          {wageType === "FIXED" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dailyWageEur">EUR Daily Wage (€)</Label>
                <Input
                  id="dailyWageEur"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={dailyWageEur}
                  onChange={(e) => setDailyWageEur(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyWageGbp">GBP Daily Wage (£)</Label>
                <Input
                  id="dailyWageGbp"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={dailyWageGbp}
                  onChange={(e) => setDailyWageGbp(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {employee && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : employee ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
