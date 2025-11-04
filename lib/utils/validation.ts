import { NextRequest } from "next/server";

/**
 * Safely parse JSON from request body
 * Throws error if JSON is malformed
 */
export async function safeJsonParse(request: NextRequest): Promise<any> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}

/**
 * Validate if a string is a valid date
 */
export function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Parse and validate a date string
 * Throws error if date is invalid
 */
export function parseDate(dateString: string, fieldName: string = "date"): Date {
  if (!isValidDate(dateString)) {
    throw new Error(`Invalid ${fieldName}: ${dateString}`);
  }
  return new Date(dateString);
}

/**
 * Parse and validate a number
 * Throws error if number is invalid (NaN, Infinity, or not a number)
 */
export function parseNumber(
  value: any,
  fieldName: string = "number",
  options: { min?: number; max?: number; allowZero?: boolean } = {}
): number {
  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`Invalid ${fieldName}: must be a valid number`);
  }

  if (options.min !== undefined && num < options.min) {
    throw new Error(`Invalid ${fieldName}: must be at least ${options.min}`);
  }

  if (options.max !== undefined && num > options.max) {
    throw new Error(`Invalid ${fieldName}: must be at most ${options.max}`);
  }

  if (options.allowZero === false && num === 0) {
    throw new Error(`Invalid ${fieldName}: must be greater than 0`);
  }

  return num;
}

/**
 * Parse and validate an integer
 * Throws error if not a valid integer
 */
export function parseInteger(
  value: any,
  fieldName: string = "integer",
  options: { min?: number; max?: number; allowZero?: boolean } = {}
): number {
  const num = parseNumber(value, fieldName, options);

  if (!Number.isInteger(num)) {
    throw new Error(`Invalid ${fieldName}: must be an integer`);
  }

  return num;
}

/**
 * Validate if a string is a valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate UUID or throw error
 */
export function validateUUID(uuid: string, fieldName: string = "ID"): string {
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`);
  }
  return uuid;
}

/**
 * Validate email format (basic validation)
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate and parse monetary amount (convert to cents/pence)
 * Ensures non-negative amount
 */
export function parseMonetaryAmount(
  value: any,
  fieldName: string = "amount"
): number {
  const amount = parseNumber(value, fieldName, { min: 0 });

  // Round to avoid floating point issues
  return Math.round(amount);
}

/**
 * Trim and validate string
 */
export function validateString(
  value: any,
  fieldName: string,
  options: { required?: boolean; minLength?: number; maxLength?: number } = {}
): string | null {
  if (value === null || value === undefined || value === "") {
    if (options.required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  const trimmed = String(value).trim();

  if (options.required && trimmed === "") {
    throw new Error(`${fieldName} cannot be empty`);
  }

  if (options.minLength && trimmed.length < options.minLength) {
    throw new Error(
      `${fieldName} must be at least ${options.minLength} characters`
    );
  }

  if (options.maxLength && trimmed.length > options.maxLength) {
    throw new Error(
      `${fieldName} must be at most ${options.maxLength} characters`
    );
  }

  return trimmed || null;
}
