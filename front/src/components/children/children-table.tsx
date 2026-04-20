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
                {country ? (
                  <span className="flex items-center gap-1.5">
                    {country.flag} {country.name}
                  </span>
                ) : (
                  child.country
                )}
              </TableCell>
              <TableCell>{child.timezone}</TableCell>
              <TableCell>{child.teacher?.name ?? '—'}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                  {child.parentContacts.length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    child.parentContacts.map((c, i) => (
                      <span key={i}>
                        {c.label}: {c.phone}
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
