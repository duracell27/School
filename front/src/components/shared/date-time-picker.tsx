'use client';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarPicker } from './calendar-picker';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parse(value: string): { date: string; hour: number; minute: number } {
  if (!value) return { date: '', hour: -1, minute: -1 };
  const [date, time] = value.split('T');
  if (!time) return { date, hour: -1, minute: -1 };
  const [h, m] = time.split(':').map(Number);
  return { date, hour: isNaN(h) ? -1 : h, minute: isNaN(m) ? -1 : m };
}

function build(date: string, hour: number, minute: number): string {
  if (!date || hour < 0 || minute < 0) return '';
  return `${date}T${pad(hour)}:${pad(minute)}`;
}

interface DateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:MM" or ""
  onChange: (value: string) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const { date, hour, minute } = parse(value);

  function handleDate(newDate: string) {
    onChange(build(newDate, hour >= 0 ? hour : 0, minute >= 0 ? minute : 0));
  }

  function handleHour(v: string | null) {
    const h = parseInt(v ?? '0');
    onChange(build(date, h, minute >= 0 ? minute : 0));
  }

  function handleMinute(v: string | null) {
    const m = parseInt(v ?? '0');
    onChange(build(date, hour >= 0 ? hour : 0, m));
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <CalendarPicker value={date} onChange={handleDate} />
      <Select value={hour >= 0 ? String(hour) : ''} onValueChange={handleHour}>
        <SelectTrigger className="h-9 w-[60px]">
          <SelectValue>{hour >= 0 ? pad(hour) : '--'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>{pad(h)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-gray-400 text-sm font-medium select-none">:</span>
      <Select value={minute >= 0 ? String(minute) : ''} onValueChange={handleMinute}>
        <SelectTrigger className="h-9 w-[60px]">
          <SelectValue>{minute >= 0 ? pad(minute) : '--'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>{pad(m)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
