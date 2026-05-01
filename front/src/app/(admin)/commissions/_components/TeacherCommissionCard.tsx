'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { UserAvatar } from '@/components/users/user-avatar';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { useTeacherPayouts, useDeletePayout } from '@/lib/commissions';
import { CommissionRateModal } from './CommissionRateModal';
import { PayoutModal } from './PayoutModal';
import type { TeacherWithBalance, TeacherPayout } from '@/types/commission';

interface Props {
  teacher: TeacherWithBalance;
}

export function TeacherCommissionCard({ teacher }: Props) {
  const { id, name, avatar, balance } = teacher;
  const [rateOpen, setRateOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [editPayout, setEditPayout] = useState<TeacherPayout | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { data: payouts = [], isLoading: payoutsLoading } = useTeacherPayouts(expanded ? id : '');
  const deletePayout = useDeletePayout();

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function handleDelete(payoutId: string) {
    if (confirmDeleteId === payoutId) {
      deletePayout.mutate(payoutId, { onSuccess: () => setConfirmDeleteId(null) });
    } else {
      setConfirmDeleteId(payoutId);
    }
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

      <div className="flex gap-6 text-sm flex-wrap">
        <div>
          <p className="text-xs text-gray-400">Офіційно нараховано</p>
          <p className={`font-semibold ${balance.balance <= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(balance.balance)}
          </p>
          <p className="text-xs text-gray-400">{formatCurrency(balance.officialEarnings)} − {formatCurrency(balance.totalPayout)}</p>
        </div>
        {balance.potentialEarnings > 0 && (
          <div>
            <p className="text-xs text-gray-400">Ще не нараховано</p>
            <p className="font-semibold text-amber-500">
              +{formatCurrency(balance.potentialEarnings)}
            </p>
            <p className="text-xs text-gray-400">уроки без офіційного нарахування</p>
          </div>
        )}
        {balance.totalRevenue > 0 && (
          <div>
            <p className="text-xs text-gray-400">Приніс школі</p>
            <p className="font-semibold text-blue-600">{formatCurrency(balance.schoolRevenue)}</p>
            <p className="text-xs text-gray-400">{balance.conductedLessonsCount} проведених занять</p>
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
              <div key={p.id} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                <span className="text-gray-400 w-20 shrink-0">{fmtDate(p.createdAt)}</span>
                <span className="font-medium w-20 shrink-0">{formatCurrency(Number(p.amount))}</span>
                {p.notes && (
                  <span className="text-gray-400 truncate flex-1">{p.notes}</span>
                )}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  {confirmDeleteId === p.id ? (
                    <>
                      <button
                        className="text-red-500 text-[11px] font-medium hover:underline"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletePayout.isPending}
                      >
                        Так
                      </button>
                      <button
                        className="text-gray-400 text-[11px] hover:underline"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Ні
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                        onClick={() => { setEditPayout(p); setConfirmDeleteId(null); }}
                        title="Редагувати"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => handleDelete(p.id)}
                        title="Видалити"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
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
        open={payoutOpen || !!editPayout}
        payout={editPayout ?? undefined}
        onClose={() => { setPayoutOpen(false); setEditPayout(null); }}
      />
    </div>
  );
}
