import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/stores/[id]/employees - Get all employees assigned to a store
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;

    const storeEmployees = await prisma.storeEmployee.findMany({
      where: { storeId },
      include: {
        employee: true,
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    const employees = storeEmployees.map((se) => ({
      ...se.employee,
      assignedAt: se.assignedAt,
      storeEmployeeId: se.id,
    }));

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching store employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch store employees" },
      { status: 500 }
    );
  }
}

// POST /api/stores/[id]/employees - Assign an employee to a store
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    const { employeeId } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Check if already assigned
    const existing = await prisma.storeEmployee.findUnique({
      where: {
        storeId_employeeId: {
          storeId,
          employeeId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Employee is already assigned to this store" },
        { status: 409 }
      );
    }

    const storeEmployee = await prisma.storeEmployee.create({
      data: {
        storeId,
        employeeId,
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json(storeEmployee, { status: 201 });
  } catch (error) {
    console.error("Error assigning employee to store:", error);
    return NextResponse.json(
      { error: "Failed to assign employee to store" },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[id]/employees - Remove an employee from a store
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    await prisma.storeEmployee.delete({
      where: {
        storeId_employeeId: {
          storeId,
          employeeId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing employee from store:", error);
    return NextResponse.json(
      { error: "Failed to remove employee from store" },
      { status: 500 }
    );
  }
}
