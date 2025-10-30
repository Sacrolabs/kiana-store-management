import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/vendors - List all vendors
export async function GET(request: NextRequest) {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            expenses: true,
          },
        },
      },
    });

    return NextResponse.json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Create new vendor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contact, email, phone } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate vendor name
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: "insensitive",
        },
      },
    });

    if (existingVendor) {
      return NextResponse.json(
        { error: "A vendor with this name already exists" },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        contact: contact?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
