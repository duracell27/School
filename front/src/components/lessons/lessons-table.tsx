'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import { getCountry } from '@/lib/countries';
import { useUpdateLesson } from '@/lib/lessons';
import { useSessionStore } from '@/store/session.store';
import { LessonNoteModal } from './lesson-note-modal';
import type { Lesson, LessonStatus, PaymentStatus } from '@/types/lesson';

interface LessonsTableProps {
  lessons: Lesson[];
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}

const STATUS_LABELS: Record<LessonStatus, string> = {
  PLANNED: 'Заплановано',
  CONDUCTED: 'Проведено',
  CANCELLED: 'Скасовано',
  RESCHEDULED: 'Перенесено',
};

const STATUS_COLORS: Record<LessonStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  CONDUCTED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-orange-100 text-orange-700',
};

const PAYMENT_STATUS_LABELS: Record<NonNullable<PaymentStatus>, string> = {
  PAID: 'Оплачено',
  UNPAID: 'Не оплачено',
  PREPAID: 'Передоплачено',
};

const PAYMENT_STATUS_COLORS: Record<NonNullable<PaymentStatus>, string> = {
  PAID: 'bg-slate-100 text-slate-700',
  UNPAID: 'bg-red-100 text-red-700',
  PREPAID: 'bg-blue-100 text-blue-700',
};

const ALL_STATUSES: LessonStatus[] = ['PLANNED', 'CONDUCTED', 'CANCELLED', 'RESCHEDULED'];

