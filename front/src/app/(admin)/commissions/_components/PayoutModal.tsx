'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePayout, useUpdatePayout } from '@/lib/commissions';
import type { TeacherPayout } from '@/types/commission';

interface Props {
  teacherId: string;
  teacherName: string;
  open: boolean;
  onClose: () => void;
  payout?: TeacherPayout;
}

export function PayoutModal({ teacherId, teacherName, open, onClose, payout }: Props) {
  const isEdit = !!payout;
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const createPayout = useCreatePayout();
  const updatePayout = useUpdatePayout();
  const isPending = createPayout.isPending || updatePayout.isPending;
  const isError = createPayout.isError || updatePayout.isError;

  useEffect(() => {
    if (open) {
      setAmount(payout ? String(Number(payout.amount)) : '');
      setNotes(payout?.notes ?? '');
    } else {
      setAmount('');
      setNotes('');
    }
  }, [open, payout]);

  function handleSave() {
    if (!amount) return;
    if (isEdit) {
      updatePayout.mutate(
        { id: payout!.id, data: { amount, notes: notes || undefined } },
        { onSuccess: onClose },
      );
    } else {
      createPayout.mutate(
        { teacherId, amount, notes: notes || undefined },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати виплату' : 'Виплата'} — {teacherName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Сума (грн)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="1000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Нотатка</Label>
            <Input
              placeholder="Необов'язково"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Скасувати</Button>
            <Button onClick={handleSave} disabled={isPending || !amount}>
              {isPending ? 'Збереження...' : isEdit ? 'Зберегти' : 'Виплатити'}
            </Button>
          </div>
          {isError && (
            <p className="text-xs text-red-500">Помилка збереження. Спробуйте ще раз.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
