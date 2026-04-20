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
import { useDeleteUser } from '@/lib/users';
import type { User } from '@/types/user';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export function DeleteDialog({ open, onClose, user }: DeleteDialogProps) {
  const deleteUser = useDeleteUser();

  async function handleDelete() {
    if (!user) return;
    await deleteUser.mutateAsync(user.id);
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити {user?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Цю дію неможливо скасувати. Користувача буде видалено назавжди.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteUser.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteUser.isPending ? 'Видалення...' : 'Видалити'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
