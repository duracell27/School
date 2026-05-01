'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TeacherSelect } from '@/components/shared/teacher-select';
import { useAddSubject, useRemoveSubject } from '@/lib/children';
import { useUsers } from '@/lib/users';
import { SUBJECTS, subjectEmoji, subjectLabel } from '@/lib/subjects';
import type { Child } from '@/types/child';
import type { Subject } from '@/types/lesson';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  child: Child | null;
}

export function ChildSubjectsModal({ open, onClose, child }: Props) {
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState<Subject | ''>('');
  const [error, setError] = useState('');

  const { data: users = [] } = useUsers();
  const addSubject = useAddSubject();
  const removeSubject = useRemoveSubject();

  async function handleAdd() {
    if (!child || !teacherId || !subject) { setError('Оберіть вчителя та предмет'); return; }
    setError('');
    try {
      await addSubject.mutateAsync({ childId: child.id, teacherId, subject: subject as Subject });
      setTeacherId('');
      setSubject('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    }
  }

  async function handleRemove(subjectId: string) {
    if (!child) return;
    await removeSubject.mutateAsync({ childId: child.id, subjectId });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Предмети — {child?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Existing subjects */}
          <div className="space-y-2">
            {(child?.subjects ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Предметів ще немає</p>
            ) : (
              child!.subjects.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 border">
                  <span className="text-sm">
                    {subjectEmoji(s.subject)} {subjectLabel(s.subject)}
                    <span className="ml-2 text-gray-400 text-xs">• {s.teacher.name}</span>
                  </span>
                  <button
                    onClick={() => handleRemove(s.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add new */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Додати предмет</p>
            <div className="space-y-1">
              <Label>Вчитель</Label>
              <TeacherSelect users={users} value={teacherId} onChange={setTeacherId} />
            </div>
            <div className="space-y-1">
              <Label>Предмет</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v as Subject)}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть предмет" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.emoji} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              className="w-full"
              onClick={handleAdd}
              disabled={addSubject.isPending}
            >
              Додати
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
