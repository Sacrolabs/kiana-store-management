import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/stores/[id]/drivers - Get all drivers assigned to a store
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;

    const storeDrivers = await prisma.storeDriver.findMany({
      where: { storeId },
      include: {
        driver: true,
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    const drivers = storeDrivers.map((sd) => ({
      ...sd.driver,
      assignedAt: sd.assignedAt,
      storeDriverId: sd.id,
    }));

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Error fetching store drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch store drivers" },
      { status: 500 }
    );
  }
}

// POST /api/stores/[id]/drivers - Assign a driver to a store
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    const { driverId } = await request.json();

    if (!driverId) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 }
      );
    }

    // Check if already assigned
    const existing = await prisma.storeDriver.findUnique({
      where: {
        storeId_driverId: {
          storeId,
          driverId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Driver is already assigned to this store" },
        { status: 409 }
      );
    }

    const storeDriver = await prisma.storeDriver.create({
      data: {
        storeId,
        driverId,
      },
      include: {
        driver: true,
      },
    });

    return NextResponse.json(storeDriver, { status: 201 });
  } catch (error) {
    console.error("Error assigning driver to store:", error);
    return NextResponse.json(
      { error: "Failed to assign driver to store" },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[id]/drivers - Remove a driver from a store
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 }
      );
    }

    await prisma.storeDriver.delete({
      where: {
        storeId_driverId: {
          storeId,
          driverId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing driver from store:", error);
    return NextResponse.json(
      { error: "Failed to remove driver from store" },
      { status: 500 }
    );
  }
}
