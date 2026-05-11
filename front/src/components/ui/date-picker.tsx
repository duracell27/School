'use client';

import { useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { uk } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Виберіть дату', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const isValidDate = selected && isValid(selected);

  function handleSelect(day: Date | undefined) {
    onChange(day ? format(day, 'yyyy-MM-dd') : '');
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'flex-1 justify-start text-left font-normal',
            !isValidDate && 'text-muted-foreground',
          )}
        >
          <CalendarIcon size={14} className="mr-2 shrink-0" />
          <span className="flex-1 truncate">
            {isValidDate ? format(selected, 'd MMM yyyy', { locale: uk }) : placeholder}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={isValidDate ? selected : undefined}
            onSelect={handleSelect}
            locale={uk}
            captionLayout="dropdown"
            className="[--cell-size:--spacing(10)]"
          />
        </PopoverContent>
      </Popover>
      {isValidDate && (
        <button
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
