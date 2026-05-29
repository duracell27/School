'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTHS = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

function pad(n: number) { return String(n).padStart(2, '0'); }

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

// Returns 0=Mon … 6=Sun for the 1st of the month
function firstWeekday(y: number, m: number) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

interface CalendarPickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
}

export function CalendarPicker({ value, onChange }: CalendarPickerProps) {
  const today = new Date();
  const sel = value ? new Date(value + 'T00:00') : null;

  const [viewY, setViewY] = useState(sel?.getFullYear() ?? today.getFullYear());
  const [viewM, setViewM] = useState(sel?.getMonth() ?? today.getMonth());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function away(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  function prev() {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); }
    else setViewM(m => m - 1);
  }
  function next() {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); }
    else setViewM(m => m + 1);
  }

  function pick(day: number) {
    onChange(`${viewY}-${pad(viewM + 1)}-${pad(day)}`);
    setOpen(false);
  }

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const displayText = value
    ? new Date(value + 'T00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Оберіть дату';

  const offset = firstWeekday(viewY, viewM);
  const days = daysInMonth(viewY, viewM);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-input bg-transparent text-sm text-left hover:bg-muted transition-colors w-40"
      >
        <Calendar size={14} className="text-gray-400 shrink-0" />
        <span className={value ? 'text-foreground' : 'text-muted-foreground truncate'}>{displayText}</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 bg-popover border border-input rounded-lg shadow-lg p-3 w-60">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prev} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-semibold">{MONTHS[viewM]} {viewY}</span>
            <button type="button" onClick={next} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] text-gray-400 font-semibold py-0.5">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1;
              const dayStr = `${viewY}-${pad(viewM + 1)}-${pad(day)}`;
              const isSelected = dayStr === value;
              const isToday = dayStr === todayStr;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  className={[
                    'w-full aspect-square text-xs rounded flex items-center justify-center transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground font-semibold' :
                    isToday ? 'border border-primary/40 text-primary font-semibold hover:bg-accent' :
                    'hover:bg-gray-100',
                  ].join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
