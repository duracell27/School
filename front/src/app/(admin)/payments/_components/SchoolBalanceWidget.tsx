'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSchoolAccount, useFinancialSummary } from '@/lib/payments';
import { formatCurrency } from '@/lib/format';

const REASON_LABELS: Record<string, string> = {
  OVERPAYMENT_WRITEOFF: 'Списання залишку',
  UNDERPAYMENT_TOPUP: 'Поповнення оплати',
  LESSON_SCHOOL_SHARE: 'Оплата за заняття',
  TEACHER_PAYOUT: 'Виплата вчителю',
};

export function SchoolBalanceWidget() {
  const { data: account, isLoading: accountLoading } = useSchoolAccount();
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary();
  const [expanded, setExpanded] = useState(false);

  const isLoading = accountLoading || summaryLoading;
  const balance = summary?.schoolBalance ?? 0;
  const isNegative = balance < 0;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-gray-500">Рахунок школи</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setExpanded(v => !v)} className="text-xs h-6 px-2">
          {expanded ? 'Сховати' : 'Операції'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-7 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-foreground'}`}>
              {formatCurrency(balance)}
            </p>

            <div className="grid grid-cols-3 gap-3 pt-1 border-t">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Зароблено вчителями</p>
                <p className="text-sm font-medium">{formatCurrency(summary?.teacherEarnings ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Аванси учнів</p>
                <p className="text-sm font-medium text-sky-600">{formatCurrency(summary?.studentAdvances ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Борги учнів</p>
                <p className="text-sm font-medium text-red-500">{formatCurrency(summary?.studentDebts ?? 0)}</p>
              </div>
            </div>
          </>
        )}

        {expanded && account && account.transactions.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto border-t pt-2">
            {account.transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between text-xs text-gray-600">
                <span className="text-gray-400 w-28 shrink-0">
                  {new Date(tx.createdAt).toLocaleDateString('uk-UA')}{tx.admin ? ` · ${tx.admin.name}` : ''}
                </span>
                <span className="flex-1 px-2">{REASON_LABELS[tx.reason] ?? tx.reason}</span>
                <span className={`font-medium tabular-nums ${Number(tx.amount) >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                  {Number(tx.amount) > 0 ? '+' : ''}{formatCurrency(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
        {expanded && account && account.transactions.length === 0 && (
          <p className="text-xs text-gray-400 border-t pt-2">Операцій немає</p>
        )}
      </CardContent>
    </Card>
  );
}
