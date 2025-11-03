import { Delivery as PrismaDelivery } from "@/lib/generated/prisma";

export type Delivery = PrismaDelivery;

export type CreateDeliveryInput = {
  driverId: string;
  storeId: string;
  deliveryDate: Date | string;
  numberOfDeliveries: number;
  currency: string;
  expenseAmount: number; // in cents/pence
  notes?: string;
};

export type UpdateDeliveryInput = Partial<CreateDeliveryInput>;

export type DeliveryWithRelations = Delivery & {
  driver: {
    id: string;
    name: string;
  };
  store: {
    id: string;
    name: string;
  };
};
