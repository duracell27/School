'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChildrenStats } from '@/lib/dashboard';

export function ActiveChildrenCard() {
  const { data, isLoading } = useChildrenStats();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Учні</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
        ) : (
          <>
            <p className="text-2xl font-bold">{data?.active ?? 0}</p>
            {!!data?.newThisMonth && (
              <p className="text-xs text-green-600 font-medium mt-1">
                +{data.newThisMonth} цього місяця
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
