'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardSummary } from '@/lib/dashboard';
import type { Period } from '@/types/dashboard';

interface LessonRatioCardProps {
  period: Period;
  date: string;
}

export function LessonRatioCard({ period, date }: LessonRatioCardProps) {
  const { data, isLoading } = useDashboardSummary(period, date);

  const conducted = data?.conductedCount ?? 0;
  const cancelled = data?.cancelledCount ?? 0;
  const total = conducted + cancelled;
  const conductedPct = total === 0 ? 0 : Math.round((conducted / total) * 100);
  const cancelledPct = total === 0 ? 0 : 100 - conductedPct;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">Статус уроків</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        ) : (
          <>
            {total === 0 ? (
              <p className="text-sm text-gray-400">Немає даних</p>
            ) : (
              <>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-bold text-foreground">{conductedPct}%</span>
                  <span className="text-sm text-gray-400 mb-0.5">проведено</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${conductedPct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                  <span>{conducted} проведено</span>
                  <span>{cancelled} скасовано</span>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
