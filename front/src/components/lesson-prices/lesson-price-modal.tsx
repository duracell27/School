'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
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
import { ChildSelect } from '@/components/shared/child-select';
import { TeacherSelect } from '@/components/shared/teacher-select';
import { useCreateLessonPrice, useUpdateLessonPrice, useLessonPrices } from '@/lib/lessons';
import { useChildren } from '@/lib/children';
import { useUsers } from '@/lib/users';
import { SUBJECTS } from '@/lib/subjects';
import type { LessonPrice, Subject } from '@/types/lesson';
import { DatePicker } from '@/components/ui/date-picker';

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
  const [subject, setSubject] = useState<Subject | ''>('');

  const createPrice = useCreateLessonPrice();
  const updatePrice = useUpdateLessonPrice();
  const { data: children = [] } = useChildren();
  const { data: users = [] } = useUsers();
  const { data: allPrices = [] } = useLessonPrices();

  const selectedChild = children.find((c) => c.id === childId) ?? null;

  // Teachers available for this child (from subjects)
  const availableTeachers = useMemo(() => {
    if (!selectedChild) return users;
    const ids = new Set(selectedChild.subjects.map((s) => s.teacher.id));
    return users.filter((u) => ids.has(u.id));
  }, [selectedChild, users]);

  // Subjects available for this (child, teacher) pair
  const availableSubjects = useMemo(() => {
    if (!selectedChild) return SUBJECTS;
    const subs = teacherId
      ? selectedChild.subjects.filter((s) => s.teacher.id === teacherId)
      : selectedChild.subjects;
    return SUBJECTS.filter((s) => subs.some((cs) => cs.subject === s.value));
  }, [selectedChild, teacherId]);

  const latestPriceByChild = useMemo(() => {
    if (!teacherId) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    allPrices
      .filter((p) => p.teacher.id === teacherId)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
      .forEach((p) => {
        if (!(p.child.id in map)) map[p.child.id] = p.price;
      });
    return map;
  }, [allPrices, teacherId]);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  useEffect(() => {
    setSubmitError('');
    if (price) {
      reset({ price: Number(price.price), effectiveDate: price.effectiveDate.slice(0, 10) });
      setChildId(price.child.id);
      setTeacherId(price.teacher.id);
      setSubject(price.subject ?? '');
    } else {
      reset({ price: undefined as never, effectiveDate: '' });
      setChildId('');
      setTeacherId('');
      setSubject('');
    }
  }, [price, open]);

  // Auto-fill teacher when child changes (only when creating)
  useEffect(() => {
    if (isEdit || !childId) return;
    const ids = [...new Set((selectedChild?.subjects ?? []).map((s) => s.teacher.id))];
    if (ids.length === 1) setTeacherId(ids[0]);
    else setTeacherId('');
    setSubject('');
  }, [childId]);

  // Auto-fill subject when (child, teacher) pair changes
  useEffect(() => {
    if (isEdit) return;
    if (availableSubjects.length === 1) setSubject(availableSubjects[0].value);
    else if (availableSubjects.length === 0) setSubject('');
  }, [childId, teacherId]);

  async function onSubmit(data: FormValues) {
    if (!childId || !teacherId) { setSubmitError('Оберіть учня та вчителя'); return; }
    try {
      const payload = {
        childId, teacherId, price: data.price, effectiveDate: data.effectiveDate,
        ...(subject ? { subject: subject as Subject } : {}),
      };
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
            <ChildSelect
              children={children}
              value={childId}
              onChange={setChildId}
              renderSuffix={(c) => (
                <span className="text-xs text-gray-400 font-normal">
                  {latestPriceByChild[c.id]
                    ? `${Number(latestPriceByChild[c.id]).toLocaleString('uk-UA')} грн`
                    : 'не встановлено'}
                </span>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label>Вчитель</Label>
            <TeacherSelect
              users={availableTeachers}
              value={teacherId}
              onChange={(v) => { setTeacherId(v); setSubject(''); }}
              disabled={isEdit}
            />
          </div>
          {availableSubjects.length > 0 && (
            <div className="space-y-1">
              <Label>Предмет (необов&apos;язково)</Label>
              <Select value={subject || '__none__'} onValueChange={(v) => setSubject(v === '__none__' ? '' : v as Subject)} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue placeholder="Не вказано">
                    {subject
                      ? `${SUBJECTS.find(m => m.value === subject)?.emoji ?? ''} ${SUBJECTS.find(m => m.value === subject)?.label ?? subject}`
                      : '— Не вказано —'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Не вказано —</SelectItem>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.emoji} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lp-price">Ціна (грн)</Label>
              <Input id="lp-price" type="number" min={1} step="0.01" {...register('price')} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Діє з</Label>
              <Controller control={control} name="effectiveDate" render={({ field }) => (
                <DatePicker value={field.value ?? ''} onChange={field.onChange} />
              )} />
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
