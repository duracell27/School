'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import { useUpdateLesson } from '@/lib/lessons';
import type { Lesson, LessonStatus } from '@/types/lesson';

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

const ALL_STATUSES: LessonStatus[] = ['PLANNED', 'CONDUCTED', 'CANCELLED', 'RESCHEDULED'];

function StatusSelect({ lesson }: { lesson: Lesson }) {
  const update = useUpdateLesson();
  return (
    <Select
      value={lesson.status}
      onValueChange={(value) =>
        update.mutate({ id: lesson.id, data: { status: value as LessonStatus } })
      }
      disabled={update.isPending}
    >
      <SelectTrigger
        className={`h-auto w-auto py-0.5 px-2 text-xs font-medium border-0 shadow-none focus:ring-0 rounded-full gap-1 ${STATUS_COLORS[lesson.status]}`}
      >
        {STATUS_LABELS[lesson.status]}
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs cursor-pointer">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s]}`}>
              {STATUS_LABELS[s]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

type SortKey = 'child' | 'teacher' | 'status' | 'startDate';
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

export function LessonsTable({ lessons, onEdit, onDelete }: LessonsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

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

  const sorted = sortKey
    ? [...lessons].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'child') cmp = a.child.name.localeCompare(b.child.name, 'uk');
        else if (sortKey === 'teacher') cmp = a.teacher.name.localeCompare(b.teacher.name, 'uk');
        else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
        else if (sortKey === 'startDate') cmp = a.startDate.localeCompare(b.startDate);
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : lessons;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><SortBtn label="Учень" col="child" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Вчитель" col="teacher" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Статус" col="status" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead><SortBtn label="Початок" col="startDate" activeCol={sortKey} dir={sortDir} onToggle={handleSort} /></TableHead>
          <TableHead>Кінець</TableHead>
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
                <StatusSelect lesson={lesson} />
                {isOverdue(lesson) && (
                  <span className="text-xs text-red-600 font-medium">Не оброблено!</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <span>{fmtDateTime(lesson.startDate)}</span>
                {lesson.status === 'RESCHEDULED' && lesson.originalStartDate && (
                  <span className="text-xs text-gray-400 line-through">{fmtDateTime(lesson.originalStartDate)}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <span>{fmtDateTime(lesson.endDate)}</span>
                {lesson.status === 'RESCHEDULED' && lesson.originalEndDate && (
                  <span className="text-xs text-gray-400 line-through">{fmtDateTime(lesson.originalEndDate)}</span>
                )}
              </div>
            </TableCell>
            <TableCell>{Number(lesson.price).toLocaleString('uk-UA')} грн</TableCell>
            <TableCell className="text-right space-x-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(lesson)}>Редагувати</Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(lesson)}>Видалити</Button>
            </TableCell>
          </TableRow>
        ))}
        {lessons.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-gray-400 py-8">Уроків не знайдено</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
