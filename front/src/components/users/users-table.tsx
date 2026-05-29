'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from './user-avatar';
import { UserPlus, UserMinus } from 'lucide-react';
import type { User } from '@/types/user';

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Адмін',
  ADMIN_TEACHER: 'Адмін-вчитель',
  TEACHER: 'Вчитель',
};

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('uk-UA');
}

export function UsersTable({ users, onEdit, onDelete }: UsersTableProps) {
  return (
    <>
      <div className="md:hidden divide-y">
        {users.map((user) => (
          <div key={user.id} className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <UserAvatar name={user.name} avatar={user.avatar} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(user)}>
                Ред.
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-500 border-red-200" onClick={() => onDelete(user)}>
                Вид.
              </Button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Користувачів не знайдено</p>
        )}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ім'я</TableHead>
              <TableHead>Електронна пошта</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={user.name} avatar={user.avatar} size={32} />
                    <span className="font-semibold">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'TEACHER' ? 'secondary' : 'default'}>
                    {user.role === 'ADMIN' ? 'Адмін' : user.role === 'ADMIN_TEACHER' ? 'Адмін-вчитель' : 'Вчитель'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'WORKING' ? 'default' : 'destructive'}>
                    {user.status === 'WORKING' ? 'Працює' : 'Звільнений'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <UserPlus size={13} />
                      {formatDate(user.hireDate)}
                    </span>
                    <span className="flex items-center gap-1.5 text-red-500">
                      <UserMinus size={13} />
                      {formatDate(user.terminationDate)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                    Редагувати
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(user)}>
                    Видалити
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                  Користувачів не знайдено
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
