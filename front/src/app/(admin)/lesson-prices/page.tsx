'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LessonPricesTable } from '@/components/lesson-prices/lesson-prices-table';
import { LessonPriceModal } from '@/components/lesson-prices/lesson-price-modal';
import { DeleteDialog } from '@/components/lesson-prices/delete-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLessonPricesPaginated } from '@/lib/lessons';
import type { LessonPrice } from '@/types/lesson';

const LIMIT = 20;

type ModalState = { open: false } | { open: true; mode: 'create' } | { open: true; mode: 'edit'; price: LessonPrice };
type DeleteState = { open: false } | { open: true; price: LessonPrice };

export default function LessonPricesPage() {
  const [page, setPage] = useState(1);
  const { data: result, isLoading, error } = useLessonPricesPaginated({ page, limit: LIMIT });
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

  if (isLoading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">Помилка завантаження</p>;

  const prices = result?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Вартість заняття{' '}
          <span className="text-sm font-normal text-gray-400">({result?.total ?? 0})</span>
        </h2>
        <Button onClick={() => setModal({ open: true, mode: 'create' })}>+ Додати ціну</Button>
      </div>
      <div className="bg-card rounded-lg border">
        <LessonPricesTable
          prices={prices}
          onEdit={(price) => setModal({ open: true, mode: 'edit', price })}
          onDelete={(price) => setDeleteState({ open: true, price })}
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
      <LessonPriceModal
        open={modal.open}
        price={modal.open && modal.mode === 'edit' ? modal.price : undefined}
        onClose={() => setModal({ open: false })}
      />
      <DeleteDialog
        open={deleteState.open}
        price={deleteState.open ? deleteState.price : null}
        onClose={() => setDeleteState({ open: false })}
      />
    </div>
  );
}
