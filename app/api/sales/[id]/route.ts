import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";

// GET /api/sales/[id] - Get single sale
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}

// PATCH /api/sales/[id] - Update sale
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { storeId, currency, date, cash, online, delivery, justEat, mylocal, creditCard, notes } = body;

    // Check if sale exists
    const existingSale = await prisma.sale.findUnique({
      where: { id: params.id },
    });

    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // If store is being changed, verify it exists
    if (storeId && storeId !== existingSale.storeId) {
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
      const saleCurrenty = currency || existingSale.currency;
      if (!store.supportedCurrencies.includes(saleCurrenty as Currency)) {
        return NextResponse.json(
          { error: `This store does not support ${saleCurrenty}` },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (storeId) updateData.storeId = storeId;
    if (currency) updateData.currency = currency as Currency;
    if (date) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    // Update amounts if provided
    const amounts: any = {};
    if (cash !== undefined) amounts.cash = parseInt(cash) || 0;
    if (online !== undefined) amounts.online = parseInt(online) || 0;
    if (delivery !== undefined) amounts.delivery = parseInt(delivery) || 0;
    if (justEat !== undefined) amounts.justEat = parseInt(justEat) || 0;
    if (mylocal !== undefined) amounts.mylocal = parseInt(mylocal) || 0;
    if (creditCard !== undefined) amounts.creditCard = parseInt(creditCard) || 0;

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
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json(
      { error: "Failed to update sale" },
      { status: 500 }
    );
  }
}

// DELETE /api/sales/[id] - Delete sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if sale exists
    const existingSale = await prisma.sale.findUnique({
      where: { id: params.id },
    });

    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Delete sale
    await prisma.sale.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 }
    );
  }
}
