'use client';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteLessonPrice } from '@/lib/lessons';
import type { LessonPrice } from '@/types/lesson';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  price: LessonPrice | null;
}

export function DeleteDialog({ open, onClose, price }: DeleteDialogProps) {
  const del = useDeleteLessonPrice();
  async function handleDelete() {
    if (!price) return;
    await del.mutateAsync(price.id);
    onClose();
  }
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити запис ціни?</AlertDialogTitle>
          <AlertDialogDescription>
            {price?.child.name} — {price?.teacher.name} — {price ? Number(price.price).toLocaleString('uk-UA') : ''} грн. Цю дію неможливо скасувати.
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
