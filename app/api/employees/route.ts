import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// GET /api/employees - List all employees
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, wageType, hourlyRateEur, hourlyRateGbp, weeklyWageEur, weeklyWageGbp } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Employee name is required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        wageType: wageType || "HOURLY",
        hourlyRateEur: hourlyRateEur ? new Decimal(hourlyRateEur) : null,
        hourlyRateGbp: hourlyRateGbp ? new Decimal(hourlyRateGbp) : null,
        weeklyWageEur: weeklyWageEur ? new Decimal(weeklyWageEur) : null,
        weeklyWageGbp: weeklyWageGbp ? new Decimal(weeklyWageGbp) : null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
