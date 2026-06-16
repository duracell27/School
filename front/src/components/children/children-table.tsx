'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, ArrowUpDown, ArrowUp, ArrowDown, BookOpen } from 'lucide-react';
import { ChildAvatar } from './child-avatar';
import { ChildStatsPopover } from './child-stats-popover';
import { getCountry } from '@/lib/countries';
import { subjectEmoji, subjectLabel } from '@/lib/subjects';
import type { Child } from '@/types/child';

interface ChildrenTableProps {
  children: Child[];
  onEdit: (child: Child) => void;
  onDelete: (child: Child) => void;
  onManageSubjects: (child: Child) => void;
}

type SortKey = 'name' | 'age' | 'country' | 'teacher' | 'hireDate' | 'status';
type SortDir = 'asc' | 'desc' | null;

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('uk-UA');
}

const STATUS_LABEL: Record<string, string> = {
  STUDYING: 'Вчиться',
  VACATION: 'Канікули',
  PAUSED: 'На паузі',
};

const STATUS_CLASS: Record<string, string> = {
  STUDYING: 'text-emerald-600 bg-emerald-50',
  VACATION: 'text-amber-600 bg-amber-50',
  PAUSED: 'text-gray-500 bg-gray-100',
};

function toTelegramHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://t.me/+${digits}`;
}

function getUkraineOffset(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kyiv',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date());
  const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+2';
  const m = raw.match(/GMT([+-]\d+)/);
  return m ? parseInt(m[1]) : 2;
}

function getTimezoneInfo(tzOffset: string): { time: string; date: string | null } {
  const offset = parseInt(tzOffset, 10);
  const uaOffset = getUkraineOffset();
  const now = new Date();
  const utcMs = now.getTime();

  const childDate = new Date(utcMs + offset * 3600000);
  const uaDate = new Date(utcMs + uaOffset * 3600000);

  const time = childDate.toLocaleTimeString('uk-UA', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });

  const childDay = childDate.toLocaleDateString('en-CA', { timeZone: 'UTC' });
  const uaDay = uaDate.toLocaleDateString('en-CA', { timeZone: 'UTC' });
  const dateLabel = childDay !== uaDay
    ? childDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    : null;

  return { time, date: dateLabel };
}

function sortChildren(list: Child[], key: SortKey, dir: SortDir): Child[] {
  if (!dir) return list;
  return [...list].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'name':
        cmp = a.name.localeCompare(b.name, 'uk');
        break;
      case 'age':
        cmp = a.age - b.age;
        break;
      case 'country': {
        const ca = getCountry(a.country)?.name ?? a.country;
        const cb = getCountry(b.country)?.name ?? b.country;
        cmp = ca.localeCompare(cb, 'uk');
        break;
      }
      case 'teacher': {
        const ta = a.subjects[0]?.teacher.name ?? '';
        const tb = b.subjects[0]?.teacher.name ?? '';
        cmp = ta.localeCompare(tb, 'uk');
        break;
      }
      case 'hireDate':
        cmp = (a.hireDate ?? '').localeCompare(b.hireDate ?? '');
        break;
      case 'status': {
        const order = { STUDYING: 0, VACATION: 1, PAUSED: 2 };
        cmp = (order[a.status ?? 'STUDYING'] ?? 0) - (order[b.status ?? 'STUDYING'] ?? 0);
        break;
      }
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

function SortButton({
  label,
  colKey,
  activeKey,
  dir,
  onToggle,
}: {
  label: string;
  colKey: SortKey;
  activeKey: SortKey | null;
  dir: SortDir;
  onToggle: (key: SortKey) => void;
}) {
  const isActive = activeKey === colKey;
  const Icon = isActive && dir === 'asc' ? ArrowUp : isActive && dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onToggle(colKey)}
      className="flex items-center gap-1 transition-colors hover:opacity-80"
    >
      {label} <Icon size={13} className={isActive ? 'opacity-100' : 'opacity-40'} />
    </button>
  );
}

