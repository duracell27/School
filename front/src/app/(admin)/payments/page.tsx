'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';
import { SchoolBalanceWidget } from './_components/SchoolBalanceWidget';
import { ChildBalanceWidget } from './_components/ChildBalanceWidget';
import { PaymentsTable } from './_components/PaymentsTable';
import { PaymentModal } from './_components/PaymentModal';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePayments } from '@/lib/payments';
import { useUsers } from '@/lib/users';
import { useChildren } from '@/lib/children';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import type { Payment } from '@/types/payment';

const LIMIT = 20;

export default function PaymentsPage() {
  const { data: users = [] } = useUsers();
  const { data: children = [] } = useChildren();
  const teachers = users.filter(u => u.status === 'WORKING');

  const [teacherFilter, setTeacherFilter] = useState('');
  const [childFilter, setChildFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; payment?: Payment }>({ open: false });

  const hasActiveFilters = !!(teacherFilter || childFilter || fromFilter || toFilter);

  const { data: result, isLoading } = usePayments({
    teacherId: teacherFilter || undefined,
    childId: childFilter || undefined,
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

  function resetFilters() {
    handleFilterChange(() => {
      setTeacherFilter('');
      setChildFilter('');
      setFromFilter('');
      setToFilter('');
    });
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

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={showFilters || hasActiveFilters ? 'border-gray-400' : ''}
          >
            <SlidersHorizontal size={14} className="mr-1.5" />
            Фільтри
            {hasActiveFilters && (
              <span className="ml-1.5 size-1.5 rounded-full bg-gray-700 inline-block" />
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-400">
              Скинути
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="flex gap-3 flex-wrap">
            <Select value={teacherFilter} onValueChange={v => handleFilterChange(() => setTeacherFilter(v ?? ''))}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Всі вчителі" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Всі вчителі</SelectItem>
                {teachers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={childFilter} onValueChange={v => handleFilterChange(() => setChildFilter(v ?? ''))}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Всі діти" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Всі діти</SelectItem>
                {children.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              value={fromFilter}
              onChange={v => handleFilterChange(() => setFromFilter(v))}
              placeholder="Від"
              className="w-full sm:w-36"
            />
            <DatePicker
              value={toFilter}
              onChange={v => handleFilterChange(() => setToFilter(v))}
              placeholder="До"
              className="w-full sm:w-36"
            />
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border">
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
