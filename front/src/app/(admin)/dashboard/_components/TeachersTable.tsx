'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChildAvatar } from '@/components/children/child-avatar';
import { useTeachersTable } from '@/lib/dashboard';
import { formatCurrency } from '@/lib/format';
import type { Period } from '@/types/dashboard';

interface TeachersTableProps {
  period: Period;
  date?: string;
}

export function TeachersTable({ period, date }: TeachersTableProps) {
  const { data = [], isLoading } = useTeachersTable(period, date);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Вчителі</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="h-24 mx-6 mb-4 bg-gray-100 rounded animate-pulse" />
        ) : data.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-400">Немає вчителів</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs">
                <th className="text-left px-6 py-2 font-medium">Ім&apos;я</th>
                <th className="text-right px-4 py-2 font-medium">Уроків</th>
                <th className="text-right px-4 py-2 font-medium">Зароблено</th>
                <th className="text-right px-4 py-2 font-medium">Очікується</th>
                <th className="text-right px-6 py-2 font-medium">Учнів</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <ChildAvatar name={t.name} avatar={t.avatar} size={28} />
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.lessonsCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatCurrency(t.earned)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">
                    {formatCurrency(t.expected)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">{t.childrenCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
