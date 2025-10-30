import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// Helper function to calculate hours between two dates
function calculateHours(checkIn: Date, checkOut: Date): number {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
}

// GET /api/attendance - List attendance records with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const storeId = searchParams.get("storeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) {
        where.checkIn.gte = new Date(startDate);
      }
      if (endDate) {
        where.checkIn.lte = new Date(endDate);
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        checkIn: "desc",
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// POST /api/attendance - Create new attendance record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, storeId, checkIn, checkOut, currency, notes } = body;

    // Validation
    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee is required" },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: "Store is required" },
        { status: 400 }
      );
    }

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: "Check-in and check-out times are required" },
        { status: 400 }
      );
    }

    if (!currency || (currency !== "EUR" && currency !== "GBP")) {
      return NextResponse.json(
        { error: "Valid currency (EUR or GBP) is required" },
        { status: 400 }
      );
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Verify currency is supported by store
    if (!store.supportedCurrencies.includes(currency as Currency)) {
      return NextResponse.json(
        { error: `This store does not support ${currency}` },
        { status: 400 }
      );
    }

    // Get hourly rate for the currency
    const hourlyRate = currency === "EUR" ? employee.hourlyRateEur : employee.hourlyRateGbp;

    if (!hourlyRate) {
      return NextResponse.json(
        { error: `Employee does not have hourly rate set for ${currency}` },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Validate times
    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: "Check-out time must be after check-in time" },
        { status: 400 }
      );
    }

    // Calculate hours worked
    const hoursWorked = calculateHours(checkInDate, checkOutDate);

    // Calculate payment (convert to minor units - cents/pence)
    const hourlyRateNumber = parseFloat(hourlyRate.toString());
    const paymentDecimal = hoursWorked * hourlyRateNumber;
    const amountToPay = Math.round(paymentDecimal * 100); // Convert to cents/pence

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        storeId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        hoursWorked: new Decimal(hoursWorked),
        currency: currency as Currency,
        amountToPay,
        notes: notes?.trim() || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance:", error);
    return NextResponse.json(
      { error: "Failed to create attendance" },
      { status: 500 }
    );
  }
}
