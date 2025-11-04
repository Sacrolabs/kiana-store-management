import { Currency as PrismaCurrency } from "@/lib/generated/prisma";

export type Currency = PrismaCurrency;

/**
 * Convert decimal amount to integer cents/pence
 * @param amount - Decimal amount (e.g., 10.50)
 * @returns Integer amount in cents (e.g., 1050)
 */
export function toMinorUnits(amount: number | string): number {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return Math.round(numAmount * 100);
}

/**
 * Convert integer cents/pence to decimal amount
 * @param minorUnits - Integer amount in cents (e.g., 1050)
 * @returns Decimal amount (e.g., 10.50)
 */
export function fromMinorUnits(minorUnits: number): number {
  return minorUnits / 100;
}

/**
 * Format amount with currency symbol
 * @param minorUnits - Integer amount in cents/pence
 * @param currency - Currency code (EUR or GBP)
 * @param showSymbol - Whether to show currency symbol
 * @returns Formatted string (e.g., "€10.50" or "£10.50")
 */
export function formatCurrency(
  minorUnits: number,
  currency: Currency = "EUR",
  showSymbol: boolean = true
): string {
  const amount = fromMinorUnits(minorUnits);
  const locale = "en-US"; // US format: 1,234.56 for both EUR and GBP
  const currencyCode = currency;

  if (!showSymbol) {
    return amount.toFixed(2);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get currency symbol
 * @param currency - Currency code
 * @returns Currency symbol (€ or £)
 */
export function getCurrencySymbol(currency: Currency): string {
  return currency === "EUR" ? "€" : "£";
}

/**
 * Parse input value to minor units
 * @param value - User input string
 * @returns Integer in minor units or 0 if invalid
 */
export function parseInputToMinorUnits(value: string): number {
  // Remove any non-digit and non-decimal characters
  const cleaned = value.replace(/[^\d.]/g, "");
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return 0;
  }

  return toMinorUnits(parsed);
}

/**
 * Validate currency amount input
 * @param value - Input value
 * @returns Boolean indicating if valid
 */
export function isValidCurrencyInput(value: string): boolean {
  // Allow digits, one decimal point, and up to 2 decimal places
  const pattern = /^\d+(\.\d{0,2})?$/;
  return pattern.test(value);
}
