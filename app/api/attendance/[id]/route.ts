import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";
import { Decimal } from "@prisma/client/runtime/library";

function calculateHours(checkIn: Date, checkOut: Date): number {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
}

// GET /api/attendance/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendance = await prisma.attendance.findUnique({
      where: { id: params.id },
      include: {
        employee: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

// PATCH /api/attendance/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { employeeId, storeId, checkIn, checkOut, hoursWorked, currency, amountToPay, notes } = body;

    // Check if attendance exists
    const existing = await prisma.attendance.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    // Validation for updated fields
    if (currency && currency !== "EUR" && currency !== "GBP") {
      return NextResponse.json(
        { error: "Valid currency (EUR or GBP) is required" },
        { status: 400 }
      );
    }

    // Calculate hours if check in/out times are provided
    let calculatedHours = hoursWorked;
    if (checkIn && checkOut) {
      calculatedHours = calculateHours(new Date(checkIn), new Date(checkOut));
    }

    // Verify employee exists if being updated
    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
    }

    // Verify store exists and currency is supported if being updated
    if (storeId || currency) {
      const targetStoreId = storeId || existing.storeId;
      const targetCurrency = currency || existing.currency;

      const store = await prisma.store.findUnique({
        where: { id: targetStoreId },
      });

      if (!store) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }

      if (!store.supportedCurrencies.includes(targetCurrency as Currency)) {
        return NextResponse.json(
          { error: `This store does not support ${targetCurrency}` },
          { status: 400 }
        );
      }
    }

    const attendance = await prisma.attendance.update({
      where: { id: params.id },
      data: {
        ...(employeeId && { employeeId }),
        ...(storeId && { storeId }),
        ...(checkIn && { checkIn: new Date(checkIn) }),
        ...(checkOut && { checkOut: new Date(checkOut) }),
        ...(calculatedHours !== undefined && { hoursWorked: new Decimal(calculatedHours) }),
        ...(currency && { currency: currency as Currency }),
        ...(amountToPay !== undefined && { amountToPay }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        employee: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}

// DELETE /api/attendance/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.attendance.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    await prisma.attendance.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json({ error: "Failed to delete attendance" }, { status: 500 });
  }
}
