'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useUsers } from '@/lib/users';
import { useChildren } from '@/lib/children';
import { useCreatePayment, useUpdatePayment } from '@/lib/payments';
import { useLessonPrices } from '@/lib/lessons';
import type { Payment } from '@/types/payment';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment?: Payment;
}

export function PaymentModal({ open, onClose, payment }: PaymentModalProps) {
  const isEdit = !!payment;
  const { data: users = [] } = useUsers();
  const teachers = users.filter(u => u.status === 'WORKING');

  const [teacherId, setTeacherId] = useState(payment?.teacher.id ?? '');
  const [childId, setChildId] = useState(payment?.child.id ?? '');
  const [amount, setAmount] = useState(payment ? String(Number(payment.amount)) : '');
  const [date, setDate] = useState(
    payment ? payment.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(payment?.notes ?? '');

  useEffect(() => {
    if (payment) {
      setTeacherId(payment.teacher.id);
      setChildId(payment.child.id);
      setAmount(String(Number(payment.amount)));
      setDate(payment.date.split('T')[0]);
      setNotes(payment.notes ?? '');
    } else {
      setTeacherId('');
      setChildId('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [payment, open]);

  const { data: children = [] } = useChildren(teacherId ? { teacherId } : {});
  const { data: lessonPrices = [] } = useLessonPrices();
  const lessonPrice = (childId && teacherId)
    ? lessonPrices.find(lp => lp.child.id === childId && lp.teacher.id === teacherId)
    : null;

  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const isPending = createPayment.isPending || updatePayment.isPending;

  async function handleSave() {
    if (!childId || !teacherId || !amount || !date) return;
    if (isEdit) {
      await updatePayment.mutateAsync({ id: payment!.id, data: { amount, date, notes: notes || undefined } });
    } else {
      await createPayment.mutateAsync({ childId, teacherId, amount, date, notes: notes || undefined });
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати оплату' : 'Додати оплату'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Вчитель</Label>
            <Select value={teacherId} onValueChange={v => { setTeacherId(v ?? ''); setChildId(''); }} disabled={isEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть вчителя">
                  {teacherId
                    ? (teachers.find(u => u.id === teacherId)?.name ?? payment?.teacher.name)
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teachers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Дитина</Label>
            <Select value={childId} onValueChange={v => setChildId(v ?? '')} disabled={!teacherId || isEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть дитину">
                  {childId
                    ? (children.find(c => c.id === childId)?.name ?? payment?.child.name)
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {children.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lessonPrice && (
              <p className="text-sm text-muted-foreground">
                Ціна за заняття: <span className="font-medium text-foreground">{lessonPrice.price} грн</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Сума (грн)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Нотатки (необов'язково)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Коментар..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Скасувати</Button>
          <Button onClick={handleSave} disabled={isPending || !childId || !teacherId || !amount}>
            {isPending ? 'Збереження...' : isEdit ? 'Зберегти' : 'Додати'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
