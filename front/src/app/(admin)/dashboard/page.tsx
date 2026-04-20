'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekCalendar, getWeekStart } from '@/components/dashboard/week-calendar';
import { useLessons } from '@/lib/lessons';
import { useUsers } from '@/lib/users';
import { useSessionStore } from '@/store/session.store';

function toWeekStartStr(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

function fmtWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  const e = end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

export default function DashboardPage() {
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const { data: users = [] } = useUsers();

  const teacherId = isAdmin ? selectedTeacherId : (currentUser?.id ?? '');

  const { data: lessons = [], isLoading } = useLessons({
    teacherId: teacherId || undefined,
    weekStart: toWeekStartStr(weekStart),
  });

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Дашборд</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select value={selectedTeacherId} onValueChange={(v) => setSelectedTeacherId(v ?? '')}>
              <SelectTrigger className="w-48">
                <SelectValue>
                  {users.find((u) => u.id === selectedTeacherId)?.name ?? 'Всі вчителі'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Всі вчителі</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>
            Сьогодні
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={prevWeek}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium w-44 text-center">
              {fmtWeekLabel(weekStart)}
            </span>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
      {isLoading ? (
        <p className="text-gray-500">Завантаження...</p>
      ) : (
        <WeekCalendar lessons={lessons} weekStart={weekStart} />
      )}
    </div>
  );
}
