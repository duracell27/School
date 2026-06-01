'use client';

import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import { getCountry } from '@/lib/countries';
import { useChildBalances } from '@/lib/lessons';
import { Zap } from 'lucide-react';

interface ChildBalanceWidgetProps {
  onQuickPay?: (childId: string, teacherId: string, debtCount: number, debtUah: number) => void;
}

export function ChildBalanceWidget({ onQuickPay }: ChildBalanceWidgetProps) {
  const { data: balances = [], isLoading } = useChildBalances();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 md:flex md:gap-3 md:flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (balances.length === 0) return null;

  const sorted = [...balances].sort((a, b) => {
    const score = (x: typeof a) => {
      if (x.debtCount > 0 || x.debtUah > 0)
        return -(x.debtUah + x.debtCount * 100);            // negative → debts first, largest most negative
      if (x.prepaidCount > 0 || x.leftoverUah > 0)
        return 1e6 - (x.leftoverUah + x.prepaidCount * 100); // ~1M minus value → largest prepaid first
      return 2e6;                                            // settled last
    };
    return score(a) - score(b);
  });

  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:gap-3 md:flex-wrap">
      {sorted.map(({ child, teacher, debtCount, debtUah, prepaidCount, leftoverUah }) => {
        const isDebt = debtCount > 0 || debtUah > 0;
        const isPrepaid = prepaidCount > 0;
        const hasLeftover = leftoverUah > 0;
        const isZero = !isDebt && !isPrepaid && !hasLeftover;

        return (
          <div
            key={`${child.id}:${teacher.id}`}
            className="flex flex-col gap-2 rounded-xl border bg-card px-3 py-3 md:min-w-[170px] md:px-4"
          >
            <div className="flex items-center gap-2">
              <ChildAvatar name={child.name} avatar={child.avatar} size={28} />
              <span className="text-sm font-semibold leading-tight">{child.name}</span>
              <span className="text-base">{getCountry(child.country)?.flag ?? child.country}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserAvatar name={teacher.name} avatar={teacher.avatar} size={22} />
              <span className="text-xs text-gray-500 leading-tight">{teacher.name}</span>
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {isDebt && (
                <span className="text-sm font-bold text-red-500">
                  -{debtCount} <span className="font-normal">заборговано</span>
                </span>
              )}
              {isDebt && debtUah > 0 && (
                <span className="text-sm font-bold text-red-400">
                  -{debtUah} грн <span className="font-normal text-xs text-red-400">недоплата</span>
                </span>
              )}
              {isPrepaid && (
                <span className="text-sm font-bold text-primary">
                  +{prepaidCount} <span className="font-normal">переплачено</span>
                </span>
              )}
              {hasLeftover && (
                <span className="text-sm font-bold text-amber-600">
                  +{leftoverUah} грн <span className="font-normal text-xs text-amber-500">залишок</span>
                </span>
              )}
              {isZero && (
                <span className="text-xl" title="Розрахунок в порядку">🤝</span>
              )}
            </div>
            {isDebt && onQuickPay && (
              <button
                onClick={() => onQuickPay(child.id, teacher.id, debtCount, debtUah)}
                className="mt-1 flex items-center gap-1 text-xs text-primary font-medium hover:bg-accent px-2 py-1 rounded-md transition-colors -mx-1"
              >
                <Zap size={11} />
                Оплатити
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
