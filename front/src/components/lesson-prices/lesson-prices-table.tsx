'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
            <TableCell className="font-medium">{p.child.name}</TableCell>
            <TableCell>{p.teacher.name}</TableCell>
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
