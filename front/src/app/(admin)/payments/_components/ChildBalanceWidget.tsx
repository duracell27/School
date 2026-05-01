'use client';

import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import { getCountry } from '@/lib/countries';
import { useChildBalances } from '@/lib/lessons';

export function ChildBalanceWidget() {
  const { data: balances = [], isLoading } = useChildBalances();

  if (isLoading) {
    return (
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 w-48 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (balances.length === 0) return null;

  return (
    <div className="flex gap-3 flex-wrap">
      {balances.map(({ child, teacher, debtCount, debtUah, prepaidCount, leftoverUah }) => {
        const isDebt = debtCount > 0 || debtUah > 0;
        const isPrepaid = prepaidCount > 0;
        const hasLeftover = leftoverUah > 0;
        const isZero = !isDebt && !isPrepaid && !hasLeftover;

        return (
          <div
            key={`${child.id}:${teacher.id}`}
            className="flex flex-col gap-2 rounded-xl border bg-white px-4 py-3 min-w-[170px]"
          >
            <div className="flex items-center gap-2">
              <ChildAvatar name={child.name} avatar={child.avatar} size={28} />
              <span className="text-sm font-medium leading-tight">{child.name}</span>
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
                <span className="text-sm font-bold text-green-600">
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
          </div>
        );
      })}
    </div>
  );
}
