"use client";

import { useState, useEffect } from "react";
import { Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { Driver } from "@/lib/types/driver";
import { toast } from "sonner";
import { DriverDialog } from "@/components/drivers/driver-dialog";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/drivers");
      if (!response.ok) throw new Error("Failed to fetch drivers");
      const data = await response.json();
      setDrivers(data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = () => {
    setSelectedDriver(null);
    setDriverDialogOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setDriverDialogOpen(true);
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm("Are you sure you want to delete this driver? This will also delete all their delivery records.")) {
      return;
    }

    try {
      const response = await fetch(`/api/drivers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete driver");
      }

      toast.success("Driver deleted successfully");
      fetchDrivers();
      setDriverDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting driver:", error);
      toast.error(error.message || "Failed to delete driver");
    }
  };

  const handleDriverSuccess = () => {
    fetchDrivers();
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top p-4">
          <h1 className="text-2xl font-bold">Drivers</h1>
          <p className="text-sm text-muted-foreground">
            Manage all drivers across your stores
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <Button onClick={handleAddDriver} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading drivers...</div>
            </div>
          ) : drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No drivers yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first driver to get started
              </p>
            </div>
          ) : (
            drivers.map((driver) => (
              <Card
                key={driver.id}
                className="p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{driver.name}</div>
                    {driver.email && (
                      <div className="text-sm text-muted-foreground">
                        {driver.email}
                      </div>
                    )}
                    {driver.phone && (
                      <div className="text-sm text-muted-foreground">
                        {driver.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditDriver(driver)}
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

      <DriverDialog
        open={driverDialogOpen}
        onClose={() => setDriverDialogOpen(false)}
        onSuccess={handleDriverSuccess}
        driver={selectedDriver}
        onDelete={handleDeleteDriver}
      />
    </AppLayout>
  );
}
