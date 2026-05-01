'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface SummaryCardProps {
  title: string;
  amount?: number | undefined;
  count?: number | undefined;
  delta?: number | null;
  isLoading?: boolean;
}

export function SummaryCard({ title, amount, count, delta, isLoading }: SummaryCardProps) {
  const isReady = !isLoading && (amount !== undefined || count !== undefined);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!isReady ? (
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        ) : (
          <>
            <p className="text-2xl font-bold">
              {count !== undefined ? count : formatCurrency(amount!)}
            </p>
            {delta !== undefined && delta !== null && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'
              }`}>
                {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                <span>{delta > 0 ? '+' : ''}{delta}% vs попередній період</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
