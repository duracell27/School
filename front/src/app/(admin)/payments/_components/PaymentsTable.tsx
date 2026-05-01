'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import { getCountry } from '@/lib/countries';
import { useDeletePayment } from '@/lib/payments';
import { formatCurrency } from '@/lib/format';
import type { Payment } from '@/types/payment';

type SortKey = 'date' | 'child' | 'teacher' | 'amount';
type SortDir = 'asc' | 'desc' | null;

function SortBtn({ label, col, activeCol, dir, onToggle }: {
  label: string; col: SortKey; activeCol: SortKey | null;
  dir: SortDir; onToggle: (c: SortKey) => void;
}) {
  const active = activeCol === col;
  const Icon = active && dir === 'asc' ? ArrowUp : active && dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button onClick={() => onToggle(col)} className="flex items-center gap-1 hover:opacity-80">
      {label} <Icon size={13} className={active ? 'opacity-100' : 'opacity-40'} />
    </button>
  );
}

interface PaymentsTableProps {
  payments: Payment[];
  onEdit: (payment: Payment) => void;
}

export function PaymentsTable({ payments, onEdit }: PaymentsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const deletePayment = useDeletePayment();

  function handleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else if (sortDir === 'desc') { setSortDir(null); setSortKey(null); }
    else setSortDir('asc');
  }

  const sorted = sortKey
    ? [...payments].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortKey === 'child') cmp = a.child.name.localeCompare(b.child.name, 'uk');
        else if (sortKey === 'teacher') cmp = a.teacher.name.localeCompare(b.teacher.name, 'uk');
        else if (sortKey === 'amount') cmp = Number(a.amount) - Number(b.amount);
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : payments;

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><SortBtn label="Дата" col="date" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Дитина" col="child" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Вчитель" col="teacher" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Сума" col="amount" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead>Нотатки</TableHead>
          <TableHead className="text-right">Дії</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(payment => {
          return (
            <TableRow key={payment.id}>
              <TableCell>{fmtDate(payment.date)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <ChildAvatar name={payment.child.name} avatar={payment.child.avatar} size={24} />
                  <span className="font-medium text-sm">{payment.child.name}</span>
                  <span className="text-base">{getCountry(payment.child.country)?.flag ?? payment.child.country}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <UserAvatar name={payment.teacher.name} avatar={payment.teacher.avatar} size={24} />
                  <span className="text-sm">{payment.teacher.name}</span>
                </div>
              </TableCell>
              <TableCell className="font-medium tabular-nums">{formatCurrency(Number(payment.amount))}</TableCell>
              <TableCell className="text-sm text-gray-500 max-w-32 truncate">{payment.notes ?? '—'}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(payment)}>Редагувати</Button>
                <Button
                  variant="destructive" size="sm"
                  onClick={() => setConfirmId(payment.id)}
                  disabled={deletePayment.isPending}
                >
                  Видалити
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {payments.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-gray-400 py-8">Оплат не знайдено</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>

    <AlertDialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити оплату?</AlertDialogTitle>
          <AlertDialogDescription>
            Цю дію неможливо скасувати. Баланс буде перераховано.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { if (confirmId) deletePayment.mutate(confirmId); setConfirmId(null); }}
          >
            Видалити
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
