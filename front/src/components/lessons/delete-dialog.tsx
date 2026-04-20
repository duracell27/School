'use client';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteLesson } from '@/lib/lessons';
import type { Lesson } from '@/types/lesson';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  lesson: Lesson | null;
}

export function DeleteDialog({ open, onClose, lesson }: DeleteDialogProps) {
  const del = useDeleteLesson();
  async function handleDelete() {
    if (!lesson) return;
    await del.mutateAsync(lesson.id);
    onClose();
  }
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити урок?</AlertDialogTitle>
          <AlertDialogDescription>
            Урок з {lesson?.child.name} — цю дію неможливо скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={del.isPending} className="bg-red-600 hover:bg-red-700">
            {del.isPending ? 'Видалення...' : 'Видалити'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
