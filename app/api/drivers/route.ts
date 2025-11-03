import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/drivers - List all drivers
export async function GET() {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

// POST /api/drivers - Create new driver
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Driver name is required" },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error("Error creating driver:", error);
    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    );
  }
}
