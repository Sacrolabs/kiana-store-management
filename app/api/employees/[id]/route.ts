import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// GET /api/employees/[id] - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PATCH /api/employees/[id] - Update employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, email, phone, wageType, hourlyRateEur, hourlyRateGbp, weeklyWageEur, weeklyWageGbp } = body;

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(wageType && { wageType }),
        ...(hourlyRateEur !== undefined && {
          hourlyRateEur: hourlyRateEur ? new Decimal(hourlyRateEur) : null,
        }),
        ...(hourlyRateGbp !== undefined && {
          hourlyRateGbp: hourlyRateGbp ? new Decimal(hourlyRateGbp) : null,
        }),
        ...(weeklyWageEur !== undefined && {
          weeklyWageEur: weeklyWageEur ? new Decimal(weeklyWageEur) : null,
        }),
        ...(weeklyWageGbp !== undefined && {
          weeklyWageGbp: weeklyWageGbp ? new Decimal(weeklyWageGbp) : null,
        }),
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Delete employee (cascades to attendance records)
    await prisma.employee.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
