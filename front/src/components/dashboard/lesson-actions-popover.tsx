'use client';

import { useRef, useEffect, useState } from 'react';
import { useUpdateLesson, useDeleteLesson, useCreateLesson } from '@/lib/lessons';
import { LessonNoteModal } from '@/components/lessons/lesson-note-modal';
import { CancellationModal } from '@/components/lessons/cancellation-modal';
import type { CancellationSide, Lesson } from '@/types/lesson';

interface LessonActionsPopoverProps {
  lesson: Lesson;
  anchorRect: DOMRect;
  onClose: () => void;
  onEdit: (lesson: Lesson) => void;
}

const POPOVER_HEIGHT = 280;

export function LessonActionsPopover({ lesson, anchorRect, onClose, onEdit }: LessonActionsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const createLesson = useCreateLesson();
  const [noteModal, setNoteModal] = useState<'create' | 'view' | null>(null);
  const [cancellationModal, setCancellationModal] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (noteModal || cancellationModal) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, noteModal, cancellationModal]);

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const showAbove = spaceBelow < POPOVER_HEIGHT;
  const top = showAbove
    ? anchorRect.top + window.scrollY - POPOVER_HEIGHT - 4
    : anchorRect.bottom + window.scrollY + 4;
  const left = anchorRect.left + window.scrollX;

  async function markConducted() {
    setNoteModal('create');
  }

  async function handleNoteSaved() {
    await updateLesson.mutateAsync({ id: lesson.id, data: { status: 'CONDUCTED' } });
    setNoteModal(null);
    onClose();
  }

  async function cancelLesson(side: CancellationSide, reason: string) {
    await updateLesson.mutateAsync({
      id: lesson.id,
      data: { status: 'CANCELLED', cancellationSide: side, cancellationReason: reason },
    });
    setCancellationModal(false);
    onClose();
  }

  async function removeLesson() {
    if (!confirm(`Видалити урок з ${lesson.child.name}?`)) return;
    await deleteLesson.mutateAsync(lesson.id);
    onClose();
  }

  async function duplicateNextWeek() {
    const newStart = new Date(new Date(lesson.startDate).getTime() + 7 * 24 * 60 * 60 * 1000);
    const newEnd = new Date(new Date(lesson.endDate).getTime() + 7 * 24 * 60 * 60 * 1000);
    await createLesson.mutateAsync({
      childId: lesson.child.id,
      teacherId: lesson.teacher.id,
      status: 'PLANNED',
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
      price: Number(lesson.price),
    });
    onClose();
  }

  const busy = updateLesson.isPending || deleteLesson.isPending || createLesson.isPending;

  return (
    <>
      <div
        ref={ref}
        className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 w-52"
        style={{ top, left }}
      >
        {lesson.status !== 'CONDUCTED' && (
          <ActionBtn onClick={markConducted} disabled={busy}>✅ Проведено</ActionBtn>
        )}
        {lesson.status === 'CONDUCTED' && lesson.note && (
          <ActionBtn onClick={() => setNoteModal('view')} disabled={false}>📋 Нотатка</ActionBtn>
        )}
        <ActionBtn onClick={() => { onEdit(lesson); onClose(); }} disabled={false}>✏️ Редагувати</ActionBtn>
        {lesson.status !== 'CONDUCTED' && (
          <ActionBtn onClick={() => { onEdit(lesson); onClose(); }} disabled={false}>📅 Перенести</ActionBtn>
        )}
        <ActionBtn onClick={duplicateNextWeek} disabled={busy}>📋 Повторити наступного тижня</ActionBtn>
        <ActionBtn onClick={() => setCancellationModal(true)} disabled={busy} className="text-orange-600">❌ Скасувати</ActionBtn>
        <div className="border-t border-gray-100 my-1" />
        <ActionBtn onClick={removeLesson} disabled={busy} className="text-red-600">🗑️ Видалити</ActionBtn>
      </div>

      {noteModal === 'create' && (
        <LessonNoteModal
          open={true}
          onClose={() => setNoteModal(null)}
          lessonId={lesson.id}
          mode="create"
          onSaved={handleNoteSaved}
        />
      )}
      {noteModal === 'view' && (
        <LessonNoteModal
          open={true}
          onClose={() => { setNoteModal(null); onClose(); }}
          lessonId={lesson.id}
          mode="view"
        />
      )}
      <CancellationModal
        open={cancellationModal}
        onClose={() => setCancellationModal(false)}
        onConfirm={cancelLesson}
      />
    </>
  );
}

function ActionBtn({
  onClick,
  disabled,
  children,
  className = '',
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
