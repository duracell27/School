'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardChart } from '@/lib/dashboard';
import type { Period } from '@/types/dashboard';

const STATUS_CONFIG = [
  { key: 'conducted',   label: 'Проведені',    color: '#22a06b' },
  { key: 'planned',     label: 'Заплановані',  color: '#4f8df5' },
  { key: 'cancelled',   label: 'Скасовані',    color: '#e15a5a' },
  { key: 'rescheduled', label: 'Перенесені',   color: '#e8893c' },
] as const;

type StackKey = typeof STATUS_CONFIG[number]['key'];
const STACK_KEYS = STATUS_CONFIG.map((s) => s.key) as StackKey[];

function makeBarShape(dataKey: StackKey) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function BarShape(props: any) {
    const x = props.x as number;
    const y = props.y as number;
    const width = props.width as number;
    const height = props.height as number;
    const fill = props.fill as string;
    const payload = props.payload as Record<string, number>;

    if (!height || height <= 0 || width <= 0) return null;

    const idx = STACK_KEYS.indexOf(dataKey);
    const isTop = STACK_KEYS.slice(idx + 1).every((k) => !(payload?.[k] > 0));

    if (!isTop) {
      return <rect x={x} y={y} width={width} height={height} fill={fill} />;
    }

    const r = Math.min(3, width / 2, height);
    return (
      <path
        d={`M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - r} H${x} V${y + r} a${r},${r} 0 0 1 ${r},${-r} Z`}
        fill={fill}
      />
    );
  };
}

interface LessonChartProps {
  period: Period;
  date?: string;
}

export function LessonChart({ period, date }: LessonChartProps) {
  const { data = [], isLoading } = useDashboardChart(period, date);
  const xInterval = period === 'month' ? 4 : 0;

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-muted-foreground">Динаміка уроків</CardTitle>
        <div className="flex items-center gap-3">
          {STATUS_CONFIG.map(({ key, label, color }) => (
            <span key={key} className="flex items-center gap-1 text-[11px] text-gray-500">
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={xInterval} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value, name) => {
                  const cfg = STATUS_CONFIG.find((s) => s.key === String(name));
                  return [value, cfg?.label ?? String(name)];
                }}
              />
              {STATUS_CONFIG.map(({ key, color }) => (
                <Bar key={key} dataKey={key} stackId="a" fill={color} shape={makeBarShape(key)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
