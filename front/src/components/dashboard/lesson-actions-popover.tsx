'use client';

import { useRef, useEffect } from 'react';
import { useUpdateLesson, useDeleteLesson, useCreateLesson } from '@/lib/lessons';
import type { Lesson } from '@/types/lesson';

interface LessonActionsPopoverProps {
  lesson: Lesson;
  anchorRect: DOMRect;
  onClose: () => void;
  onEdit: (lesson: Lesson) => void;
}

export function LessonActionsPopover({ lesson, anchorRect, onClose, onEdit }: LessonActionsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const createLesson = useCreateLesson();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const top = anchorRect.bottom + window.scrollY + 4;
  const left = anchorRect.left + window.scrollX;

  async function markConducted() {
    await updateLesson.mutateAsync({ id: lesson.id, data: { status: 'CONDUCTED' } });
    onClose();
  }

  async function cancelLesson() {
    await updateLesson.mutateAsync({ id: lesson.id, data: { status: 'CANCELLED' } });
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
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-52"
      style={{ top, left }}
    >
      {lesson.status !== 'CONDUCTED' && (
        <ActionBtn onClick={markConducted} disabled={busy}>✅ Позначити проведеним</ActionBtn>
      )}
      <ActionBtn onClick={() => { onEdit(lesson); onClose(); }} disabled={false}>✏️ Редагувати</ActionBtn>
      {lesson.status !== 'CONDUCTED' && (
        <ActionBtn onClick={() => { onEdit(lesson); onClose(); }} disabled={false}>📅 Перенести</ActionBtn>
      )}
      <ActionBtn onClick={duplicateNextWeek} disabled={busy}>📋 Повторити наступного тижня</ActionBtn>
      <div className="border-t border-gray-100 my-1" />
      <ActionBtn onClick={cancelLesson} disabled={busy} className="text-orange-600">❌ Скасувати</ActionBtn>
      <ActionBtn onClick={removeLesson} disabled={busy} className="text-red-600">🗑️ Видалити</ActionBtn>
    </div>
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
