'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardSummary } from '@/lib/dashboard';
import type { Period } from '@/types/dashboard';

interface CancellationSidesCardProps {
  period: Period;
  date: string;
}

export function CancellationSidesCard({ period, date }: CancellationSidesCardProps) {
  const { data, isLoading } = useDashboardSummary(period, date);

  const byStudent = data?.cancelledByStudent ?? 0;
  const byTeacher = data?.cancelledByTeacher ?? 0;
  const total = byStudent + byTeacher;

  const studentPct = total === 0 ? 0 : Math.round((byStudent / total) * 100);
  const teacherPct = total === 0 ? 0 : 100 - studentPct;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Причина скасувань</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        ) : total === 0 ? (
          <p className="text-sm text-gray-400">Немає скасувань</p>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold text-foreground">{studentPct}%</span>
              <span className="text-sm text-gray-400 mb-0.5">учень</span>
            </div>

            {/* Stacked bar: student (blue) | teacher (orange) */}
            <div className="w-full h-2 rounded-full bg-orange-300 overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${studentPct}%` }}
              />
            </div>

            <div className="flex justify-between mt-1.5 text-xs text-gray-400">
              <span>👤 {byStudent} учень</span>
              <span>🧑‍🏫 {byTeacher} вчитель</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
