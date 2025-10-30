import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Currency } from "@/lib/generated/prisma";

// GET /api/stores/[id] - Get single store
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { id: params.id },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json(
      { error: "Failed to fetch store" },
      { status: 500 }
    );
  }
}

// PATCH /api/stores/[id] - Update store
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, address, phone, managerName, supportedCurrencies, defaultCurrency } = body;

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id: params.id },
    });

    if (!existingStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Validate currencies if provided
    let validCurrencies: Currency[] | undefined;
    let validDefaultCurrency: Currency | undefined;

    if (supportedCurrencies) {
      validCurrencies = supportedCurrencies.filter(
        (c: string) => c === "EUR" || c === "GBP"
      ) as Currency[];
      if (validCurrencies.length === 0) {
        validCurrencies = ["EUR"];
      }
    }

    if (defaultCurrency) {
      validDefaultCurrency = defaultCurrency === "GBP" ? "GBP" : "EUR";

      // Ensure default currency is in supported currencies
      if (validCurrencies) {
        if (!validCurrencies.includes(validDefaultCurrency)) {
          validCurrencies.push(validDefaultCurrency);
        }
      }
    }

    const store = await prisma.store.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(managerName !== undefined && { managerName: managerName?.trim() || null }),
        ...(validCurrencies && { supportedCurrencies: validCurrencies }),
        ...(validDefaultCurrency && { defaultCurrency: validDefaultCurrency }),
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json(
      { error: "Failed to update store" },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[id] - Delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id: params.id },
    });

    if (!existingStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Delete store (cascades to related records)
    await prisma.store.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: "Failed to delete store" },
      { status: 500 }
    );
  }
}
