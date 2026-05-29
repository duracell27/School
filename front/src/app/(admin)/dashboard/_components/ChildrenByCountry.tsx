'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCountry } from '@/lib/countries';
import { useChildrenStats } from '@/lib/dashboard';

export function ChildrenByCountry() {
  const { data, isLoading } = useChildrenStats();

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">Учні по країнах</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading && <div className="h-24 bg-gray-100 rounded animate-pulse" />}
        {!isLoading && data?.byCountry.length === 0 && (
          <p className="text-sm text-gray-400">Немає учнів</p>
        )}
        {!isLoading && data && data.byCountry.length > 0 && (() => {
          const total = data.byCountry.reduce((sum, c) => sum + c.count, 0);
          return (
            <ul className="space-y-2">
              {data.byCountry.map(({ country, count }) => {
                const info = getCountry(country);
                const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                return (
                  <li key={country} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="text-sm leading-none">{info?.flag ?? country}</span>
                        <span className="text-gray-700 text-xs">{info?.name ?? country}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-xs">{count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </CardContent>
    </Card>
  );
}
