'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SchoolBalanceWidget } from './_components/SchoolBalanceWidget';
import { ChildBalanceWidget } from './_components/ChildBalanceWidget';
import { PaymentsTable } from './_components/PaymentsTable';
import { PaymentModal } from './_components/PaymentModal';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePayments } from '@/lib/payments';
import { useUsers } from '@/lib/users';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Payment } from '@/types/payment';

const LIMIT = 20;

export default function PaymentsPage() {
  const { data: users = [] } = useUsers();
  const teachers = users.filter(u => u.status === 'WORKING');

  const [teacherFilter, setTeacherFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; payment?: Payment }>({ open: false });

  const { data: result, isLoading } = usePayments({
    teacherId: teacherFilter || undefined,
    from: fromFilter || undefined,
    to: toFilter || undefined,
    page,
    limit: LIMIT,
  });

  const payments = result?.data ?? [];

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Оплати <span className="text-sm font-normal text-gray-400">({result?.total ?? 0})</span>
        </h2>
        <Button onClick={() => setModal({ open: true })}>+ Додати оплату</Button>
      </div>

      <SchoolBalanceWidget />

      <ChildBalanceWidget />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={teacherFilter} onValueChange={v => handleFilterChange(() => setTeacherFilter(v ?? ''))}>
          <SelectTrigger className="w-full sm:w-48">
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
            lang="uk-UA"
            value={fromFilter}
            onChange={e => handleFilterChange(() => setFromFilter(e.target.value))}
            className="w-full sm:w-36"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">До</span>
          <Input
            type="date"
            lang="uk-UA"
            value={toFilter}
            onChange={e => handleFilterChange(() => setToFilter(e.target.value))}
            className="w-full sm:w-36"
          />
        </div>
        {(teacherFilter || fromFilter || toFilter) && (
          <Button variant="outline" size="sm" onClick={() => handleFilterChange(() => { setTeacherFilter(''); setFromFilter(''); setToFilter(''); })}>
            Скинути
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <p className="text-gray-500 p-6">Завантаження...</p>
        ) : (
          <>
            <PaymentsTable
              payments={payments}
              onEdit={payment => setModal({ open: true, payment })}
            />
            {result && (
              <PaginationControls
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                limit={LIMIT}
                onPage={setPage}
              />
            )}
          </>
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
