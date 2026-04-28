'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SchoolBalanceWidget } from './_components/SchoolBalanceWidget';
import { ChildBalanceWidget } from './_components/ChildBalanceWidget';
import { PaymentsTable } from './_components/PaymentsTable';
import { PaymentModal } from './_components/PaymentModal';
import { usePayments } from '@/lib/payments';
import { useUsers } from '@/lib/users';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Payment } from '@/types/payment';

export default function PaymentsPage() {
  const { data: users = [] } = useUsers();
  const teachers = users.filter(u => u.status === 'WORKING');

  const [teacherFilter, setTeacherFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; payment?: Payment }>({ open: false });

  const { data: payments = [], isLoading } = usePayments({
    teacherId: teacherFilter || undefined,
    from: fromFilter || undefined,
    to: toFilter || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Оплати <span className="text-sm font-normal text-gray-400">({payments.length})</span>
        </h2>
        <Button onClick={() => setModal({ open: true })}>+ Додати оплату</Button>
      </div>

      <SchoolBalanceWidget />

      <ChildBalanceWidget />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={teacherFilter} onValueChange={v => setTeacherFilter(v ?? '')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Всі вчителі">
              {teacherFilter
                ? teachers.find(u => u.id === teacherFilter)?.name
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Всі вчителі</SelectItem>
            {teachers.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Від</span>
          <Input
            type="date"
            value={fromFilter}
            onChange={e => setFromFilter(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">До</span>
          <Input
            type="date"
            value={toFilter}
            onChange={e => setToFilter(e.target.value)}
            className="w-36"
          />
        </div>
        {(teacherFilter || fromFilter || toFilter) && (
          <Button variant="outline" size="sm" onClick={() => { setTeacherFilter(''); setFromFilter(''); setToFilter(''); }}>
            Скинути
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <p className="text-gray-500 p-6">Завантаження...</p>
        ) : (
          <PaymentsTable
            payments={payments}
            onEdit={payment => setModal({ open: true, payment })}
          />
        )}
      </div>

      <PaymentModal
        open={modal.open}
        payment={modal.payment}
        onClose={() => setModal({ open: false })}
      />
    </div>
  );
}
