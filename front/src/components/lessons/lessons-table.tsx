'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, FileText, Pencil, Trash2 } from 'lucide-react';
import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import { getCountry } from '@/lib/countries';
import { useUpdateLesson } from '@/lib/lessons';
import { useSessionStore } from '@/store/session.store';
import { LessonNoteModal } from './lesson-note-modal';
import type { CancellationSide, Lesson, LessonStatus, PaymentStatus } from '@/types/lesson';

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
  PLANNED: 'bg-[#eaf2ff] text-[#1a4ba3]',
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
  PAID: 'bg-green-100 text-green-700',
  UNPAID: 'bg-red-100 text-red-700',
  PREPAID: 'bg-[#eaf2ff] text-[#1a4ba3]',
};

function PaymentBadge({ paymentStatus, paidAmount, className }: {
  paymentStatus: NonNullable<PaymentStatus>;
  paidAmount?: number;
  className?: string;
}) {
  const isPartial = paymentStatus === 'UNPAID' && paidAmount != null && paidAmount > 0;
  const label = isPartial
    ? `Частково: ${paidAmount.toLocaleString('uk-UA')} грн`
    : PAYMENT_STATUS_LABELS[paymentStatus];
  const color = isPartial ? 'bg-orange-100 text-orange-700' : PAYMENT_STATUS_COLORS[paymentStatus];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color} ${className ?? ''}`}>
      {label}
    </span>
  );
}

const ALL_STATUSES: LessonStatus[] = ['PLANNED', 'CONDUCTED', 'CANCELLED', 'RESCHEDULED'];

function StatusSelect({
  lesson,
  onMarkConducted,
  onMarkCancelled,
  className,
}: {
  lesson: Lesson;
  onMarkConducted: (lesson: Lesson) => void;
  onMarkCancelled: (lesson: Lesson) => void;
  className?: string;
}) {
  const update = useUpdateLesson();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as LessonStatus;
    if (newStatus === 'CONDUCTED') {
      onMarkConducted(lesson);
      return;
    }
    if (newStatus === 'CANCELLED') {
      onMarkCancelled(lesson);
      return;
    }
    update.mutate({ id: lesson.id, data: { status: newStatus } });
  }

  return (
    <select
      value={lesson.status}
      onChange={handleChange}
      disabled={update.isPending}
      className={`cursor-pointer py-0.5 pl-2 pr-1 text-xs font-medium rounded-full border-0 outline-none disabled:opacity-50 text-center ${STATUS_COLORS[lesson.status]} ${className ?? ''}`}
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
  const [pendingCancelled, setPendingCancelled] = useState<Lesson | null>(null);
  const [cancelSide, setCancelSide] = useState<CancellationSide>('STUDENT');
  const [cancelReason, setCancelReason] = useState('');
  const [cancellationInfo, setCancellationInfo] = useState<{ side: CancellationSide | null; reason: string | null } | null>(null);
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

  function handleMarkCancelled(lesson: Lesson) {
    setCancelSide('STUDENT');
    setCancelReason('');
    setPendingCancelled(lesson);
  }

  async function handleCancelConfirm() {
    if (!pendingCancelled) return;
    await updateLesson.mutateAsync({
      id: pendingCancelled.id,
      data: { status: 'CANCELLED', cancellationSide: cancelSide, cancellationReason: cancelReason || undefined },
    });
    setPendingCancelled(null);
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
            <div key={lesson.id} className={`px-4 py-3 space-y-2 ${overdue ? 'bg-red-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={32} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{lesson.child.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs font-medium text-gray-500">{startStr}</p>
                      <span className="text-xs text-gray-400">{Number(lesson.price).toLocaleString('uk-UA')} грн</span>
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
                  {lesson.status === 'CANCELLED' && (lesson.cancellationSide || lesson.cancellationReason) && (
                    <Button
                      size="sm" variant="outline"
                      className="h-7 px-2 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setCancellationInfo({ side: lesson.cancellationSide ?? null, reason: lesson.cancellationReason ?? null })}
                    >
                      <FileText size={12} />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 px-2" title="Редагувати" onClick={() => onEdit(lesson)}>
                    <Pencil size={12} />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-red-500 border-red-200" title="Видалити" onClick={() => onDelete(lesson)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusSelect
                  lesson={lesson}
                  onMarkConducted={handleMarkConducted}
                  onMarkCancelled={handleMarkCancelled}
                  className={lesson.paymentStatus || overdue ? 'flex-1' : 'w-full'}
                />
                {overdue && !lesson.paymentStatus && (
                  <span className="flex-1 text-center text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700">
                    Не оброблено
                  </span>
                )}
                {lesson.paymentStatus && (
                  <PaymentBadge
                    paymentStatus={lesson.paymentStatus}
                    paidAmount={lesson.paidAmount}
                    className="flex-1 text-center text-[10px]"
                  />
                )}
              </div>
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
                    <span className="font-semibold">{lesson.child.name}</span>
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
                    <StatusSelect lesson={lesson} onMarkConducted={handleMarkConducted} onMarkCancelled={handleMarkCancelled} />
                    {isOverdue(lesson) && (
                      <span className="text-xs text-red-600 font-medium">Не оброблено!</span>
                    )}
                  </div>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    {lesson.paymentStatus ? (
                      <PaymentBadge
                        paymentStatus={lesson.paymentStatus}
                        paidAmount={lesson.paidAmount}
                      />
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
                  {lesson.status === 'CANCELLED' && (lesson.cancellationSide || lesson.cancellationReason) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setCancellationInfo({ side: lesson.cancellationSide ?? null, reason: lesson.cancellationReason ?? null })}
                    >
                      <FileText size={14} className="mr-1" /> Причина
                    </Button>
                  )}
                  <Button variant="outline" size="sm" title="Редагувати" onClick={() => onEdit(lesson)}><Pencil size={14} /></Button>
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" title="Видалити" onClick={() => onDelete(lesson)}><Trash2 size={14} /></Button>
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

      {pendingCancelled && (
        <Dialog open onOpenChange={(o) => !o && setPendingCancelled(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Скасування уроку</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Сторона скасування</p>
                <div className="flex gap-2">
                  {(['STUDENT', 'TEACHER'] as CancellationSide[]).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setCancelSide(side)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        cancelSide === side
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {side === 'STUDENT' ? 'Учень' : 'Вчитель'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Причина <span className="text-gray-400">(необов&apos;язково)</span></p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Вкажіть причину скасування..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPendingCancelled(null)}>Скасувати</Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={updateLesson.isPending}
              >
                Підтвердити скасування
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {cancellationInfo && (
        <Dialog open onOpenChange={(o) => !o && setCancellationInfo(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Причина скасування</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {cancellationInfo.side && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Сторона</p>
                  <p className="text-sm font-medium">
                    {cancellationInfo.side === 'STUDENT' ? 'Учень' : 'Вчитель'}
                  </p>
                </div>
              )}
              {cancellationInfo.reason && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Причина</p>
                  <p className="text-sm whitespace-pre-wrap">{cancellationInfo.reason}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancellationInfo(null)}>Закрити</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
