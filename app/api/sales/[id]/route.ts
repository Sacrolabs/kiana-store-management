import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";
import { handlePrismaError } from "@/lib/utils/prisma-errors";
import { safeJsonParse, parseInteger, parseDate, validateUUID } from "@/lib/utils/validation";

// GET /api/sales/[id] - Get single sale
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    validateUUID(params.id, "sale ID");

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error("Error fetching sale:", error);

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

// PATCH /api/sales/[id] - Update sale
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    validateUUID(params.id, "sale ID");

    const body = await safeJsonParse(request);
    const { storeId, currency, date, cash, online, delivery, justEat, mylocal, creditCard, cashInTill, difference, notes } = body;

    // Check if sale exists
    const existingSale = await prisma.sale.findUnique({
      where: { id: params.id },
    });

    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // If store is being changed, verify it exists
    if (storeId && storeId !== existingSale.storeId) {
      validateUUID(storeId, "storeId");

      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) {
        return NextResponse.json(
          { error: "Store not found" },
          { status: 404 }
        );
      }

      // Verify currency is supported by new store
      const saleCurrency = currency || existingSale.currency;
      if (!store.supportedCurrencies.includes(saleCurrency as Currency)) {
        return NextResponse.json(
          { error: `This store does not support ${saleCurrency}` },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (storeId) updateData.storeId = storeId;
    if (currency) updateData.currency = currency as Currency;
    if (date) updateData.date = parseDate(date, "date");
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    // Update amounts if provided - with proper validation
    const amounts: any = {};
    if (cash !== undefined) amounts.cash = parseInteger(cash, "cash", { min: 0 });
    if (online !== undefined) amounts.online = parseInteger(online, "online", { min: 0 });
    if (delivery !== undefined) amounts.delivery = parseInteger(delivery, "delivery", { min: 0 });
    if (justEat !== undefined) amounts.justEat = parseInteger(justEat, "justEat", { min: 0 });
    if (mylocal !== undefined) amounts.mylocal = parseInteger(mylocal, "mylocal", { min: 0 });
    if (creditCard !== undefined) amounts.creditCard = parseInteger(creditCard, "creditCard", { min: 0 });

    // Update cash reconciliation fields
    if (cashInTill !== undefined) updateData.cashInTill = parseInteger(cashInTill, "cashInTill", { min: 0 });
    if (difference !== undefined) updateData.difference = parseInteger(difference, "difference");

    // If any amounts were updated, recalculate total
    if (Object.keys(amounts).length > 0) {
      Object.assign(updateData, amounts);

      // Calculate new total
      const finalAmounts = {
        cash: amounts.cash !== undefined ? amounts.cash : existingSale.cash,
        online: amounts.online !== undefined ? amounts.online : existingSale.online,
        delivery: amounts.delivery !== undefined ? amounts.delivery : existingSale.delivery,
        justEat: amounts.justEat !== undefined ? amounts.justEat : existingSale.justEat,
        mylocal: amounts.mylocal !== undefined ? amounts.mylocal : existingSale.mylocal,
        creditCard: amounts.creditCard !== undefined ? amounts.creditCard : existingSale.creditCard,
      };

      updateData.total = Object.values(finalAmounts).reduce((sum, val) => sum + val, 0);
    }

    const sale = await prisma.sale.update({
      where: { id: params.id },
      data: updateData,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error("Error updating sale:", error);

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

// DELETE /api/sales/[id] - Delete sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    validateUUID(params.id, "sale ID");

    // Delete sale (will throw P2025 if not found)
    await prisma.sale.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting sale:", error);

    // Handle validation errors
    if (error.message && error.message.includes("Invalid")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle Prisma errors (including P2025 for not found)
    const prismaError = handlePrismaError(error);
    return NextResponse.json(
      { error: prismaError.message },
      { status: prismaError.status }
    );
  }
}
