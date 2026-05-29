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
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {/* Сегменти — інсет-пігулки */}
      <div
        role="group"
        aria-label="Виберіть період"
        className="inline-flex rounded-lg border bg-card p-0.5 text-xs font-medium"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={period === opt.value}
            onClick={() => onPeriodChange(opt.value)}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              period === opt.value
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Навігація — одна суцільна рамка з роздільниками */}
      <div className="inline-flex items-center rounded-lg border bg-card text-xs font-medium overflow-hidden">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Попередній період"
          className="px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-3 py-1.5 border-x text-center select-none whitespace-nowrap">
          {label}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Наступний період"
          className="px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
