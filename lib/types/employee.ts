import { Employee as PrismaEmployee } from "@/lib/generated/prisma";

export type Employee = PrismaEmployee;

export type CreateEmployeeInput = {
  name: string;
  email?: string;
  phone?: string;
  hourlyRateEur?: number;
  hourlyRateGbp?: number;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;
