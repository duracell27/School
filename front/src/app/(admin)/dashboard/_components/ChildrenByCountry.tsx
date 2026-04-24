'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCountry } from '@/lib/countries';
import { useChildrenStats } from '@/lib/dashboard';

export function ChildrenByCountry() {
  const { data, isLoading } = useChildrenStats();

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Учні по країнах</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading && <div className="h-24 bg-gray-100 rounded animate-pulse" />}
        {!isLoading && data?.byCountry.length === 0 && (
          <p className="text-sm text-gray-400">Немає учнів</p>
        )}
        {!isLoading && data && data.byCountry.length > 0 && (
          <ul className="space-y-2">
            {data.byCountry.map(({ country, count }) => {
              const info = getCountry(country);
              return (
                <li key={country} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-base">{info?.flag ?? country}</span>
                    <span className="text-gray-700">{info?.name ?? country}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
