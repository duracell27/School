'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChildAvatar } from '@/components/children/child-avatar';
import { useChildBalances } from '@/lib/lessons';

export function TopDebtorCard() {
  const { data: balances = [], isLoading } = useChildBalances();

  const topDebtor = balances
    .filter((b) => b.debtCount > 0 || b.debtUah > 0)
    .sort((a, b) => (b.debtCount - a.debtCount) || (b.debtUah - a.debtUah))[0] ?? null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Найбільший боржник</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        ) : topDebtor ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <ChildAvatar name={topDebtor.child.name} avatar={topDebtor.child.avatar} size={22} />
              <p className="font-semibold text-sm truncate">{topDebtor.child.name}</p>
            </div>
            <p className="text-2xl font-bold text-red-500">{topDebtor.debtCount} зан.</p>
            {topDebtor.debtUah > 0 && (
              <p className="text-xs text-red-400 mt-0.5">{topDebtor.debtUah} грн недоплата</p>
            )}
          </>
        ) : (
          <>
            <p className="text-2xl">🤝</p>
            <p className="text-xs text-gray-400 mt-1">Боржників немає</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
