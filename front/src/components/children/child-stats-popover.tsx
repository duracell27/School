'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BarChart2 } from 'lucide-react';
import { useChildStats } from '@/lib/children';
import { formatCurrency } from '@/lib/format';

interface ChildStatsPopoverProps {
  childId: string;
  childName: string;
}

export function ChildStatsPopover({ childId, childName }: ChildStatsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" title={`Статистика — ${childName}`} />}>
        <BarChart2 size={14} />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <ChildStatsContent childId={childId} />
      </PopoverContent>
    </Popover>
  );
}

function ChildStatsContent({ childId }: { childId: string }) {
  const { data, isLoading } = useChildStats(childId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return <p className="text-xs text-gray-400">Немає даних</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Статистика</p>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Всього занять</span>
        <span className="font-semibold">{data.totalLessons}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Сер. на місяць</span>
        <span className="font-semibold">{data.avgPerMonth}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Зароблено</span>
        <span className="font-semibold">{formatCurrency(data.totalEarned)}</span>
      </div>
    </div>
  );
}
