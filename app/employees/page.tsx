"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { Employee } from "@/lib/types/employee";
import { toast } from "sonner";
import { EmployeeDialog } from "@/components/employees/employee-dialog";

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setEmployeeDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeDialogOpen(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    router.push(`/employees/${employee.id}`);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee? This will also delete all their attendance records.")) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete employee");
      }

      toast.success("Employee deleted successfully");
      fetchEmployees();
      setEmployeeDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(error.message || "Failed to delete employee");
    }
  };

  const handleEmployeeSuccess = () => {
    fetchEmployees();
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top p-4">
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Manage all employees across your stores
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <Button onClick={handleAddEmployee} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
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
                className="p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{employee.name}</div>
                    {employee.email && (
                      <div className="text-sm text-muted-foreground">
                        {employee.email}
                      </div>
                    )}
                    {employee.phone && (
                      <div className="text-sm text-muted-foreground">
                        {employee.phone}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    {((employee as any).wageType || "HOURLY") === "HOURLY" ? (
                      <>
                        {employee.hourlyRateEur && (
                          <div className="text-eur">
                            €{employee.hourlyRateEur.toString()}/hr
                          </div>
                        )}
                        {employee.hourlyRateGbp && (
                          <div className="text-gbp">
                            £{employee.hourlyRateGbp.toString()}/hr
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {(employee as any).weeklyWageEur && (
                          <div className="text-eur">
                            €{(employee as any).weeklyWageEur.toString()}/day
                          </div>
                        )}
                        {(employee as any).weeklyWageGbp && (
                          <div className="text-gbp">
                            £{(employee as any).weeklyWageGbp.toString()}/day
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewEmployee(employee)}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditEmployee(employee)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <EmployeeDialog
        open={employeeDialogOpen}
        onClose={() => setEmployeeDialogOpen(false)}
        onSuccess={handleEmployeeSuccess}
        employee={selectedEmployee}
        onDelete={handleDeleteEmployee}
      />
    </AppLayout>
  );
}
