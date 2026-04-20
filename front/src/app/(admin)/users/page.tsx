'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UsersTable } from '@/components/users/users-table';
import { UserModal } from '@/components/users/user-modal';
import { DeleteDialog } from '@/components/users/delete-dialog';
import { useUsers } from '@/lib/users';
import type { User } from '@/types/user';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; user: User };

type DeleteState = { open: false } | { open: true; user: User };

export default function UsersPage() {
  const { data: users = [], isLoading, error } = useUsers();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

  if (isLoading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">Помилка завантаження користувачів</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Користувачі</h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>
          + Створити користувача
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <UsersTable
          users={users}
          onEdit={(user) => setModal({ open: true, mode: 'edit', user })}
          onDelete={(user) => setDeleteState({ open: true, user })}
        />
      </div>

      <UserModal
        open={modal.open}
        user={modal.open && modal.mode === 'edit' ? modal.user : undefined}
        onClose={() => setModal({ open: false })}
      />

      <DeleteDialog
        open={deleteState.open}
        user={deleteState.open ? deleteState.user : null}
        onClose={() => setDeleteState({ open: false })}
      />
    </div>
  );
}
