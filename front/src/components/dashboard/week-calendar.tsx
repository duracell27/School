'use client';

import { useMemo } from 'react';
import { ChildAvatar } from '@/components/children/child-avatar';
import { subjectEmoji } from '@/lib/subjects';
import type { Lesson, LessonStatus } from '@/types/lesson';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const HOUR_START = 6;
const HOUR_END = 22;
const ROW_PX = 44;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const TOTAL_H = (HOUR_END - HOUR_START) * ROW_PX;

const STATUS_STYLE: Record<LessonStatus, string> = {
  PLANNED: 'border-blue-400 bg-blue-50 text-blue-900',
  CONDUCTED: 'border-green-500 bg-green-50 text-green-900',
  CANCELLED: 'border-red-400 bg-red-50 text-red-900',
  RESCHEDULED: 'border-orange-400 bg-orange-50 text-orange-900',
};

const STATUS_LABEL: Record<LessonStatus, string> = {
  PLANNED: 'Заплановано',
  CONDUCTED: 'Проведено',
  CANCELLED: 'Скасовано',
  RESCHEDULED: 'Перенесено',
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

export function getLessonPos(lesson: Lesson): { top: number; height: number } | null {
  const s = new Date(lesson.startDate);
  const e = new Date(lesson.endDate);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  if (eh <= HOUR_START || sh >= HOUR_END) return null;
  const cs = Math.max(sh, HOUR_START);
  const ce = Math.min(eh, HOUR_END);
  return { top: (cs - HOUR_START) * ROW_PX, height: (ce - cs) * ROW_PX };
}

function getUkraineOffset(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kyiv',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date());
  const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+2';
  const m = raw.match(/GMT([+-]\d+)/);
  return m ? parseInt(m[1]) : 2;
}

function getChildLocalTime(lesson: Lesson): string | null {
  const childOffset = parseInt(lesson.child.timezone, 10);
  if (isNaN(childOffset)) return null;
  const uaOffset = getUkraineOffset();
  if (childOffset === uaOffset) return null;

  const utcMs = new Date(lesson.startDate).getTime();
  const childDate = new Date(utcMs + childOffset * 3600000);
  return childDate.toLocaleTimeString('uk-UA', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
}

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

function isOverdue(lesson: Lesson): boolean {
  return lesson.status === 'PLANNED' && new Date(lesson.endDate) < new Date();
}

const HALF_HOURS = Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => ({
  hour: HOUR_START + Math.floor(i / 2),
  minute: (i % 2) * 30,
}));

function isSlotOccupied(dayLessons: Lesson[], hour: number, minute: number): boolean {
  const slotMin = hour * 60 + minute;
  return dayLessons.some((l) => {
    const ls = new Date(l.startDate);
    const le = new Date(l.endDate);
    const lsMin = ls.getHours() * 60 + ls.getMinutes();
    const leMin = le.getHours() * 60 + le.getMinutes();
    return lsMin < slotMin + 30 && leMin > slotMin;
  });
}

interface DroppableSlotProps {
  id: string;
  hour: number;
  minute: number;
  occupied: boolean;
}

function DroppableSlot({ id, hour, minute, occupied }: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { hour, minute } });
  const top = ((hour - HOUR_START) * 2 + minute / 30) * (ROW_PX / 2);

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 z-0 transition-colors ${
        isOver ? (occupied ? 'bg-red-100' : 'bg-green-100') : ''
      }`}
      style={{ top, height: ROW_PX / 2 }}
    />
  );
}

interface DraggableLessonCardProps {
  lesson: Lesson;
  pos: { top: number; height: number };
  onLessonClick?: (lesson: Lesson) => void;
}

function DraggableLessonCard({ lesson, pos, onLessonClick }: DraggableLessonCardProps) {
  const draggable = lesson.status !== 'CONDUCTED';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lesson-${lesson.id}`,
    data: { type: 'lesson', lesson },
    disabled: !draggable,
  });

  const overdue = isOverdue(lesson);
  const cardStyle = overdue ? 'border-red-600 bg-red-100 text-red-900' : STATUS_STYLE[lesson.status];

  const startStr = new Date(lesson.startDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const endStr = new Date(lesson.endDate).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const childTime = getChildLocalTime(lesson);

  const style: React.CSSProperties = {
    position: 'absolute',
    top: pos.top + 1,
    height: pos.height - 2,
    left: 2,
    right: 2,
    zIndex: isDragging ? 0 : 10,
    opacity: isDragging ? 0.3 : 1,
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      data-lesson-id={lesson.id}
      style={style}
      className={`group rounded border-l-2 px-1 py-0.5 overflow-hidden ${draggable ? 'cursor-grab' : 'cursor-pointer'} ${cardStyle}`}
      onClick={(e) => { e.stopPropagation(); onLessonClick?.(lesson); }}
      {...listeners}
      {...attributes}
    >
      {/* Hover tooltip */}
      <div className="absolute bottom-full left-0 z-50 hidden group-hover:block bg-white border border-gray-200 rounded shadow-lg p-2 text-xs w-44 pointer-events-none">
        <p className="font-semibold">{lesson.child.name}</p>
        {lesson.subject && <p className="text-gray-500">{subjectEmoji(lesson.subject)} {lesson.subject === 'MATH' ? 'Математика' : 'Українська'}</p>}
        <p className="text-gray-500">{startStr}–{endStr}</p>
        <p className="text-gray-500">{lesson.price}₴</p>
        <p className="text-gray-500">{STATUS_LABEL[lesson.status]}</p>
        {overdue && <p className="text-red-600 font-medium">Не оброблено!</p>}
      </div>

      <div className="flex items-center gap-1 min-w-0">
        <ChildAvatar name={lesson.child.name} avatar={lesson.child.avatar} size={14} />
        <span className="text-[11px] font-semibold truncate leading-tight">{lesson.child.name}</span>
      </div>

      {pos.height >= 20 && (
        <div className="text-[10px] opacity-70 leading-tight truncate">
          {startStr}–{endStr}
          {childTime && (
            <span className="ml-1 opacity-80">
              · {countryFlag(lesson.child.country)} {childTime}
            </span>
          )}
        </div>
      )}

      {lesson.subject && (
        <div className="text-[9px] leading-none truncate opacity-80">
          {subjectEmoji(lesson.subject)} {lesson.subject === 'MATH' ? 'Математика' : 'Українська'}
        </div>
      )}
    </div>
  );
}

