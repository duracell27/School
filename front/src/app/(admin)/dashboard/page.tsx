'use client';

import { useState, useMemo } from 'react';
import { PeriodSwitcher } from './_components/PeriodSwitcher';
import { NextLessonCard } from './_components/NextLessonCard';
import { SummaryCard } from './_components/SummaryCard';
import { ActiveChildrenCard } from './_components/ActiveChildrenCard';
import { LessonChart } from './_components/LessonChart';
import { ChildrenByCountry } from './_components/ChildrenByCountry';
import { TeachersTable } from './_components/TeachersTable';
import { useDashboardSummary } from '@/lib/dashboard';
import { useSessionStore } from '@/store/session.store';
import type { Period } from '@/types/dashboard';

const UA_MONTHS_LONG = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

function computeReferenceDate(period: Period, offset: number): Date {
  const now = new Date();
  if (period === 'week') {
    const ref = new Date(now);
    ref.setDate(now.getDate() + offset * 7);
    return ref;
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  }
  return new Date(now.getFullYear() + offset, 5, 15);
}

function formatPeriodLabel(period: Period, ref: Date): string {
  if (period === 'year') return ref.getFullYear().toString();
  if (period === 'month') {
    return `${UA_MONTHS_LONG[ref.getMonth()]} ${ref.getFullYear()}`;
  }
  // week — find Monday
  const day = ref.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  if (monday.getMonth() === sunday.getMonth()) {
    const m = monday.toLocaleDateString('uk-UA', { month: 'short' });
    return `${monday.getDate()}–${sunday.getDate()} ${m} ${monday.getFullYear()}`;
  }
  const s = monday.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  const e = sunday.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  return `${s} – ${e} ${sunday.getFullYear()}`;
}

function SummaryCards({ period, date }: { period: Period; date: string }) {
  const { data, isLoading } = useDashboardSummary(period, date);
  return (
    <>
      <SummaryCard
        title="Зароблено"
        amount={data?.earned}
        delta={data?.earnedDelta}
        isLoading={isLoading}
      />
      <SummaryCard
        title="Очікується"
        amount={data?.expected}
        isLoading={isLoading}
      />
    </>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0);
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'ADMIN_TEACHER';

  const referenceDate = useMemo(() => computeReferenceDate(period, offset), [period, offset]);
  const dateParam = [
    referenceDate.getFullYear(),
    String(referenceDate.getMonth() + 1).padStart(2, '0'),
    String(referenceDate.getDate()).padStart(2, '0'),
  ].join('-');
  const periodLabel = useMemo(() => formatPeriodLabel(period, referenceDate), [period, referenceDate]);

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    setOffset(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Дашборд</h2>
        <PeriodSwitcher
          period={period}
          label={periodLabel}
          onPeriodChange={handlePeriodChange}
          onPrev={() => setOffset((o) => o - 1)}
          onNext={() => setOffset((o) => o + 1)}
        />
      </div>

      {/* Top row: 4 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NextLessonCard />
        <SummaryCards period={period} date={dateParam} />
        <ActiveChildrenCard />
      </div>

      {/* Bottom row: chart (2/3) + country breakdown (1/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LessonChart period={period} date={dateParam} />
        <ChildrenByCountry />
      </div>

      {/* Admin-only teacher table */}
      {isAdmin && <TeachersTable period={period} date={dateParam} />}
    </div>
  );
}
