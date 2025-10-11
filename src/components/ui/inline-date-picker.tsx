import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

interface InlineDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  defaultDate?: Date;
  showSelectedDate?: boolean;
}

export function InlineDatePicker({
  value,
  onChange,
  placeholder = "No date selected",
  className,
  defaultDate = new Date(),
  showSelectedDate = true
}: InlineDatePickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Optional: Show selected date at the top */}
      {showSelectedDate && (
        <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium bg-muted/50 rounded-md">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? format(value, "PPP") : placeholder}
          </span>
        </div>
      )}
      
      {/* Calendar is always visible */}
      <div className="border rounded-md bg-background">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          defaultMonth={value || defaultDate}
          initialFocus
          className="rounded-md"
        />
      </div>
    </div>
  );
}

