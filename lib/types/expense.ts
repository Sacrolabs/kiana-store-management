import { Expense as PrismaExpense } from "@/lib/generated/prisma";

export type Expense = PrismaExpense;

export type ExpenseWithRelations = Expense & {
  store: {
    id: string;
    name: string;
  };
  vendor: {
    id: string;
    name: string;
  };
};
