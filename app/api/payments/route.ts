import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency, PaymentMethod } from "@/lib/generated/prisma";

export const dynamic = 'force-dynamic';

// GET /api/payments?employeeId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: { employeeId },
      orderBy: { paidDate: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/payments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, amountPaid, currency, paymentMethod, paidDate, notes } = body;

    // Validate required fields
    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 }
      );
    }

    if (!amountPaid || amountPaid <= 0) {
      return NextResponse.json(
        { error: "amountPaid must be greater than 0" },
        { status: 400 }
      );
    }

    if (!currency || !["EUR", "GBP"].includes(currency)) {
      return NextResponse.json(
        { error: "Valid currency (EUR or GBP) is required" },
        { status: 400 }
      );
    }

    if (!paymentMethod || !["CASH", "ACCOUNT"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Valid paymentMethod (CASH or ACCOUNT) is required" },
        { status: 400 }
      );
    }

    if (!paidDate) {
      return NextResponse.json(
        { error: "paidDate is required" },
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

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        employeeId,
        amountPaid: parseInt(amountPaid.toString()),
        currency: currency as Currency,
        paymentMethod: paymentMethod as PaymentMethod,
        paidDate: new Date(paidDate),
        notes: notes?.trim() || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

