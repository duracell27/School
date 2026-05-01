'use client';

import { useTeachersWithBalances } from '@/lib/commissions';
import { TeacherCommissionCard } from './_components/TeacherCommissionCard';

export default function CommissionsPage() {
  const { data: teachers = [], isLoading } = useTeachersWithBalances();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Комісії вчителів</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {teachers.map(t => (
          <TeacherCommissionCard key={t.id} teacher={t} />
        ))}
        {teachers.length === 0 && (
          <p className="text-gray-400 text-sm">Вчителів не знайдено</p>
        )}
      </div>
    </div>
  );
}
