"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfDay,
  endOfWeek,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  setYear,
  addWeeks
} from "date-fns";

export type DateRange = {
  from: Date;
  to: Date;
};

export type DateFilterPreset = "today" | "week" | "month" | "year" | "weekPicker" | "custom";

interface DateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  preset: DateFilterPreset;
  onPresetChange: (preset: DateFilterPreset) => void;
  limitedPresets?: boolean; // If true, only show today, week, month
  hideWeekPicker?: boolean; // If true, hides "Select Week" option
}

export function DateFilter({ value, onChange, preset, onPresetChange, limitedPresets = false, hideWeekPicker = false }: DateFilterProps) {
  const [customFrom, setCustomFrom] = useState(format(value.from, "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(value.to, "yyyy-MM-dd"));

  // Week picker state
  const now = new Date();
  const [selectedWeek, setSelectedWeek] = useState(getISOWeek(now));
  const [selectedYear, setSelectedYear] = useState(getISOWeekYear(now));

  // Track if we've already called onChange for this week/year combination
  const lastCalledWeekYearRef = useRef<{week: number, year: number} | null>(null);

  // Helper to get date range for a specific ISO week and year
  const getWeekRange = useCallback((week: number, year: number): DateRange => {
    // Create a date in the selected year
    let date = setYear(new Date(), year);
    // Set to the specific ISO week
    date = setISOWeek(date, week);

    const from = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const to = endOfWeek(date, { weekStartsOn: 1 }); // Sunday

    return { from, to };
  }, []);

  // Update date range when week or year changes (for weekPicker preset)
  useEffect(() => {
    if (preset === "weekPicker") {
      // Check if we've already called onChange for this combination
      const key = `${selectedWeek}-${selectedYear}`;
      const lastKey = lastCalledWeekYearRef.current
        ? `${lastCalledWeekYearRef.current.week}-${lastCalledWeekYearRef.current.year}`
        : null;

      if (key !== lastKey) {
        const range = getWeekRange(selectedWeek, selectedYear);
        onChange(range);
        lastCalledWeekYearRef.current = { week: selectedWeek, year: selectedYear };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, selectedWeek, selectedYear, getWeekRange]);

  const handlePresetChange = (newPreset: DateFilterPreset) => {
    onPresetChange(newPreset);

    const now = new Date();
    let from: Date;
    let to: Date = endOfDay(now);

    switch (newPreset) {
      case "today":
        from = startOfDay(now);
        break;
      case "week":
        from = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        break;
      case "month":
        from = startOfMonth(now);
        break;
      case "year":
        from = startOfYear(now);
        break;
      case "weekPicker":
        // Initialize to current week
        const currentWeek = getISOWeek(now);
        const currentYear = getISOWeekYear(now);

        // Reset the ref when switching to weekPicker
        lastCalledWeekYearRef.current = null;

        setSelectedWeek(currentWeek);
        setSelectedYear(currentYear);
        // Let the useEffect handle onChange to avoid double-calling
        return;
      case "custom":
        return; // Don't auto-update for custom
      default:
        from = startOfDay(now);
    }

    onChange({ from, to });
  };

  const handlePreviousWeek = () => {
    if (selectedWeek === 1) {
      // Wrap to previous year, week 52 (or 53)
      const prevYear = selectedYear - 1;
      const lastWeekOfPrevYear = getISOWeek(new Date(prevYear, 11, 28)); // Dec 28 is always in the last week
      setSelectedWeek(lastWeekOfPrevYear);
      setSelectedYear(prevYear);
    } else {
      setSelectedWeek(selectedWeek - 1);
    }
  };

  const handleNextWeek = () => {
    const lastWeekOfYear = getISOWeek(new Date(selectedYear, 11, 28)); // Dec 28 is always in the last week

    if (selectedWeek >= lastWeekOfYear) {
      // Wrap to next year, week 1
      setSelectedWeek(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  const handleCustomApply = () => {
    onChange({
      from: startOfDay(new Date(customFrom)),
      to: endOfDay(new Date(customTo)),
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateFilterPreset)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          {!limitedPresets && <SelectItem value="year">This Year</SelectItem>}
          {!limitedPresets && !hideWeekPicker && <SelectItem value="weekPicker">Select Week</SelectItem>}
          {!limitedPresets && <SelectItem value="custom">Custom Range</SelectItem>}
        </SelectContent>
      </Select>

      {preset === "weekPicker" && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousWeek}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center min-w-[120px]">
            <span className="text-sm font-medium">
              Week {selectedWeek}, {selectedYear}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(value.from, "MMM d")} - {format(value.to, "MMM d")}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {preset === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              {format(value.from, "MMM d")} - {format(value.to, "MMM d")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  max={customTo}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  min={customFrom}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <Button onClick={handleCustomApply} className="w-full">
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
