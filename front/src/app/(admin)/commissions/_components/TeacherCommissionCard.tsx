'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/users/user-avatar';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { useTeacherPayouts } from '@/lib/commissions';
import { CommissionRateModal } from './CommissionRateModal';
import { PayoutModal } from './PayoutModal';
import type { TeacherWithBalance } from '@/types/commission';

interface Props {
  teacher: TeacherWithBalance;
}

export function TeacherCommissionCard({ teacher }: Props) {
  const { id, name, avatar, balance } = teacher;
  const [rateOpen, setRateOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { data: payouts = [], isLoading: payoutsLoading } = useTeacherPayouts(expanded ? id : '');

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar name={name} avatar={avatar} size={36} />
          <div>
            <p className="font-medium text-sm">{name}</p>
            {balance.currentCommission !== null && (
              <p className="text-xs text-gray-400">{balance.currentCommission}% комісія</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRateOpen(true)}>
            Ставка
          </Button>
          <Button size="sm" onClick={() => setPayoutOpen(true)}>
            Виплатити
          </Button>
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <div>
          <p className="text-xs text-gray-400">Офіційно нараховано</p>
          <p className={`font-semibold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(balance.balance)}
          </p>
          <p className="text-xs text-gray-400">{formatCurrency(balance.officialEarnings)} − {formatCurrency(balance.totalPayout)}</p>
        </div>
        {balance.potentialEarnings > 0 && (
          <div>
            <p className="text-xs text-gray-400">Потенційно</p>
            <p className="font-semibold text-gray-400">
              +{formatCurrency(balance.potentialEarnings)}
            </p>
            <p className="text-xs text-gray-400">за непідтверджені заняття</p>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-blue-500 h-auto p-0"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? 'Згорнути' : 'Історія виплат'}
      </Button>

      {expanded && (
        <div className="space-y-1">
          {payoutsLoading ? (
            <p className="text-xs text-gray-400">Завантаження...</p>
          ) : payouts.length === 0 ? (
            <p className="text-xs text-gray-400">Виплат немає</p>
          ) : (
            payouts.map(p => (
              <div key={p.id} className="flex justify-between text-xs text-gray-600">
                <span>{fmtDate(p.createdAt)}</span>
                <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                <span className="text-gray-400 truncate max-w-[120px]">{p.notes ?? '—'}</span>
              </div>
            ))
          )}
        </div>
      )}

      <CommissionRateModal
        teacherId={id}
        open={rateOpen}
        onClose={() => setRateOpen(false)}
      />
      <PayoutModal
        teacherId={id}
        teacherName={name}
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
      />
    </div>
  );
}
