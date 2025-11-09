import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export const dynamic = 'force-dynamic';

// GET /api/payments/all
export async function GET(request: NextRequest) {
  try {
    const payments = await prisma.payment.findMany({
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
    console.error("Error fetching all payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

