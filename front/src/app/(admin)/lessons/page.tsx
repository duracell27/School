'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlidersHorizontal } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { LessonsTable } from '@/components/lessons/lessons-table';
import { LessonModal } from '@/components/lessons/lesson-modal';
import { LessonNoteModal } from '@/components/lessons/lesson-note-modal';
import { DeleteDialog } from '@/components/lessons/delete-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLessonsPaginated } from '@/lib/lessons';
import type { Lesson, LessonStatus, PaymentStatus } from '@/types/lesson';

const LIMIT = 20;

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; lesson: Lesson };

type DeleteState = { open: false } | { open: true; lesson: Lesson };

export default function LessonsPage() {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<LessonStatus | ''>('');
  const [paymentFilter, setPaymentFilter] = useState<NonNullable<PaymentStatus> | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data: result, isLoading, error } = useLessonsPaginated({ date: date || undefined, page, limit: LIMIT });

  const lessons = result?.data ?? [];
  const filtered = lessons.filter((l) => {
    if (search.trim() && !l.child.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (statusFilter && l.status !== statusFilter) return false;
    if (paymentFilter && l.paymentStatus !== paymentFilter) return false;
    return true;
  });

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [pendingNoteModal, setPendingNoteModal] = useState<{ lessonId: string } | null>(null);

  function handleDateChange(val: string) {
    setDate(val);
    setPage(1);
  }

  if (isLoading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">Помилка завантаження уроків</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Уроки{' '}
          <span className="text-sm font-normal text-gray-400">({result?.total ?? 0})</span>
        </h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>+ Додати урок</Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Пошук по учню..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:w-56 sm:flex-none"
          />
          <DatePicker
            value={date}
            onChange={handleDateChange}
            placeholder="Дата заняття"
            className="flex-1 sm:w-44 sm:flex-none"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={showFilters || statusFilter || paymentFilter ? 'border-gray-400' : ''}
          >
            <SlidersHorizontal size={14} className="mr-1.5" />
            Фільтри
            {(statusFilter || paymentFilter) && (
              <span className="ml-1.5 size-1.5 rounded-full bg-gray-700 inline-block" />
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as LessonStatus | ''); setPage(1); }}>
              <SelectTrigger className="flex-1 sm:w-40 sm:flex-none">
                <SelectValue placeholder="Всі статуси" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Всі статуси</SelectItem>
                <SelectItem value="PLANNED">Заплановано</SelectItem>
                <SelectItem value="CONDUCTED">Проведено</SelectItem>
                <SelectItem value="CANCELLED">Скасовано</SelectItem>
                <SelectItem value="RESCHEDULED">Перенесено</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v as NonNullable<PaymentStatus> | ''); setPage(1); }}>
              <SelectTrigger className="flex-1 sm:w-40 sm:flex-none">
                <SelectValue placeholder="Всі оплати" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Всі оплати</SelectItem>
                <SelectItem value="PAID">Оплачено</SelectItem>
                <SelectItem value="UNPAID">Не оплачено</SelectItem>
                <SelectItem value="PREPAID">Передоплачено</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border">
        <LessonsTable
          lessons={filtered}
          onEdit={(lesson) => setModal({ open: true, mode: 'edit', lesson })}
          onDelete={(lesson) => setDeleteState({ open: true, lesson })}
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
      </div>
      <LessonModal
        open={modal.open}
        lesson={modal.open && modal.mode === 'edit' ? modal.lesson : undefined}
        onClose={() => setModal({ open: false })}
        onSaved={(newStatus, prevStatus) => {
          if (newStatus === 'CONDUCTED' && prevStatus !== 'CONDUCTED' && modal.open && modal.mode === 'edit') {
            setPendingNoteModal({ lessonId: modal.lesson.id });
          }
        }}
      />
      {pendingNoteModal && (
        <LessonNoteModal
          open={true}
          onClose={() => setPendingNoteModal(null)}
          lessonId={pendingNoteModal.lessonId}
          mode="create"
          onSaved={() => setPendingNoteModal(null)}
        />
      )}
      <DeleteDialog
        open={deleteState.open}
        lesson={deleteState.open ? deleteState.lesson : null}
        onClose={() => setDeleteState({ open: false })}
      />
    </div>
  );
}
