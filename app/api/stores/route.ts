import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";

// GET /api/stores - List all stores
export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}

// POST /api/stores - Create new store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, phone, managerName, supportedCurrencies, defaultCurrency } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Store name is required" },
        { status: 400 }
      );
    }

    // Validate currencies
    const validCurrencies: Currency[] = supportedCurrencies?.filter(
      (c: string) => c === "EUR" || c === "GBP"
    ) || ["EUR"];

    const validDefaultCurrency: Currency =
      defaultCurrency === "GBP" ? "GBP" : "EUR";

    // Ensure default currency is in supported currencies
    if (!validCurrencies.includes(validDefaultCurrency)) {
      validCurrencies.push(validDefaultCurrency);
    }

    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        managerName: managerName?.trim() || null,
        supportedCurrencies: validCurrencies,
        defaultCurrency: validDefaultCurrency,
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Failed to create store" },
      { status: 500 }
    );
  }
}
