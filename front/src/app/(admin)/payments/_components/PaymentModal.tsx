'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChildSelect } from '@/components/shared/child-select';
import { useUsers } from '@/lib/users';
import { useChildren } from '@/lib/children';
import { useCreatePayment, useUpdatePayment } from '@/lib/payments';
import { useLessonPrices } from '@/lib/lessons';
import type { Payment } from '@/types/payment';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment?: Payment;
  defaultChildId?: string;
  defaultTeacherId?: string;
  defaultAmount?: string;
  defaultDebtCount?: number;
}

export function PaymentModal({ open, onClose, payment, defaultChildId, defaultTeacherId, defaultAmount, defaultDebtCount }: PaymentModalProps) {
  const isEdit = !!payment;

  const { data: allChildren = [] } = useChildren();
  const { data: users = [] } = useUsers();
  const allTeachers = users.filter(u => u.status === 'WORKING');

  const [childId, setChildId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const selectedChild = allChildren.find(c => c.id === childId) ?? null;
  const childTeacherIds = new Set((selectedChild?.subjects ?? []).map(s => s.teacher.id));
  const teachers = childId && childTeacherIds.size > 0
    ? allTeachers.filter(u => childTeacherIds.has(u.id))
    : allTeachers;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (payment) {
      setChildId(payment.child.id);
      setTeacherId(payment.teacher.id);
      setAmount(String(Number(payment.amount)));
      setDate(payment.date.split('T')[0]);
      setNotes(payment.notes ?? '');
    } else {
      setChildId(defaultChildId ?? '');
      setTeacherId(defaultTeacherId ?? '');
      setAmount(defaultAmount ?? '');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [payment, open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChildChange(id: string) {
    setChildId(id);
    if (isEdit) return;
    const child = allChildren.find(c => c.id === id);
    const uniqueTeachers = [...new Set((child?.subjects ?? []).map(s => s.teacher.id))];
    setTeacherId(uniqueTeachers.length === 1 ? uniqueTeachers[0] : '');
  }

  const { data: lessonPrices = [] } = useLessonPrices();
  const lessonPrice = childId && teacherId
    ? lessonPrices.find(lp => lp.child.id === childId && lp.teacher.id === teacherId)
    : null;

  useEffect(() => {
    if (!isEdit && defaultDebtCount && defaultDebtCount > 0 && lessonPrice && !amount) {
      setAmount(String(defaultDebtCount * Number(lessonPrice.price)));
    }
  }, [lessonPrice]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <Label>Учень</Label>
            {isEdit ? (
              <div className="h-9 px-3 flex items-center text-sm border rounded-lg bg-muted text-muted-foreground">
                {payment?.child.name}
              </div>
            ) : (
              <ChildSelect
                children={allChildren}
                value={childId}
                onChange={handleChildChange}
              />
            )}
          </div>

          <div className="space-y-1">
            <Label>Вчитель</Label>
            <Select
              value={teacherId}
              onValueChange={v => setTeacherId(v ?? '')}
              disabled={isEdit}
            >
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

          {lessonPrice && (
            <p className="text-sm text-muted-foreground -mt-2">
              Ціна за заняття: <span className="font-medium text-foreground">{lessonPrice.price} грн</span>
            </p>
          )}

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
            <DatePicker value={date} onChange={setDate} />
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
