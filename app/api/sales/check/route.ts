import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";
import { startOfDay, endOfDay } from "date-fns";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/sales/check?storeId=xxx&currency=EUR&date=2025-10-30
// Check if a sale exists for the given store, currency, and date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const currency = searchParams.get("currency");
    const dateStr = searchParams.get("date");

    if (!storeId || !currency || !dateStr) {
      return NextResponse.json(
        { error: "storeId, currency, and date are required" },
        { status: 400 }
      );
    }

    // Parse the date and normalize to start of day
    const date = new Date(dateStr);
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    // Find sale for this store, currency, and date
    const sale = await prisma.sale.findFirst({
      where: {
        storeId,
        currency: currency as Currency,
        date: {
          gte: startDate,
          lte: endDate,
        },
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

    if (!sale) {
      return NextResponse.json({ exists: false, sale: null });
    }

    return NextResponse.json({ exists: true, sale });
  } catch (error) {
    console.error("Error checking sale:", error);
    return NextResponse.json(
      { error: "Failed to check sale" },
      { status: 500 }
    );
  }
}
