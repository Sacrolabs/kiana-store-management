import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency, ExpenseStatus } from "@/lib/generated/prisma";

// GET /api/expenses/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
  }
}

// PATCH /api/expenses/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { storeId, vendorId, amount, currency, description, expenseDate, status } = body;

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Validate currency if provided
    if (currency && currency !== "EUR" && currency !== "GBP") {
      return NextResponse.json(
        { error: "Valid currency (EUR or GBP) is required" },
        { status: 400 }
      );
    }

    // Validate amount if provided
    if (amount !== undefined && (amount < 0)) {
      return NextResponse.json(
        { error: "Amount cannot be negative" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && status !== "RAISED" && status !== "PAID") {
      return NextResponse.json(
        { error: "Valid status (RAISED or PAID) is required" },
        { status: 400 }
      );
    }

    // Verify store exists and supports currency if being updated
    if (storeId || currency) {
      const store = await prisma.store.findUnique({
        where: { id: storeId || existingExpense.storeId },
      });

      if (!store) {
        return NextResponse.json(
          { error: "Store not found" },
          { status: 404 }
        );
      }

      const currencyToCheck = (currency || existingExpense.currency) as Currency;
      if (!store.supportedCurrencies.includes(currencyToCheck)) {
        return NextResponse.json(
          { error: `This store does not support ${currencyToCheck}` },
          { status: 400 }
        );
      }
    }

    // Verify vendor exists if being updated
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 }
        );
      }
    }

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...(storeId && { storeId }),
        ...(vendorId && { vendorId }),
        ...(amount !== undefined && { amount: Math.round(amount) }),
        ...(currency && { currency: currency as Currency }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
        ...(status && { status: status as ExpenseStatus }),
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingExpense = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