function StatusSelect({
  lesson,
  onMarkConducted,
}: {
  lesson: Lesson;
  onMarkConducted: (lesson: Lesson) => void;
}) {
  const update = useUpdateLesson();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as LessonStatus;
    if (newStatus === 'CONDUCTED') {
      onMarkConducted(lesson);
      return;
    }
    update.mutate({ id: lesson.id, data: { status: newStatus } });
  }

  return (
    <select
      value={lesson.status}
      onChange={handleChange}
      disabled={update.isPending}
      className={`cursor-pointer py-0.5 pl-2 pr-1 text-xs font-medium rounded-full border-0 outline-none disabled:opacity-50 ${STATUS_COLORS[lesson.status]}`}
    >
      {ALL_STATUSES.map((s) => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}

function isOverdue(lesson: Lesson): boolean {
  return lesson.status === 'PLANNED' && new Date(lesson.endDate) < new Date();
}

function fmtDateTime(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

type SortKey = 'child' | 'teacher' | 'status' | 'startDate' | 'paymentStatus';
type SortDir = 'asc' | 'desc' | null;

function SortBtn({ label, col, activeCol, dir, onToggle }: {
  label: string; col: SortKey; activeCol: SortKey | null;
  dir: SortDir; onToggle: (c: SortKey) => void;
}) {
  const active = activeCol === col;
  const Icon = active && dir === 'asc' ? ArrowUp : active && dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button onClick={() => onToggle(col)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
      {label} <Icon size={13} className={active ? 'opacity-100' : 'opacity-40'} />
    </button>
  );
}

const paymentStatusOrder: Record<string, number> = { UNPAID: 0, PREPAID: 1, PAID: 2, null: 3 };

export function LessonsTable({ lessons, onEdit, onDelete }: LessonsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [noteModal, setNoteModal] = useState<{ lessonId: string; mode: 'create' | 'view' } | null>(null);
  const [pendingConducted, setPendingConducted] = useState<Lesson | null>(null);
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'ADMIN_TEACHER';
  const updateLesson = useUpdateLesson();

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir(null);
      setSortKey(null);
    } else {
      setSortDir('asc');
    }
  }

  function handleMarkConducted(lesson: Lesson) {
    setPendingConducted(lesson);
    setNoteModal({ lessonId: lesson.id, mode: 'create' });
  }

  async function handleNoteSaved() {
    if (pendingConducted) {
      await updateLesson.mutateAsync({ id: pendingConducted.id, data: { status: 'CONDUCTED' } });
      setPendingConducted(null);
    }
    setNoteModal(null);
  }

  const sorted = sortKey
    ? [...lessons].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'child') cmp = a.child.name.localeCompare(b.child.name, 'uk');
        else if (sortKey === 'teacher') cmp = a.teacher.name.localeCompare(b.teacher.name, 'uk');
        else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
        else if (sortKey === 'startDate') cmp = a.startDate.localeCompare(b.startDate);
        else if (sortKey === 'paymentStatus') {
          cmp = (paymentStatusOrder[a.paymentStatus ?? 'null'] ?? 3) - (paymentStatusOrder[b.paymentStatus ?? 'null'] ?? 3);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : lessons;

  return (
    <>
      <div className="md:hidden divide-y">
        {lessons.map((lesson) => {
          const startStr = new Date(lesson.startDate).toLocaleString('uk-UA', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          });
          const overdue = isOverdue(lesson);
          return (
            <div key={lesson.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={32} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{lesson.child.name}</p>
                    <p className="text-xs text-gray-500">{startStr}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs text-gray-600">{Number(lesson.price).toLocaleString('uk-UA')} грн</span>
                      {lesson.paymentStatus && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[lesson.paymentStatus]}`}>
                          {PAYMENT_STATUS_LABELS[lesson.paymentStatus]}
                        </span>
                      )}
                      {overdue && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                          Не оброблено
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {lesson.status === 'CONDUCTED' && lesson.note && (
                    <Button
                      size="sm" variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => setNoteModal({ lessonId: lesson.id, mode: 'view' })}
                    >
                      <FileText size={12} />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(lesson)}>
                    Ред.
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(lesson)}>
                    Вид.
                  </Button>
                </div>
              </div>
              <StatusSelect lesson={lesson} onMarkConducted={handleMarkConducted} />
            </div>
          );
        })}
        {lessons.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Уроків не знайдено</p>
        )}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortBtn label="Учень" col="child" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
              <TableHead><SortBtn label="Вчитель" col="teacher" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
              <TableHead><SortBtn label="Статус" col="status" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
              {isAdmin && (
                <TableHead>
                  <SortBtn label="Оплата" col="paymentStatus" activeCol={sortKey} dir={sortDir} onToggle={handleSort} />
                </TableHead>
              )}
              <TableHead><SortBtn label="Час заняття" col="startDate" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
              <TableHead>Ціна</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((lesson) => (
              <TableRow key={lesson.id} className={isOverdue(lesson) ? 'bg-red-50' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={28} />
                    <span className="font-medium">{lesson.child.name}</span>
                    <span className="text-base">{getCountry(lesson.child.country)?.flag ?? lesson.child.country}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserAvatar name={lesson.teacher.name} avatar={lesson.teacher.avatar} size={28} />
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                      {lesson.teacher.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <StatusSelect lesson={lesson} onMarkConducted={handleMarkConducted} />
                    {isOverdue(lesson) && (
                      <span className="text-xs text-red-600 font-medium">Не оброблено!</span>
                    )}
                  </div>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    {lesson.paymentStatus ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[lesson.paymentStatus]}`}>
                        {PAYMENT_STATUS_LABELS[lesson.paymentStatus]}
                      </span>
                    ) : null}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <div>
                      <div>{new Date(lesson.startDate).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                      <div className="text-xs text-gray-500">{fmtTime(lesson.startDate)} – {fmtTime(lesson.endDate)}</div>
                    </div>
                    {lesson.originalStartDate && (
                      <div className="text-xs text-orange-500">
                        <div>Було: {new Date(lesson.originalStartDate).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                        <div>{fmtTime(lesson.originalStartDate)}{lesson.originalEndDate ? ` – ${fmtTime(lesson.originalEndDate)}` : ''}</div>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{Number(lesson.price).toLocaleString('uk-UA')} грн</TableCell>
                <TableCell className="text-right space-x-2">
                  {lesson.status === 'CONDUCTED' && lesson.note && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNoteModal({ lessonId: lesson.id, mode: 'view' })}
                    >
                      <FileText size={14} className="mr-1" /> Нотатка
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => onEdit(lesson)}>Редагувати</Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(lesson)}>Видалити</Button>
                </TableCell>
              </TableRow>
            ))}
            {lessons.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-gray-400 py-8">Уроків не знайдено</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {noteModal && (
        <LessonNoteModal
          open={true}
          onClose={() => { setNoteModal(null); setPendingConducted(null); }}
          lessonId={noteModal.lessonId}
          mode={noteModal.mode}
          onSaved={noteModal.mode === 'create' ? handleNoteSaved : undefined}
        />
      )}
    </>
  );
}
