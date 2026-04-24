'use client';

import { useState } from 'react';
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

function SummaryCards({ period }: { period: Period }) {
  const { data, isLoading } = useDashboardSummary(period);
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
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Дашборд</h2>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>

      {/* Top row: 4 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NextLessonCard />
        <SummaryCards period={period} />
        <ActiveChildrenCard />
      </div>

      {/* Bottom row: chart (2/3) + country breakdown (1/3) */}
      <div className="grid grid-cols-3 gap-4">
        <LessonChart period={period} />
        <ChildrenByCountry />
      </div>

      {/* Admin-only teacher table */}
      {isAdmin && (
        <div className="grid grid-cols-1">
          <TeachersTable period={period} />
        </div>
      )}
    </div>
  );
}
