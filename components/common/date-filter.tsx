"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
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
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, subDays, subWeeks, subMonths, subYears, format } from "date-fns";

export type DateRange = {
  from: Date;
  to: Date;
};

export type DateFilterPreset = "today" | "week" | "month" | "year" | "custom";

interface DateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  preset: DateFilterPreset;
  onPresetChange: (preset: DateFilterPreset) => void;
  limitedPresets?: boolean; // If true, only show today, week, month
}

export function DateFilter({ value, onChange, preset, onPresetChange, limitedPresets = false }: DateFilterProps) {
  const [customFrom, setCustomFrom] = useState(format(value.from, "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(value.to, "yyyy-MM-dd"));

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
      case "custom":
        return; // Don't auto-update for custom
      default:
        from = startOfDay(now);
    }

    onChange({ from, to });
  };

  const handleCustomApply = () => {
    onChange({
      from: startOfDay(new Date(customFrom)),
      to: endOfDay(new Date(customTo)),
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateFilterPreset)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          {!limitedPresets && <SelectItem value="year">This Year</SelectItem>}
          {!limitedPresets && <SelectItem value="custom">Custom Range</SelectItem>}
        </SelectContent>
      </Select>

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
