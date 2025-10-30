import { Attendance as PrismaAttendance } from "@/lib/generated/prisma";

export type Attendance = PrismaAttendance;

export type CreateAttendanceInput = {
  employeeId: string;
  storeId: string;
  checkIn: Date | string;
  checkOut: Date | string;
  currency: string;
  notes?: string;
};

export type UpdateAttendanceInput = Partial<CreateAttendanceInput>;

export type AttendanceWithRelations = Attendance & {
  employee: {
    id: string;
    name: string;
  };
  store: {
    id: string;
    name: string;
  };
};