export function ChildrenTable({ children, onEdit, onDelete, onManageSubjects }: ChildrenTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortKey(null);
    }
  }

  const sorted = sortKey ? sortChildren(children, sortKey, sortDir) : children;

  return (
    <>
      <div className="md:hidden divide-y">
        {sorted.map((child) => {
          const flag = getCountry(child.country)?.flag ?? child.country;
          const teacherNames = [...new Set(child.subjects.map(s => s.teacher.name))];
          return (
            <div key={child.id} className="px-4 py-3 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <ChildAvatar name={child.name} avatar={child.avatar} size={36} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-sm font-semibold leading-tight">{child.name}</span>
                    <span>{flag}</span>
                    {child.status && child.status !== 'STUDYING' && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_CLASS[child.status]}`}>
                        {STATUS_LABEL[child.status]}
                      </span>
                    )}
                  </div>
                  {child.subjects.length > 0 && (
                    <p className="text-xs text-gray-500 leading-tight">
                      {child.subjects.map(s => `${subjectEmoji(s.subject)} ${subjectLabel(s.subject)}`).join(', ')}
                    </p>
                  )}
                  {teacherNames.length > 0 && (
                    <p className="text-xs text-gray-400 leading-tight">{teacherNames.join(', ')}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ChildStatsPopover childId={child.id} childName={child.name} />
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onManageSubjects(child)}>
                  <BookOpen size={12} />
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(child)}>
                  Ред.
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(child)}>
                  Вид.
                </Button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Дітей не знайдено</p>
        )}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton label="Ім'я" colKey="name" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Вік" colKey="age" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Країна" colKey="country" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead>Таймзона</TableHead>
              <TableHead>
                <SortButton label="Вчителі" colKey="teacher" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead>Батьки</TableHead>
              <TableHead>
                <SortButton label="Дата" colKey="hireDate" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Статус" colKey="status" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((child) => {
              const country = getCountry(child.country);
              const tzInfo = getTimezoneInfo(child.timezone);
              return (
                <TableRow key={child.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <ChildAvatar name={child.name} avatar={child.avatar} size={32} />
                      <span className="font-semibold">{child.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{child.age}</TableCell>
                  <TableCell>
                    <span title={country?.name ?? child.country}>
                      {country?.flag ?? child.country}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{child.timezone}</span>
                      <span className="text-xs text-gray-500">
                        {tzInfo.time}
                        {tzInfo.date && (
                          <span className="ml-1 text-orange-500">{tzInfo.date}</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {child.subjects.length === 0 ? (
                        <span className="text-gray-400 text-sm">—</span>
                      ) : (
                        child.subjects.map((s) => (
                          <span key={s.id} className="inline-flex items-center gap-1 text-xs text-gray-600">
                            {subjectEmoji(s.subject)} {subjectLabel(s.subject)}
                            <span className="text-gray-400">• {s.teacher.name}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                      {child.parentContacts.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        child.parentContacts.map((c, i) => (
                          <span key={i}>
                            {c.label}:{' '}
                            <a
                              href={toTelegramHref(c.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {c.phone}
                            </a>
                          </span>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <UserPlus size={13} />
                        {formatDate(child.hireDate)}
                      </span>
                      <span className="flex items-center gap-1.5 text-red-500">
                        <UserMinus size={13} />
                        {formatDate(child.graduationDate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASS[child.status ?? 'STUDYING']}`}>
                      {STATUS_LABEL[child.status ?? 'STUDYING']}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <ChildStatsPopover childId={child.id} childName={child.name} />
                    <Button variant="outline" size="sm" title="Предмети" onClick={() => onManageSubjects(child)}>
                      <BookOpen size={14} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(child)}>
                      Редагувати
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(child)}>
                      Видалити
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {children.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                  Дітей не знайдено
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
