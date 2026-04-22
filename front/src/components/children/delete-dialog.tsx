'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteChild } from '@/lib/children';
import type { Child } from '@/types/child';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  child: Child | null;
}

export function DeleteDialog({ open, onClose, child }: DeleteDialogProps) {
  const deleteChild = useDeleteChild();

  async function handleDelete() {
    if (!child) return;
    await deleteChild.mutateAsync(child.id);
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити {child?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Цю дію неможливо скасувати. Дитину буде видалено назавжди.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteChild.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteChild.isPending ? 'Видалення...' : 'Видалити'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
