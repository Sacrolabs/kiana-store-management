import { Employee as PrismaEmployee, WageType } from "@/lib/generated/prisma";

export type Employee = PrismaEmployee;
export { WageType };

export type CreateEmployeeInput = {
  name: string;
  email?: string;
  phone?: string;
  wageType: WageType;
  hourlyRateEur?: number;
  hourlyRateGbp?: number;
  weeklyWageEur?: number;
  weeklyWageGbp?: number;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;
