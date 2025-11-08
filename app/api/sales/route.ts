import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";
import { handlePrismaError } from "@/lib/utils/prisma-errors";
import { safeJsonParse, parseInteger, parseDate, validateUUID, isValidDate } from "@/lib/utils/validation";

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
      validateUUID(storeId, "storeId");
      where.storeId = storeId;
    }

    if (currency) {
      where.currency = currency as Currency;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = parseDate(startDate, "startDate");
      }
      if (endDate) {
        where.date.lte = parseDate(endDate, "endDate");
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
  } catch (error: any) {
    console.error("Error fetching sales:", error);

    // Handle validation errors
    if (error.message && error.message.includes("Invalid")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    const prismaError = handlePrismaError(error);
    return NextResponse.json(
      { error: prismaError.message },
      { status: prismaError.status }
    );
  }
}

// POST /api/sales - Create new sale
export async function POST(request: NextRequest) {
  try {
    const body = await safeJsonParse(request);
    const { storeId, currency, date, cash, online, delivery, justEat, mylocal, creditCard, cashInTill, difference, notes } = body;

    // Validation
    if (!storeId) {
      return NextResponse.json(
        { error: "Store is required" },
        { status: 400 }
      );
    }

    validateUUID(storeId, "storeId");

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

    // Parse and validate amounts (in minor units from frontend)
    const cashAmount = cash !== undefined ? parseInteger(cash, "cash", { min: 0 }) : 0;
    const onlineAmount = online !== undefined ? parseInteger(online, "online", { min: 0 }) : 0;
    const deliveryAmount = delivery !== undefined ? parseInteger(delivery, "delivery", { min: 0 }) : 0;
    const justEatAmount = justEat !== undefined ? parseInteger(justEat, "justEat", { min: 0 }) : 0;
    const mylocalAmount = mylocal !== undefined ? parseInteger(mylocal, "mylocal", { min: 0 }) : 0;
    const creditCardAmount = creditCard !== undefined ? parseInteger(creditCard, "creditCard", { min: 0 }) : 0;
    const cashInTillAmount = cashInTill !== undefined ? parseInteger(cashInTill, "cashInTill", { min: 0 }) : 0;
    const differenceAmount = difference !== undefined ? parseInteger(difference, "difference") : 0;

    const total = cashAmount + onlineAmount + deliveryAmount + justEatAmount + mylocalAmount + creditCardAmount;

    // Validate date if provided
    const saleDate = date ? parseDate(date, "date") : new Date();

    const sale = await prisma.sale.create({
      data: {
        storeId,
        currency: currency as Currency,
        date: saleDate,
        cash: cashAmount,
        online: onlineAmount,
        delivery: deliveryAmount,
        justEat: justEatAmount,
        mylocal: mylocalAmount,
        creditCard: creditCardAmount,
        total,
        cashInTill: cashInTillAmount,
        difference: differenceAmount,
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
  } catch (error: any) {
    console.error("Error creating sale:", error);

    // Handle validation errors
    if (error.message && (error.message.includes("Invalid") || error.message.includes("required"))) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    const prismaError = handlePrismaError(error);
    return NextResponse.json(
      { error: prismaError.message },
      { status: prismaError.status }
    );
  }
}
