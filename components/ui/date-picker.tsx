'use client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { CalendarProps } from '@/components/ui/calendar';

interface DatePickerProps {
  value: string;           // ISO date string YYYY-MM-DD
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Use "dropdown" for fields like birth date where year navigation matters */
  captionLayout?: CalendarProps['captionLayout'];
  /** Earliest selectable year (required when captionLayout="dropdown") */
  fromYear?: number;
  /** Latest selectable year (required when captionLayout="dropdown") */
  toYear?: number;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleziona data',
  disabled,
  className,
  captionLayout,
  fromYear,
  toYear,
}: DatePickerProps) {
  const date = value ? new Date(value + 'T00:00:00') : undefined;

  const startMonth = fromYear ? new Date(fromYear, 0) : undefined;
  const endMonth   = toYear   ? new Date(toYear, 11)  : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground', className)}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, 'dd/MM/yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '')}
          locale={it}
          initialFocus
          captionLayout={captionLayout}
          startMonth={startMonth}
          endMonth={endMonth}
        />
      </PopoverContent>
    </Popover>
  );
}
