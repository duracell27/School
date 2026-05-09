import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Period } from '@/types/dashboard';

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Тиждень' },
  { value: 'month', label: 'Місяць' },
  { value: 'year', label: 'Рік' },
];

interface PeriodSwitcherProps {
  period: Period;
  label: string;
  onPeriodChange: (p: Period) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function PeriodSwitcher({ period, label, onPeriodChange, onPrev, onNext }: PeriodSwitcherProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <div role="group" aria-label="Виберіть період" className="inline-flex rounded-lg border bg-white overflow-hidden">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={period === opt.value}
            onClick={() => onPeriodChange(opt.value)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              period === opt.value
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Попередній період"
          className="p-1.5 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium w-44 text-center select-none">{label}</span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Наступний період"
          className="p-1.5 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
