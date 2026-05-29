'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useDashboardSummary } from '@/lib/dashboard';
import { formatCurrency } from '@/lib/format';
import type { Period } from '@/types/dashboard';

interface AvgCheckCardProps {
  period: Period;
  date: string;
}

export function AvgCheckCard({ period, date }: AvgCheckCardProps) {
  const { data, isLoading } = useDashboardSummary(period, date);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">Середній чек</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        ) : data?.avgCheck == null ? (
          <p className="text-sm text-gray-400">Немає даних</p>
        ) : (
          <>
            <p className="text-2xl font-bold">{formatCurrency(data.avgCheck)}</p>
            <p className="text-xs text-gray-400 mt-0.5">55-хв уроки</p>
            {data.avgCheckDelta !== null && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                data.avgCheckDelta > 0 ? 'text-sky-600' : data.avgCheckDelta < 0 ? 'text-red-500' : 'text-gray-400'
              }`}>
                {data.avgCheckDelta > 0 ? <TrendingUp size={12} /> : data.avgCheckDelta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                <span>{data.avgCheckDelta > 0 ? '+' : ''}{data.avgCheckDelta}% vs попередній</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
