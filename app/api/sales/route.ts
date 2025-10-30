import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";

// GET /api/sales - List sales with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const currency = searchParams.get("currency");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (storeId) {
      where.storeId = storeId;
    }

    if (currency) {
      where.currency = currency as Currency;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

// POST /api/sales - Create new sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, currency, date, cash, online, delivery, justEat, mylocal, creditCard, notes } = body;

    // Validation
    if (!storeId) {
      return NextResponse.json(
        { error: "Store is required" },
        { status: 400 }
      );
    }

    if (!currency || (currency !== "EUR" && currency !== "GBP")) {
      return NextResponse.json(
        { error: "Valid currency (EUR or GBP) is required" },
        { status: 400 }
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

    // Convert amounts to integers (already in minor units from frontend)
    const cashAmount = parseInt(cash) || 0;
    const onlineAmount = parseInt(online) || 0;
    const deliveryAmount = parseInt(delivery) || 0;
    const justEatAmount = parseInt(justEat) || 0;
    const mylocalAmount = parseInt(mylocal) || 0;
    const creditCardAmount = parseInt(creditCard) || 0;

    const total = cashAmount + onlineAmount + deliveryAmount + justEatAmount + mylocalAmount + creditCardAmount;

    const sale = await prisma.sale.create({
      data: {
        storeId,
        currency: currency as Currency,
        date: date ? new Date(date) : new Date(),
        cash: cashAmount,
        online: onlineAmount,
        delivery: deliveryAmount,
        justEat: justEatAmount,
        mylocal: mylocalAmount,
        creditCard: creditCardAmount,
        total,
        notes: notes?.trim() || null,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}
