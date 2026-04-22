'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChildAvatar } from '@/components/children/child-avatar';
import { UserAvatar } from '@/components/users/user-avatar';
import type { LessonPrice } from '@/types/lesson';

interface LessonPricesTableProps {
  prices: LessonPrice[];
  onEdit: (price: LessonPrice) => void;
  onDelete: (price: LessonPrice) => void;
}

export function LessonPricesTable({ prices, onEdit, onDelete }: LessonPricesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Учень</TableHead>
          <TableHead>Вчитель</TableHead>
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
                <span className="font-medium">{p.child.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <UserAvatar name={p.teacher.name} avatar={p.teacher.avatar} size={28} />
                <span>{p.teacher.name}</span>
              </div>
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
            <TableCell colSpan={5} className="text-center text-gray-400 py-8">Записів не знайдено</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
