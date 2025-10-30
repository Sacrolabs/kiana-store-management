"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";
import { format } from "date-fns";

interface StoreEmployeesDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  storeId: string;
  storeName: string;
}

type EmployeeWithAssignment = Employee & {
  assignedAt?: Date;
  storeEmployeeId?: string;
};

export function StoreEmployeesDialog({
  open,
  onClose,
  onSuccess,
  storeId,
  storeName,
}: StoreEmployeesDialogProps) {
  const [storeEmployees, setStoreEmployees] = useState<EmployeeWithAssignment[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, storeId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storeEmployeesRes, allEmployeesRes] = await Promise.all([
        fetch(`/api/stores/${storeId}/employees`),
        fetch("/api/employees"),
      ]);

      if (!storeEmployeesRes.ok || !allEmployeesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const storeEmployeesData = await storeEmployeesRes.json();
      const allEmployeesData = await allEmployeesRes.json();

      setStoreEmployees(storeEmployeesData);
      setAllEmployees(allEmployeesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmployeeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign employee");
      }

      toast.success("Employee assigned successfully");
      setSelectedEmployeeId("");
      fetchData();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error assigning employee:", error);
      toast.error(error.message || "Failed to assign employee");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (employeeId: string) => {
    if (!confirm("Are you sure you want to remove this employee from this store?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/stores/${storeId}/employees?employeeId=${employeeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove employee");
      }

      toast.success("Employee removed successfully");
      fetchData();
      onSuccess?.();
    } catch (error) {
      console.error("Error removing employee:", error);
      toast.error("Failed to remove employee");
    }
  };

  // Get unassigned employees
  const assignedEmployeeIds = new Set(storeEmployees.map((e) => e.id));
  const unassignedEmployees = allEmployees.filter(
    (e) => !assignedEmployeeIds.has(e.id)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Employees</DialogTitle>
          <DialogDescription>
            Assign and manage employees for {storeName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Add Employee Section */}
          {unassignedEmployees.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Assign Employee</h3>
              <div className="flex gap-2">
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedEmployeeId || saving}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>
            </div>
          )}

          {/* Assigned Employees List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Assigned Employees ({storeEmployees.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : storeEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No employees assigned to this store
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {storeEmployees.map((employee) => (
                  <Card key={employee.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{employee.name}</div>
                        {employee.email && (
                          <div className="text-xs text-muted-foreground">
                            {employee.email}
                          </div>
                        )}
                        {employee.assignedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Assigned {format(new Date(employee.assignedAt), "MMM dd, yyyy")}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          {employee.hourlyRateEur && (
                            <span className="text-xs text-eur">
                              €{employee.hourlyRateEur.toString()}/hr
                            </span>
                          )}
                          {employee.hourlyRateGbp && (
                            <span className="text-xs text-gbp">
                              £{employee.hourlyRateGbp.toString()}/hr
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(employee.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
