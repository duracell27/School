'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LessonsTable } from '@/components/lessons/lessons-table';
import { LessonModal } from '@/components/lessons/lesson-modal';
import { DeleteDialog } from '@/components/lessons/delete-dialog';
import { useLessons } from '@/lib/lessons';
import type { Lesson } from '@/types/lesson';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; lesson: Lesson };

type DeleteState = { open: false } | { open: true; lesson: Lesson };

export default function LessonsPage() {
  const { data: lessons = [], isLoading, error } = useLessons();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

  if (isLoading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">Помилка завантаження уроків</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Уроки{' '}
          <span className="text-sm font-normal text-gray-400">({lessons.length})</span>
        </h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>+ Додати урок</Button>
      </div>
      <div className="bg-white rounded-lg border">
        <LessonsTable
          lessons={lessons}
          onEdit={(lesson) => setModal({ open: true, mode: 'edit', lesson })}
          onDelete={(lesson) => setDeleteState({ open: true, lesson })}
        />
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
