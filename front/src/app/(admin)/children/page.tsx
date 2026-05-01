'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChildrenTable } from '@/components/children/children-table';
import { ChildModal } from '@/components/children/child-modal';
import { DeleteDialog } from '@/components/children/delete-dialog';
import { ChildSubjectsModal } from '@/components/children/child-subjects-modal';
import { useChildren } from '@/lib/children';
import type { Child } from '@/types/child';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; child: Child };

type DeleteState = { open: false } | { open: true; child: Child };
type SubjectsState = { open: false } | { open: true; child: Child };

export default function ChildrenPage() {
  const { data: children = [], isLoading, error } = useChildren();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [subjectsState, setSubjectsState] = useState<SubjectsState>({ open: false });

  if (isLoading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">Помилка завантаження дітей</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Діти{' '}
          <span className="text-sm font-normal text-gray-400">({children.length})</span>
        </h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>
          + Додати дитину
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <ChildrenTable
          children={children}
          onEdit={(child) => setModal({ open: true, mode: 'edit', child })}
          onDelete={(child) => setDeleteState({ open: true, child })}
          onManageSubjects={(child) => setSubjectsState({ open: true, child })}
        />
      </div>

      <ChildModal
        open={modal.open}
        child={modal.open && modal.mode === 'edit' ? modal.child : undefined}
        onClose={() => setModal({ open: false })}
      />

      <DeleteDialog
        open={deleteState.open}
        child={deleteState.open ? deleteState.child : null}
        onClose={() => setDeleteState({ open: false })}
      />

      <ChildSubjectsModal
        open={subjectsState.open}
        child={subjectsState.open ? subjectsState.child : null}
        onClose={() => setSubjectsState({ open: false })}
      />
    </div>
  );
}
