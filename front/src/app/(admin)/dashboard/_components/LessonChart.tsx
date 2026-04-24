'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardChart } from '@/lib/dashboard';
import type { Period } from '@/types/dashboard';

const STATUS_CONFIG = [
  { key: 'conducted',   label: 'Проведені',    color: '#22c55e' },
  { key: 'planned',     label: 'Заплановані',  color: '#3b82f6' },
  { key: 'cancelled',   label: 'Скасовані',    color: '#ef4444' },
  { key: 'rescheduled', label: 'Перенесені',   color: '#f97316' },
] as const;

interface LessonChartProps {
  period: Period;
}

export function LessonChart({ period }: LessonChartProps) {
  const { data = [], isLoading } = useDashboardChart(period);

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Динаміка уроків</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value, name) => {
                  const cfg = STATUS_CONFIG.find((s) => s.key === String(name));
                  return [value, cfg?.label ?? String(name)];
                }}
              />
              <Legend
                formatter={(value) => STATUS_CONFIG.find((s) => s.key === value)?.label ?? value}
                wrapperStyle={{ fontSize: 11 }}
              />
              {STATUS_CONFIG.map(({ key, color }) => (
                <Bar key={key} dataKey={key} stackId="a" fill={color} radius={key === 'rescheduled' ? [3, 3, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
