import type { Period } from '@/types/dashboard';

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Тиждень' },
  { value: 'month', label: 'Місяць' },
  { value: 'year', label: 'Рік' },
];

interface PeriodSwitcherProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSwitcher({ value, onChange }: PeriodSwitcherProps) {
  return (
    <div className="inline-flex rounded-lg border bg-white overflow-hidden">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
