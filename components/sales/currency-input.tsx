"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrencySymbol, fromMinorUnits, toMinorUnits } from "@/lib/currency/utils";
import { Currency } from "@/lib/generated/prisma";
import { forwardRef, useState, useEffect } from "react";

interface CurrencyInputProps {
  label: string;
  value: number; // in minor units (cents/pence)
  onChange: (value: number) => void;
  currency: Currency;
  placeholder?: string;
  id?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, value, onChange, currency, placeholder, id }, ref) => {
    const [displayValue, setDisplayValue] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
      // Only sync displayValue with value prop when not actively editing
      if (!isEditing) {
        if (value === 0) {
          setDisplayValue("");
        } else {
          setDisplayValue(fromMinorUnits(value).toString());
        }
      }
    }, [value, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow only numbers and one decimal point
      if (inputValue && !/^\d*\.?\d{0,2}$/.test(inputValue)) {
        return;
      }

      setDisplayValue(inputValue);

      // Convert to minor units and call onChange
      if (inputValue === "" || inputValue === ".") {
        onChange(0);
      } else {
        const numValue = parseFloat(inputValue);
        if (!isNaN(numValue)) {
          onChange(toMinorUnits(numValue));
        }
      }
    };

    const handleFocus = () => {
      setIsEditing(true);
    };

    const handleBlur = () => {
      setIsEditing(false);
      // Format to 2 decimal places on blur
      if (displayValue && displayValue !== ".") {
        const numValue = parseFloat(displayValue);
        if (!isNaN(numValue)) {
          setDisplayValue(numValue.toFixed(2));
        }
      }
    };

    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {getCurrencySymbol(currency)}
          </span>
          <Input
            ref={ref}
            id={id}
            type="text"
            inputMode="decimal"
            placeholder={placeholder || "0.00"}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="pl-8"
          />
        </div>
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
