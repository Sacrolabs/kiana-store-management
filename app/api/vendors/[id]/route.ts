import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/vendors/[id] - Get single vendor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        expenses: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            expenseDate: "desc",
          },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor" },
      { status: 500 }
    );
  }
}

// PATCH /api/vendors/[id] - Update vendor
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, contact, email, phone } = body;

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: params.id },
    });

    if (!existingVendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: "Vendor name cannot be empty" },
          { status: 400 }
        );
      }

      // Check for duplicate vendor name (excluding current vendor)
      const duplicateVendor = await prisma.vendor.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: "insensitive",
          },
          id: {
            not: params.id,
          },
        },
      });

      if (duplicateVendor) {
        return NextResponse.json(
          { error: "A vendor with this name already exists" },
          { status: 400 }
        );
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contact !== undefined && { contact: contact?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
      { status: 500 }
    );
  }
}

// DELETE /api/vendors/[id] - Delete vendor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            expenses: true,
          },
        },
      },
    });

    if (!existingVendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Check if vendor has expenses (Restrict delete)
    if (existingVendor._count.expenses > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete vendor with existing expenses. This vendor has ${existingVendor._count.expenses} expense record(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.vendor.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
