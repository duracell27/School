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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateLesson, useUpdateLesson, usePriceSuggestion } from '@/lib/lessons';
import { useChildren } from '@/lib/children';
import { useUsers } from '@/lib/users';
import { useSessionStore } from '@/store/session.store';
import type { Lesson, LessonStatus } from '@/types/lesson';

const STATUSES: { value: LessonStatus; label: string }[] = [
  { value: 'PLANNED', label: 'Заплановано' },
  { value: 'CONDUCTED', label: 'Проведено' },
  { value: 'CANCELLED', label: 'Скасовано' },
  { value: 'RESCHEDULED', label: 'Перенесено' },
];

const schema = z.object({
  startDate: z.string().min(1, "Обов'язкове поле"),
  endDate: z.string().min(1, "Обов'язкове поле"),
  price: z.coerce.number().positive('Вкажіть ціну'),
  originalStartDate: z.string().optional(),
  originalEndDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

interface LessonModalProps {
  open: boolean;
  onClose: () => void;
  lesson?: Lesson;
}

export function LessonModal({ open, onClose, lesson }: LessonModalProps) {
  const isEdit = !!lesson;
  const [submitError, setSubmitError] = useState('');
  const [childId, setChildId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState<LessonStatus>('PLANNED');
  const [startDateVal, setStartDateVal] = useState('');

  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const { data: children = [] } = useChildren();
  const { data: users = [] } = useUsers({ enabled: isAdmin });

  const { data: suggestedPrice } = usePriceSuggestion(
    childId || null,
    teacherId || null,
    startDateVal ? new Date(startDateVal).toISOString() : null,
  );

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const currentStartDate = watch('startDate');
  useEffect(() => { setStartDateVal(currentStartDate || ''); }, [currentStartDate]);

  useEffect(() => {
    if (suggestedPrice !== null && suggestedPrice !== undefined) {
      setValue('price', suggestedPrice);
    }
  }, [suggestedPrice, setValue]);

  useEffect(() => {
    setSubmitError('');
    if (lesson) {
      reset({
        startDate: toDatetimeLocal(lesson.startDate),
        endDate: toDatetimeLocal(lesson.endDate),
        price: Number(lesson.price),
        originalStartDate: toDatetimeLocal(lesson.originalStartDate),
        originalEndDate: toDatetimeLocal(lesson.originalEndDate),
      });
      setChildId(lesson.child.id);
      setTeacherId(lesson.teacher.id);
      setStatus(lesson.status);
    } else {
      reset({ startDate: '', endDate: '', price: undefined as never, originalStartDate: '', originalEndDate: '' });
      setChildId('');
      setTeacherId(isAdmin ? '' : (currentUser?.id ?? ''));
      setStatus('PLANNED');
    }
  }, [lesson, open, isAdmin, currentUser?.id]);

  async function onSubmit(data: FormValues) {
    if (!childId || !teacherId) { setSubmitError('Оберіть учня та вчителя'); return; }
    try {
      const payload = {
        childId,
        teacherId,
        status,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        price: data.price,
        ...(status === 'RESCHEDULED' && data.originalStartDate
          ? { originalStartDate: new Date(data.originalStartDate).toISOString() } : {}),
        ...(status === 'RESCHEDULED' && data.originalEndDate
          ? { originalEndDate: new Date(data.originalEndDate).toISOString() } : {}),
      };
      if (isEdit) {
        await updateLesson.mutateAsync({ id: lesson.id, data: payload });
      } else {
        await createLesson.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Щось пішло не так');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати урок' : 'Додати урок'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Учень</Label>
              <Select value={childId} onValueChange={(v) => setChildId(v ?? '')}>
                <SelectTrigger><SelectValue>{children.find((c) => c.id === childId)?.name ?? 'Оберіть учня'}</SelectValue></SelectTrigger>
                <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Вчитель</Label>
              {isAdmin ? (
                <Select value={teacherId} onValueChange={(v) => setTeacherId(v ?? '')}>
                  <SelectTrigger><SelectValue>{users.find((u) => u.id === teacherId)?.name ?? 'Оберіть вчителя'}</SelectValue></SelectTrigger>
                  <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={currentUser?.name ?? ''} disabled />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Статус</Label>
            <Select value={status} onValueChange={(v) => setStatus((v ?? 'PLANNED') as LessonStatus)}>
              <SelectTrigger><SelectValue>{STATUSES.find((s) => s.value === status)?.label}</SelectValue></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lesson-start">Початок</Label>
              <Input id="lesson-start" type="datetime-local" {...register('startDate')} />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lesson-end">Кінець</Label>
              <Input id="lesson-end" type="datetime-local" {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          {status === 'RESCHEDULED' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="space-y-1">
                <Label htmlFor="orig-start" className="text-orange-700 text-xs">Первісний початок</Label>
                <Input id="orig-start" type="datetime-local" {...register('originalStartDate')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="orig-end" className="text-orange-700 text-xs">Первісний кінець</Label>
                <Input id="orig-end" type="datetime-local" {...register('originalEndDate')} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="lesson-price">
              Ціна (грн)
              {suggestedPrice !== null && suggestedPrice !== undefined && (
                <span className="ml-2 text-xs text-green-600">автозаповнено</span>
              )}
            </Label>
            <Input id="lesson-price" type="number" min={1} step="0.01" {...register('price')} />
            {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
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
