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
import { ChildSelect } from '@/components/shared/child-select';
import { TeacherSelect } from '@/components/shared/teacher-select';
import { DateTimePicker } from '@/components/shared/date-time-picker';
import { useCreateLesson, useUpdateLesson, usePriceSuggestion } from '@/lib/lessons';
import { useChildren } from '@/lib/children';
import { useUsers } from '@/lib/users';
import { useSessionStore } from '@/store/session.store';
import { SUBJECTS } from '@/lib/subjects';
import { LessonNoteModal } from '@/components/lessons/lesson-note-modal';
import { CancellationModal } from '@/components/lessons/cancellation-modal';
import type { CancellationSide, Lesson, LessonStatus, Subject } from '@/types/lesson';

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
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface LessonModalProps {
  open: boolean;
  onClose: () => void;
  lesson?: Lesson;
  defaultStartDate?: string; // ISO string, used when creating from slot click
  defaultEndDate?: string;   // ISO string
  defaultTeacherId?: string;
  defaultChildId?: string;
  onSaved?: (newStatus: LessonStatus, prevStatus: LessonStatus | undefined) => void;
}

export function LessonModal({ open, onClose, lesson, defaultStartDate, defaultEndDate, defaultTeacherId, defaultChildId, onSaved }: LessonModalProps) {
  const isEdit = !!lesson;
  const [submitError, setSubmitError] = useState('');
  const [childId, setChildId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState<LessonStatus>('PLANNED');
  const [subject, setSubject] = useState<Subject | ''>('');
  const [startDateVal, setStartDateVal] = useState('');
  const [noteModalLessonId, setNoteModalLessonId] = useState<string | null>(null);
  const [cancellationLessonId, setCancellationLessonId] = useState<string | null>(null);

  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'ADMIN_TEACHER';

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const { data: children = [] } = useChildren();
  const { data: users = [] } = useUsers({ enabled: isAdmin });

  const selectedChild = children.find((c) => c.id === childId) ?? null;
  const availableSubjects = selectedChild
    ? selectedChild.subjects.filter((s) => !teacherId || s.teacher.id === teacherId)
    : [];

  const { data: suggestedPrice } = usePriceSuggestion(
    childId || null,
    teacherId || null,
    startDateVal ? new Date(startDateVal).toISOString() : null,
    subject || null,
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
      setSubject(lesson.subject ?? '');
    } else {
      reset({
        startDate: defaultStartDate ? toDatetimeLocal(defaultStartDate) : '',
        endDate: defaultEndDate ? toDatetimeLocal(defaultEndDate) : '',
        price: undefined as never,
        originalStartDate: '',
        originalEndDate: '',
      });
      setChildId(defaultChildId ?? '');
      setTeacherId(defaultTeacherId ?? (isAdmin ? '' : (currentUser?.id ?? '')));
      setStatus('PLANNED');
      setSubject('');
    }
  }, [lesson, open, isAdmin, currentUser?.id, defaultStartDate, defaultEndDate, defaultTeacherId, defaultChildId]);

  // Auto-fill teacher when child changes (admin only, not editing)
  useEffect(() => {
    if (!isAdmin || isEdit || !childId) return;
    if (defaultTeacherId) { setSubject(''); return; }
    const uniqueTeachers = [...new Set((selectedChild?.subjects ?? []).map((s) => s.teacher.id))];
    if (uniqueTeachers.length === 1) setTeacherId(uniqueTeachers[0]);
    else setTeacherId('');
    setSubject('');
  }, [childId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill subject when only one available for the (child, teacher) pair
  useEffect(() => {
    if (isEdit) return;
    if (availableSubjects.length === 1) setSubject(availableSubjects[0].subject);
    else if (availableSubjects.length === 0) setSubject('');
  }, [childId, teacherId]);

  async function onSubmit(data: FormValues) {
    if (!childId || !teacherId) { setSubmitError('Оберіть учня та вчителя'); return; }
    if (availableSubjects.length > 1 && !subject) { setSubmitError('Оберіть предмет'); return; }
    try {
      const payload = {
        childId,
        teacherId,
        status,
        ...(subject ? { subject: subject as Subject } : {}),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        price: data.price,
        ...(status === 'RESCHEDULED' && data.originalStartDate
          ? { originalStartDate: new Date(data.originalStartDate).toISOString() } : {}),
        ...(status === 'RESCHEDULED' && data.originalEndDate
          ? { originalEndDate: new Date(data.originalEndDate).toISOString() } : {}),
      };
      if (isEdit) {
        const updated = await updateLesson.mutateAsync({ id: lesson.id, data: payload });
        if (status === 'CONDUCTED' && lesson?.status !== 'CONDUCTED') {
          setNoteModalLessonId(updated.id);
          return;
        }
        if (status === 'CANCELLED' && lesson?.status !== 'CANCELLED') {
          setCancellationLessonId(updated.id);
          return;
        }
      } else {
        const created = await createLesson.mutateAsync(payload);
        if (status === 'CONDUCTED') {
          setNoteModalLessonId(created.id);
          return;
        }
        if (status === 'CANCELLED') {
          setCancellationLessonId(created.id);
          return;
        }
      }
      onClose();
      onSaved?.(status, lesson?.status);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Щось пішло не так');
    }
  }

  function addDuration(minutes: number) {
    const start = watch('startDate');
    if (!start) return;
    const d = new Date(start);
    d.setMinutes(d.getMinutes() + minutes);
    const pad = (n: number) => String(n).padStart(2, '0');
    const end = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setValue('endDate', end, { shouldValidate: true });
  }

  function handleNoteSavedFromModal() {
    setNoteModalLessonId(null);
    onClose();
    onSaved?.(status, lesson?.status);
  }

  async function handleCancellationConfirmed(side: CancellationSide, reason: string) {
    if (!cancellationLessonId) return;
    await updateLesson.mutateAsync({ id: cancellationLessonId, data: { cancellationSide: side, cancellationReason: reason } });
    setCancellationLessonId(null);
    onClose();
    onSaved?.(status, lesson?.status);
  }

  return (
    <>
    {noteModalLessonId && (
      <LessonNoteModal
        open={true}
        onClose={() => { setNoteModalLessonId(null); onClose(); onSaved?.(status, lesson?.status); }}
        lessonId={noteModalLessonId}
        mode="create"
        onSaved={handleNoteSavedFromModal}
      />
    )}
    <CancellationModal
      open={!!cancellationLessonId}
      onClose={() => { setCancellationLessonId(null); onClose(); onSaved?.(status, lesson?.status); }}
      onConfirm={handleCancellationConfirmed}
    />
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати урок' : 'Додати урок'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Учень</Label>
              <ChildSelect children={children} value={childId} onChange={setChildId} />
            </div>
            <div className="space-y-1">
              <Label>Вчитель</Label>
              {isAdmin ? (
                <TeacherSelect users={users} value={teacherId} onChange={setTeacherId} />
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

          {availableSubjects.length > 0 && (
            <div className="space-y-1">
              <Label>Предмет</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v as Subject)}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть предмет">
                    {subject
                      ? `${SUBJECTS.find(m => m.value === subject)?.emoji ?? ''} ${SUBJECTS.find(m => m.value === subject)?.label ?? subject}`
                      : <span className="text-muted-foreground">Оберіть предмет</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((s) => {
                    const meta = SUBJECTS.find((m) => m.value === s.subject);
                    return (
                      <SelectItem key={s.id} value={s.subject}>
                        {meta?.emoji} {meta?.label ?? s.subject}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Початок</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <DateTimePicker
                  value={watch('startDate') || ''}
                  onChange={(v) => setValue('startDate', v, { shouldValidate: true })}
                />
                {watch('startDate') && (
                  <>
                    <Button type="button" size="sm" variant="outline" onClick={() => addDuration(55)}>55хв</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => addDuration(30)}>30хв</Button>
                  </>
                )}
              </div>
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Кінець</Label>
              <DateTimePicker
                value={watch('endDate') || ''}
                onChange={(v) => setValue('endDate', v, { shouldValidate: true })}
              />
              {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          {status === 'RESCHEDULED' && (
            <div className="space-y-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="space-y-1.5">
                <Label className="text-orange-700 text-xs">Первісний початок</Label>
                <DateTimePicker
                  value={watch('originalStartDate') || ''}
                  onChange={(v) => setValue('originalStartDate', v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-orange-700 text-xs">Первісний кінець</Label>
                <DateTimePicker
                  value={watch('originalEndDate') || ''}
                  onChange={(v) => setValue('originalEndDate', v)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="lesson-price">
              Ціна (грн)
              {suggestedPrice !== null && suggestedPrice !== undefined && (
                <span className="ml-2 text-xs text-muted-foreground">автозаповнено</span>
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
    </>
  );
}
