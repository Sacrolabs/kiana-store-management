import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency, Prisma } from "@/lib/generated/prisma";

// GET /api/deliveries/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
      include: {
        driver: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
    });

    if (!delivery) {
      return NextResponse.json({ error: "Delivery record not found" }, { status: 404 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("Error fetching delivery:", error);
    return NextResponse.json({ error: "Failed to fetch delivery" }, { status: 500 });
  }
}

// PATCH /api/deliveries/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { driverId, storeId, deliveryDate, checkIn, checkOut, hoursWorked, numberOfDeliveries, currency, expenseAmount, notes } = body;

    // Check if delivery exists
    const existing = await prisma.delivery.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Delivery record not found" }, { status: 404 });
    }

    // Validation for updated fields
    if (hoursWorked !== undefined && hoursWorked < 0) {
      return NextResponse.json(
        { error: "Hours worked must be a non-negative number" },
        { status: 400 }
      );
    }

    if (numberOfDeliveries !== undefined && numberOfDeliveries < 0) {
      return NextResponse.json(
        { error: "Number of deliveries must be a positive number" },
        { status: 400 }
      );
    }

    if (currency && currency !== "EUR" && currency !== "GBP") {
      return NextResponse.json(
        { error: "Valid currency (EUR or GBP) is required" },
        { status: 400 }
      );
    }

    if (expenseAmount !== undefined && expenseAmount < 0) {
      return NextResponse.json(
        { error: "Expense amount must be a non-negative number" },
        { status: 400 }
      );
    }

    // If storeId is being updated, verify currency is supported
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

    const delivery = await prisma.delivery.update({
      where: { id: params.id },
      data: {
        ...(driverId && { driverId }),
        ...(storeId && { storeId }),
        ...(deliveryDate && { deliveryDate: new Date(deliveryDate) }),
        ...(checkIn && { checkIn: new Date(checkIn) }),
        ...(checkOut && { checkOut: new Date(checkOut) }),
        ...(hoursWorked !== undefined && { hoursWorked: new Prisma.Decimal(hoursWorked) }),
        ...(numberOfDeliveries !== undefined && { numberOfDeliveries }),
        ...(currency && { currency: currency as Currency }),
        ...(expenseAmount !== undefined && { expenseAmount }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        driver: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("Error updating delivery:", error);
    return NextResponse.json({ error: "Failed to update delivery" }, { status: 500 });
  }
}

// DELETE /api/deliveries/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.delivery.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Delivery record not found" }, { status: 404 });
    }

    await prisma.delivery.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting delivery:", error);
    return NextResponse.json({ error: "Failed to delete delivery" }, { status: 500 });
  }
}
