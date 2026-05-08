'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChildAvatar } from '@/components/children/child-avatar';
import { useNextLesson } from '@/lib/dashboard';

function useCountdownMs(targetMs: number | null): number {
  const [diff, setDiff] = useState<number>(targetMs ? targetMs - Date.now() : 0);
  useEffect(() => {
    if (targetMs === null) return;
    setDiff(targetMs - Date.now());
    const id = setInterval(() => setDiff(targetMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return diff;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Зараз';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `за ${hours}г ${minutes}хв`;
  if (minutes > 0) return `за ${minutes}хв ${seconds}с`;
  return `за ${seconds}с`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

export function NextLessonCard() {
  const { data: lesson, isLoading } = useNextLesson();

  const startMs = lesson ? new Date(lesson.startDate).getTime() : null;
  const endMs = lesson ? new Date(lesson.endDate).getTime() : null;
  const msUntilStart = useCountdownMs(startMs);
  const msUntilEnd = useCountdownMs(endMs);
  const isInProgress = startMs !== null && msUntilStart <= 0 && (endMs === null || msUntilEnd > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Наступний урок</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-gray-400">Завантаження...</p>}
        {!isLoading && !lesson && (
          <p className="text-sm text-gray-400">Немає запланованих уроків</p>
        )}
        {!isLoading && lesson && (
          <div className="flex items-center gap-3">
            <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={36} />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lesson.child.name}</p>
              <p className="text-xs text-gray-500">
                {formatDate(lesson.startDate)} · {formatTime(lesson.startDate)}
              </p>
              <p className={`text-sm font-medium mt-0.5 ${isInProgress ? 'text-sky-600' : 'text-blue-600'}`}>
                {isInProgress
                  ? `Зараз · залишилось ${formatCountdown(msUntilEnd)}`
                  : formatCountdown(msUntilStart)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
