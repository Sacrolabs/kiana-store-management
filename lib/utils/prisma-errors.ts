import { Prisma } from "@/lib/generated/prisma";

export interface ErrorResponse {
  status: number;
  message: string;
  code?: string;
}

/**
 * Handles Prisma-specific errors and returns appropriate HTTP responses
 */
export function handlePrismaError(error: any): ErrorResponse {
  // Handle known Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        // Unique constraint violation
        return {
          status: 409,
          message: "A record with this information already exists",
          code: "CONFLICT",
        };

      case "P2025":
        // Record not found
        return {
          status: 404,
          message: "The requested resource was not found",
          code: "NOT_FOUND",
        };

      case "P2003":
        // Foreign key constraint violation
        return {
          status: 400,
          message: "Invalid reference to related resource",
          code: "INVALID_REFERENCE",
        };

      case "P2014":
        // Required relation violation
        return {
          status: 400,
          message: "The operation would violate a required relation",
          code: "RELATION_VIOLATION",
        };

      case "P2011":
        // Null constraint violation
        return {
          status: 400,
          message: "A required field is missing",
          code: "NULL_CONSTRAINT",
        };

      default:
        console.error("Unhandled Prisma error code:", error.code, error);
        return {
          status: 500,
          message: "A database error occurred",
          code: "DATABASE_ERROR",
        };
    }
  }

  // Handle validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      message: "Invalid data provided",
      code: "VALIDATION_ERROR",
    };
  }

  // Handle initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Prisma initialization error:", error);
    return {
      status: 503,
      message: "Database connection failed",
      code: "CONNECTION_ERROR",
    };
  }

  // Generic database error
  console.error("Unknown database error:", error);
  return {
    status: 500,
    message: "An unexpected database error occurred",
    code: "UNKNOWN_ERROR",
  };
}
