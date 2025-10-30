import { Store as PrismaStore } from "@/lib/generated/prisma";

export type Store = PrismaStore;

export type CreateStoreInput = {
  name: string;
  address?: string;
  phone?: string;
  managerName?: string;
  supportedCurrencies: string[];
  defaultCurrency: string;
};

export type UpdateStoreInput = Partial<CreateStoreInput>;
