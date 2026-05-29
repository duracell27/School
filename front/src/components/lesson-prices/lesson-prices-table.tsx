'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import { getCountry } from '@/lib/countries';
import { subjectEmoji, subjectLabel } from '@/lib/subjects';
import type { LessonPrice } from '@/types/lesson';

interface LessonPricesTableProps {
  prices: LessonPrice[];
  onEdit: (price: LessonPrice) => void;
  onDelete: (price: LessonPrice) => void;
}

export function LessonPricesTable({ prices, onEdit, onDelete }: LessonPricesTableProps) {
  return (
    <>
      <div className="md:hidden divide-y">
        {prices.map((p) => {
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
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(p)}>
                  Ред.
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(p)}>
                  Вид.
                </Button>
              </div>
            </div>
          );
        })}
        {prices.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Цін не знайдено</p>
        )}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Учень</TableHead>
              <TableHead>Вчитель</TableHead>
              <TableHead>Предмет</TableHead>
              <TableHead>Ціна (грн)</TableHead>
              <TableHead>Діє з</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((p) => (
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
            {prices.length === 0 && (
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