interface WeekCalendarProps {
  lessons: Lesson[];
  weekStart: Date;
  onSlotClick?: (dayKey: string, hour: number, minute: number) => void;
  onLessonClick?: (lesson: Lesson) => void;
}

export function WeekCalendar({ lessons, weekStart, onSlotClick, onLessonClick }: WeekCalendarProps) {
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
      <div className="w-12 shrink-0 border-r bg-gray-50">
        <div className="h-10 border-b" />
        <div className="relative" style={{ height: TOTAL_H }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute w-full pr-1.5 text-right text-[10px] text-gray-400"
              style={{ top: (h - HOUR_START) * ROW_PX - 6 }}
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

            <div
              className="relative"
              style={{ height: TOTAL_H }}
              onClick={(e) => {
                if (!onSlotClick) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const y = e.clientY - rect.top;
                const totalMinutes = (y / ROW_PX) * 60;
                const hour = HOUR_START + Math.floor(totalMinutes / 60);
                const minute = Math.floor((totalMinutes % 60) / 30) * 30;
                if (hour >= HOUR_START && hour < HOUR_END) {
                  onSlotClick(key, hour, minute);
                }
              }}
            >
              {/* Drop target slots */}
              {HALF_HOURS.map(({ hour: h, minute: m }) => {
                const slotId = `slot-${key}-${h}-${m}`;
                return (
                  <DroppableSlot
                    key={slotId}
                    id={slotId}
                    hour={h}
                    minute={m}
                    occupied={isSlotOccupied(dayLessons, h, m)}
                  />
                );
              })}

              {/* Hour grid lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-gray-100 pointer-events-none"
                  style={{ top: (h - HOUR_START) * ROW_PX }}
                />
              ))}

              {/* Lesson cards */}
              {dayLessons.map((lesson) => {
                const pos = getLessonPos(lesson);
                if (!pos || pos.height < 8) return null;
                return (
                  <DraggableLessonCard
                    key={lesson.id}
                    lesson={lesson}
                    pos={pos}
                    onLessonClick={onLessonClick}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
