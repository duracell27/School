'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import { getCountry } from '@/lib/countries';
import { subjectEmoji, subjectLabel } from '@/lib/subjects';
import type { LessonPrice } from '@/types/lesson';

type SortKey = 'subject' | 'price' | 'effectiveDate';
type SortDir = 'asc' | 'desc' | null;

function sortPrices(list: LessonPrice[], key: SortKey, dir: SortDir): LessonPrice[] {
  if (!dir) return list;
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (key === 'subject') {
      const sa = a.subject ? subjectLabel(a.subject) : '';
      const sb = b.subject ? subjectLabel(b.subject) : '';
      cmp = sa.localeCompare(sb, 'uk');
    } else if (key === 'price') {
      cmp = Number(a.price) - Number(b.price);
    } else {
      cmp = (a.effectiveDate ?? '').localeCompare(b.effectiveDate ?? '');
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

function SortButton({
  label, colKey, activeKey, dir, onToggle,
}: {
  label: string; colKey: SortKey; activeKey: SortKey | null;
  dir: SortDir; onToggle: (k: SortKey) => void;
}) {
  const isActive = activeKey === colKey;
  const Icon = isActive && dir === 'asc' ? ArrowUp : isActive && dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button onClick={() => onToggle(colKey)} className="flex items-center gap-1 transition-colors hover:opacity-80">
      {label} <Icon size={13} className={isActive ? 'opacity-100' : 'opacity-40'} />
    </button>
  );
}

interface LessonPricesTableProps {
  prices: LessonPrice[];
  onEdit: (price: LessonPrice) => void;
  onDelete: (price: LessonPrice) => void;
}

export function LessonPricesTable({ prices, onEdit, onDelete }: LessonPricesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else {
      const next: SortDir = sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc';
      setSortDir(next);
      if (next === null) setSortKey(null);
    }
  }

  const sorted = sortKey ? sortPrices(prices, sortKey, sortDir) : prices;

  return (
    <>
      <div className="md:hidden divide-y">
        {sorted.map((p) => {
          const flag = getCountry(p.child.country)?.flag ?? p.child.country;
          const effectiveFrom = p.effectiveDate
            ? new Date(p.effectiveDate).toLocaleDateString('uk-UA')
            : '—';
          return (
            <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ChildAvatar name={p.child.name} avatar={p.child.avatar} size={24} />
                  <span className="text-sm font-semibold">{p.child.name}</span>
                  <span>{flag}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.teacher.name}
                  {p.subject && ` · ${subjectEmoji(p.subject)} ${subjectLabel(p.subject)}`}
                </p>
                <p className="text-sm font-semibold mt-0.5">{Number(p.price).toLocaleString('uk-UA')} грн</p>
                <p className="text-xs text-gray-400">Діє з: {effectiveFrom}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(p)}>Ред.</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(p)}>Вид.</Button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Цін не знайдено</p>
        )}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Учень</TableHead>
              <TableHead>Вчитель</TableHead>
              <TableHead>
                <SortButton label="Предмет" colKey="subject" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Ціна (грн)" colKey="price" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="Діє з" colKey="effectiveDate" activeKey={sortKey} dir={sortDir} onToggle={handleSort} />
              </TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ChildAvatar name={p.child.name} avatar={p.child.avatar} size={28} />
                    <span className="font-semibold">{p.child.name}</span>
                    <span className="text-base">{getCountry(p.child.country)?.flag ?? p.child.country}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserAvatar name={p.teacher.name} avatar={p.teacher.avatar} size={28} />
                    <span>{p.teacher.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {p.subject
                    ? <span className="text-sm">{subjectEmoji(p.subject)} {subjectLabel(p.subject)}</span>
                    : <span className="text-gray-400 text-sm">—</span>}
                </TableCell>
                <TableCell>{Number(p.price).toLocaleString('uk-UA')}</TableCell>
                <TableCell>{new Date(p.effectiveDate).toLocaleDateString('uk-UA')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(p)}>Редагувати</Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(p)}>Видалити</Button>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-8">Записів не знайдено</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
