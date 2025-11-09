import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency, PaymentMethod } from "@/lib/generated/prisma";

export const dynamic = 'force-dynamic';

// PATCH /api/payments/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { amountPaid, currency, paymentMethod, paidDate, notes } = body;

    // Validate payment exists
    const existingPayment = await prisma.payment.findUnique({
      where: { id: params.id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Build update data object
    const updateData: any = {};

    if (amountPaid !== undefined) {
      updateData.amountPaid = parseInt(amountPaid.toString());
    }

    if (currency) {
      updateData.currency = currency as Currency;
    }

    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod as PaymentMethod;
    }

    if (paidDate) {
      updateData.paidDate = new Date(paidDate);
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    // Update payment
    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify payment exists
    const existingPayment = await prisma.payment.findUnique({
      where: { id: params.id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Delete payment
    await prisma.payment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}

