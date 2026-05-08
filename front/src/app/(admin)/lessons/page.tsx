'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LessonsTable } from '@/components/lessons/lessons-table';
import { LessonModal } from '@/components/lessons/lesson-modal';
import { DeleteDialog } from '@/components/lessons/delete-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLessonsPaginated } from '@/lib/lessons';
import type { Lesson } from '@/types/lesson';

const LIMIT = 20;

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; lesson: Lesson };

type DeleteState = { open: false } | { open: true; lesson: Lesson };

export default function LessonsPage() {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);

  const { data: result, isLoading, error } = useLessonsPaginated({ date: date || undefined, page, limit: LIMIT });

  const lessons = result?.data ?? [];
  const filtered = search.trim()
    ? lessons.filter((l) => l.child.name.toLowerCase().includes(search.trim().toLowerCase()))
    : lessons;

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

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

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Пошук по учню..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <div className="flex items-center gap-2">
          <div className="relative" lang="uk-UA">
            <label className="absolute -top-2 left-2 text-[10px] text-gray-400 bg-white px-0.5 pointer-events-none">
              Дата заняття
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              lang="uk-UA"
              className="flex h-9 w-44 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {date && (
            <Button variant="outline" size="sm" onClick={() => handleDateChange('')}>✕</Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border">
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
      />
      <DeleteDialog
        open={deleteState.open}
        lesson={deleteState.open ? deleteState.lesson : null}
        onClose={() => setDeleteState({ open: false })}
      />
    </div>
  );
}
