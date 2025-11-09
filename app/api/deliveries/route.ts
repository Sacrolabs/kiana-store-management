import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency, Prisma } from "@/lib/generated/prisma";

// GET /api/deliveries - List delivery records with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");
    const storeId = searchParams.get("storeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (driverId) {
      where.driverId = driverId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (startDate || endDate) {
      where.deliveryDate = {};
      if (startDate) {
        where.deliveryDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.deliveryDate.lte = new Date(endDate);
      }
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        driver: {
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
        deliveryDate: "desc",
      },
    });

    return NextResponse.json(deliveries);
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliveries" },
      { status: 500 }
    );
  }
}

// POST /api/deliveries - Create new delivery record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverId, storeId, deliveryDate, checkIn, checkOut, hoursWorked, numberOfDeliveries, currency, expenseAmount, notes } = body;

    // Validation
    if (!driverId) {
      return NextResponse.json(
        { error: "Driver is required" },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: "Store is required" },
        { status: 400 }
      );
    }

    if (!deliveryDate) {
      return NextResponse.json(
        { error: "Delivery date is required" },
        { status: 400 }
      );
    }

    if (!checkIn) {
      return NextResponse.json(
        { error: "Check-in time is required" },
        { status: 400 }
      );
    }

    if (!checkOut) {
      return NextResponse.json(
        { error: "Check-out time is required" },
        { status: 400 }
      );
    }

    if (hoursWorked === undefined || hoursWorked < 0) {
      return NextResponse.json(
        { error: "Hours worked must be a non-negative number" },
        { status: 400 }
      );
    }

    if (!numberOfDeliveries || numberOfDeliveries < 0) {
      return NextResponse.json(
        { error: "Number of deliveries must be a positive number" },
        { status: 400 }
      );
    }

    if (!currency || (currency !== "EUR" && currency !== "GBP")) {
      return NextResponse.json(
        { error: "Valid currency (EUR or GBP) is required" },
        { status: 400 }
      );
    }

    if (expenseAmount === undefined || expenseAmount < 0) {
      return NextResponse.json(
        { error: "Expense amount must be a non-negative number" },
        { status: 400 }
      );
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
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

    const delivery = await prisma.delivery.create({
      data: {
        driverId,
        storeId,
        deliveryDate: new Date(deliveryDate),
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        hoursWorked: new Prisma.Decimal(hoursWorked),
        numberOfDeliveries,
        currency: currency as Currency,
        expenseAmount, // Already in cents/pence from frontend
        notes: notes?.trim() || null,
      },
      include: {
        driver: {
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

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    console.error("Error creating delivery:", error);
    return NextResponse.json(
      { error: "Failed to create delivery" },
      { status: 500 }
    );
  }
}
