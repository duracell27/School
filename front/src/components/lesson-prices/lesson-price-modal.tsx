'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChildSelect } from '@/components/shared/child-select';
import { TeacherSelect } from '@/components/shared/teacher-select';
import { useCreateLessonPrice, useUpdateLessonPrice } from '@/lib/lessons';
import { useChildren } from '@/lib/children';
import { useUsers } from '@/lib/users';
import type { LessonPrice } from '@/types/lesson';

const schema = z.object({
  price: z.coerce.number().positive('Вкажіть ціну'),
  effectiveDate: z.string().min(1, "Обов'язкове поле"),
});
type FormValues = z.infer<typeof schema>;

interface LessonPriceModalProps {
  open: boolean;
  onClose: () => void;
  price?: LessonPrice;
}

export function LessonPriceModal({ open, onClose, price }: LessonPriceModalProps) {
  const isEdit = !!price;
  const [submitError, setSubmitError] = useState('');
  const [childId, setChildId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const createPrice = useCreateLessonPrice();
  const updatePrice = useUpdateLessonPrice();
  const { data: children = [] } = useChildren();
  const { data: users = [] } = useUsers();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  useEffect(() => {
    setSubmitError('');
    if (price) {
      reset({ price: Number(price.price), effectiveDate: price.effectiveDate.slice(0, 10) });
      setChildId(price.child.id);
      setTeacherId(price.teacher.id);
    } else {
      reset({ price: undefined as never, effectiveDate: '' });
      setChildId('');
      setTeacherId('');
    }
  }, [price, open]);

  async function onSubmit(data: FormValues) {
    if (!childId || !teacherId) { setSubmitError('Оберіть учня та вчителя'); return; }
    try {
      const payload = { childId, teacherId, price: data.price, effectiveDate: data.effectiveDate };
      if (isEdit) {
        await updatePrice.mutateAsync({ id: price.id, data: payload });
      } else {
        await createPrice.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Щось пішло не так');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати ціну' : 'Додати ціну'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Учень</Label>
            <ChildSelect children={children} value={childId} onChange={setChildId} />
          </div>
          <div className="space-y-1">
            <Label>Вчитель</Label>
            <TeacherSelect users={users} value={teacherId} onChange={setTeacherId} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lp-price">Ціна (грн)</Label>
              <Input id="lp-price" type="number" min={1} step="0.01" {...register('price')} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lp-date">Діє з</Label>
              <Input id="lp-date" type="date" {...register('effectiveDate')} />
              {errors.effectiveDate && <p className="text-sm text-red-500">{errors.effectiveDate.message}</p>}
            </div>
          </div>
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Скасувати</Button>
            <Button type="submit" disabled={isSubmitting}>{isEdit ? 'Зберегти' : 'Створити'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
