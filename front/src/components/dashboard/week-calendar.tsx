'use client';

import { useMemo } from 'react';
import type { Lesson, LessonStatus } from '@/types/lesson';

const HOUR_START = 8;
const HOUR_END = 22;
const ROW_PX = 60;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const TOTAL_H = (HOUR_END - HOUR_START) * ROW_PX;

const STATUS_STYLE: Record<LessonStatus, string> = {
  PLANNED: 'border-blue-400 bg-blue-50 text-blue-900',
  CONDUCTED: 'border-green-500 bg-green-50 text-green-900',
  CANCELLED: 'border-red-400 bg-red-50 text-red-900',
  RESCHEDULED: 'border-orange-400 bg-orange-50 text-orange-900',
};

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getLessonPos(lesson: Lesson): { top: number; height: number } | null {
  const s = new Date(lesson.startDate);
  const e = new Date(lesson.endDate);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  if (eh <= HOUR_START || sh >= HOUR_END) return null;
  const cs = Math.max(sh, HOUR_START);
  const ce = Math.min(eh, HOUR_END);
  return { top: (cs - HOUR_START) * ROW_PX, height: (ce - cs) * ROW_PX };
}

interface WeekCalendarProps {
  lessons: Lesson[];
  weekStart: Date;
}

export function WeekCalendar({ lessons, weekStart }: WeekCalendarProps) {
  const days = getWeekDays(weekStart);
  const todayKey = new Date().toLocaleDateString('en-CA');

  const lessonsByDay = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    days.forEach((d) => map.set(d.toLocaleDateString('en-CA'), []));
    lessons.forEach((l) => {
      const k = new Date(l.startDate).toLocaleDateString('en-CA');
      map.get(k)?.push(l);
    });
    return map;
  }, [lessons, days]);

  return (
    <div className="flex border rounded-lg overflow-hidden bg-white select-none">
      {/* Time column */}
      <div className="w-14 shrink-0 border-r bg-gray-50">
        <div className="h-10 border-b" />
        <div className="relative" style={{ height: TOTAL_H }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute w-full pr-2 text-right text-[11px] text-gray-400"
              style={{ top: (h - HOUR_START) * ROW_PX - 7 }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>

      {/* Day columns */}
      {days.map((day) => {
        const key = day.toLocaleDateString('en-CA');
        const isToday = key === todayKey;
        const dayLessons = lessonsByDay.get(key) ?? [];

        return (
          <div key={key} className="flex-1 min-w-0 border-r last:border-r-0">
            <div className={`h-10 border-b flex flex-col items-center justify-center ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <span className="text-[11px] text-gray-500 capitalize">
                {day.toLocaleDateString('uk-UA', { weekday: 'short' })}
              </span>
              <span className={`text-sm font-semibold leading-none ${isToday ? 'text-blue-600' : ''}`}>
                {day.getDate()}
              </span>
            </div>

            <div className="relative" style={{ height: TOTAL_H }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: (h - HOUR_START) * ROW_PX }}
                />
              ))}
              {dayLessons.map((lesson) => {
                const pos = getLessonPos(lesson);
                if (!pos || pos.height < 8) return null;
                return (
                  <div
                    key={lesson.id}
                    className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1 py-0.5 overflow-hidden ${STATUS_STYLE[lesson.status]}`}
                    style={{ top: pos.top + 1, height: pos.height - 2 }}
                  >
                    <div className="text-[11px] font-semibold truncate leading-tight">
                      {lesson.child.name}
                    </div>
                    {pos.height >= 30 && (
                      <div className="text-[10px] opacity-70 leading-tight">
                        {new Date(lesson.startDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}–
                        {new Date(lesson.endDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
