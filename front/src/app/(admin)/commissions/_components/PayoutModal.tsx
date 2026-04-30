'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePayout } from '@/lib/commissions';

interface Props {
  teacherId: string;
  teacherName: string;
  open: boolean;
  onClose: () => void;
}

export function PayoutModal({ teacherId, teacherName, open, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const createPayout = useCreatePayout();

  useEffect(() => {
    if (!open) {
      setAmount('');
      setNotes('');
    }
  }, [open]);

  function handleSave() {
    if (!amount) return;
    createPayout.mutate(
      { teacherId, amount, notes: notes || undefined },
      {
        onSuccess: onClose,
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Виплата — {teacherName}</DialogTitle>
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
            <Button onClick={handleSave} disabled={createPayout.isPending || !amount}>
              Виплатити
            </Button>
          </div>
          {createPayout.isError && (
            <p className="text-xs text-red-500">Помилка збереження. Спробуйте ще раз.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
