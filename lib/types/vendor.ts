import { Vendor as PrismaVendor } from "@/lib/generated/prisma";

export type Vendor = PrismaVendor;

export type VendorWithExpenseCount = Vendor & {
  _count: {
    expenses: number;
  };
};
