"use client";

import { useState, useEffect } from "react";
import { Plus, Store as StoreIcon, MapPin, Phone, User, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { StoreDialog } from "./store-dialog";
import { Store } from "@/lib/types/store";
import { getCurrencySymbol } from "@/lib/currency/utils";
import { toast } from "sonner";

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stores");
      if (!response.ok) throw new Error("Failed to fetch stores");
      const data = await response.json();
      setStores(data);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  const handleViewStore = (storeId: string) => {
    window.location.href = `/stores/${storeId}`;
  };

  const handleEdit = (store: Store, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setSelectedStore(store);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedStore(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedStore(null);
  };

  const handleSuccess = () => {
    fetchStores();
    handleDialogClose();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this store? All related data will be deleted.")) {
      return;
    }

    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete store");

      toast.success("Store deleted successfully");
      fetchStores();
    } catch (error) {
      console.error("Error deleting store:", error);
      toast.error("Failed to delete store");
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-top">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-2xl font-bold">Stores</h1>
              <p className="text-sm text-muted-foreground">
                Manage your store locations
              </p>
            </div>
            <Button onClick={handleAdd} size="icon" className="h-11 w-11">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading stores...</div>
            </div>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <StoreIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No stores yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first store
              </p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Store
              </Button>
            </div>
          ) : (
            stores.map((store) => (
              <Card
                key={store.id}
                className="tap-highlight-none active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => handleViewStore(store.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{store.name}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                        {store.supportedCurrencies.map((currency) => (
                          <span
                            key={currency}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              currency === "EUR"
                                ? "bg-eur/10 text-eur"
                                : "bg-gbp/10 text-gbp"
                            }`}
                          >
                            {getCurrencySymbol(currency as any)} {currency}
                            {currency === store.defaultCurrency && " (default)"}
                          </span>
                        ))}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEdit(store, e)}
                      className="ml-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {store.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="flex-1">{store.address}</span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{store.phone}</span>
                    </div>
                  )}
                  {store.managerName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span>{store.managerName}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <StoreDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleSuccess}
        store={selectedStore}
        onDelete={handleDelete}
      />
    </AppLayout>
  );
}
