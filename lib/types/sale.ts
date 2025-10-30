import { Sale as PrismaSale } from "@/lib/generated/prisma";

export type Sale = PrismaSale;

export type SaleAmounts = {
  cash: number;
  online: number;
  delivery: number;
  justEat: number;
  mylocal: number;
  creditCard: number;
};

export type CreateSaleInput = {
  storeId: string;
  currency: string;
  date: Date | string;
  amounts: SaleAmounts;
  notes?: string;
};

export type UpdateSaleInput = Partial<CreateSaleInput>;

export type SaleWithStore = Sale & {
  store: {
    id: string;
    name: string;
  };
};
