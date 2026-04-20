'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus } from 'lucide-react';
import { ChildAvatar } from './child-avatar';
import { getCountry } from '@/lib/countries';
import type { Child } from '@/types/child';

interface ChildrenTableProps {
  children: Child[];
  onEdit: (child: Child) => void;
  onDelete: (child: Child) => void;
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('uk-UA');
}

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

function getTimezoneInfo(tzOffset: string): { time: string; date: string | null } | null {
  const offset = parseInt(tzOffset, 10);
  if (isNaN(offset)) return null;

  const uaOffset = getUkraineOffset();
  if (offset === uaOffset) return null;

  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;

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

export function ChildrenTable({ children, onEdit, onDelete }: ChildrenTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ім'я</TableHead>
          <TableHead>Вік</TableHead>
          <TableHead>Країна</TableHead>
          <TableHead>Таймзона</TableHead>
          <TableHead>Вчитель</TableHead>
          <TableHead>Батьки</TableHead>
          <TableHead>Дата</TableHead>
          <TableHead className="text-right">Дії</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {children.map((child) => {
          const country = getCountry(child.country);
          const tzInfo = getTimezoneInfo(child.timezone);
          return (
            <TableRow key={child.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <ChildAvatar name={child.name} avatar={child.avatar} size={32} />
                  <span className="font-medium">{child.name}</span>
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
                  {tzInfo && (
                    <span className="text-xs text-gray-500">
                      {tzInfo.time}
                      {tzInfo.date && (
                        <span className="ml-1 text-orange-500">{tzInfo.date}</span>
                      )}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {child.teacher ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                    {child.teacher.name}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
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
                          className="text-blue-600 hover:underline"
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
                  <span className="flex items-center gap-1.5 text-green-600">
                    <UserPlus size={13} />
                    {formatDate(child.hireDate)}
                  </span>
                  <span className="flex items-center gap-1.5 text-red-500">
                    <UserMinus size={13} />
                    {formatDate(child.graduationDate)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right space-x-2">
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
            <TableCell colSpan={8} className="text-center text-gray-400 py-8">
              Дітей не знайдено
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
