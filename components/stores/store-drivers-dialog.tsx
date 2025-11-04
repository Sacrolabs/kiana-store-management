"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
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
import { Driver } from "@/lib/types/driver";
import { toast } from "sonner";
import { format } from "date-fns";

interface StoreDriversDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  storeId: string;
  storeName: string;
}

type DriverWithAssignment = Driver & {
  assignedAt?: Date;
  storeDriverId?: string;
};

export function StoreDriversDialog({
  open,
  onClose,
  onSuccess,
  storeId,
  storeName,
}: StoreDriversDialogProps) {
  const [storeDrivers, setStoreDrivers] = useState<DriverWithAssignment[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
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
      const [storeDriversRes, allDriversRes] = await Promise.all([
        fetch(`/api/stores/${storeId}/drivers`),
        fetch("/api/drivers"),
      ]);

      if (!storeDriversRes.ok || !allDriversRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const storeDriversData = await storeDriversRes.json();
      const allDriversData = await allDriversRes.json();

      setStoreDrivers(storeDriversData);
      setAllDrivers(allDriversData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDriverId) {
      toast.error("Please select a driver");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedDriverId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign driver");
      }

      toast.success("Driver assigned successfully");
      setSelectedDriverId("");
      fetchData();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error assigning driver:", error);
      toast.error(error.message || "Failed to assign driver");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (driverId: string) => {
    if (!confirm("Are you sure you want to remove this driver from this store?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/stores/${storeId}/drivers?driverId=${driverId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove driver");
      }

      toast.success("Driver removed successfully");
      fetchData();
      onSuccess?.();
    } catch (error) {
      console.error("Error removing driver:", error);
      toast.error("Failed to remove driver");
    }
  };

  // Get unassigned drivers
  const assignedDriverIds = new Set(storeDrivers.map((d) => d.id));
  const unassignedDrivers = allDrivers.filter(
    (d) => !assignedDriverIds.has(d.id)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Drivers</DialogTitle>
          <DialogDescription>
            Assign and manage drivers for {storeName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Add Driver Section */}
          {unassignedDrivers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Assign Driver</h3>
              <div className="flex gap-2">
                <Select
                  value={selectedDriverId}
                  onValueChange={setSelectedDriverId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedDriverId || saving}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>
            </div>
          )}

          {/* Assigned Drivers List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Assigned Drivers ({storeDrivers.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : storeDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Truck className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No drivers assigned to this store
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {storeDrivers.map((driver) => (
                  <Card key={driver.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{driver.name}</div>
                        {driver.email && (
                          <div className="text-xs text-muted-foreground">
                            {driver.email}
                          </div>
                        )}
                        {driver.phone && (
                          <div className="text-xs text-muted-foreground">
                            {driver.phone}
                          </div>
                        )}
                        {driver.assignedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Assigned {format(new Date(driver.assignedAt), "MMM dd, yyyy")}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(driver.id)}
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
