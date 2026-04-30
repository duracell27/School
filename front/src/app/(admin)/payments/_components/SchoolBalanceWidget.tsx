'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSchoolAccount } from '@/lib/payments';
import { formatCurrency } from '@/lib/format';

const REASON_LABELS: Record<string, string> = {
  OVERPAYMENT_WRITEOFF: 'Списання залишку',
  UNDERPAYMENT_TOPUP: 'Поповнення оплати',
  LESSON_SCHOOL_SHARE: 'Частка школи з уроку',
};

export function SchoolBalanceWidget() {
  const { data, isLoading } = useSchoolAccount();
  const [expanded, setExpanded] = useState(false);

  const balance = data?.balance ?? 0;
  const isNegative = balance < 0;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-gray-500">Рахунок школи</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setExpanded(v => !v)} className="text-xs h-6 px-2">
          {expanded ? 'Сховати' : 'Операції'}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className={`text-xl font-bold ${isNegative ? 'text-red-600' : 'text-green-700'}`}>
            {formatCurrency(balance)}
          </p>
        )}

        {expanded && data && data.transactions.length > 0 && (
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto border-t pt-2">
            {data.transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between text-xs text-gray-600">
                <span className="text-gray-400 w-28 shrink-0">
                  {new Date(tx.createdAt).toLocaleDateString('uk-UA')} · {tx.admin.name}
                </span>
                <span className="flex-1 px-2">{REASON_LABELS[tx.reason] ?? tx.reason}</span>
                <span className={`font-medium tabular-nums ${Number(tx.amount) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {Number(tx.amount) > 0 ? '+' : ''}{formatCurrency(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
        {expanded && data && data.transactions.length === 0 && (
          <p className="mt-2 text-xs text-gray-400">Операцій немає</p>
        )}
      </CardContent>
    </Card>
  );
}
