import { Driver as PrismaDriver } from "@/lib/generated/prisma";

export type Driver = PrismaDriver;

export type CreateDriverInput = {
  name: string;
  email?: string;
  phone?: string;
};

export type UpdateDriverInput = Partial<CreateDriverInput>;

export type DriverWithDeliveryCount = Driver & {
  _count: {
    deliveries: number;
  };
};
