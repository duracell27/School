'use client';

import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChildAvatar } from '@/components/children/child-avatar';
import { getCountry } from '@/lib/countries';
import { subjectEmoji } from '@/lib/subjects';
import type { Child } from '@/types/child';
import type { Lesson } from '@/types/lesson';

const STATUS_DOT: Record<string, string> = {
  CONDUCTED: 'bg-green-500',
  PLANNED: 'bg-blue-500',
  RESCHEDULED: 'bg-amber-400',
  CANCELLED: 'bg-gray-300',
};

const STATUS_TITLE: Record<string, string> = {
  CONDUCTED: 'Проведено',
  PLANNED: 'Заплановано',
  RESCHEDULED: 'Перенесено',
  CANCELLED: 'Скасовано',
};

interface DraggableChildProps {
  child: Child;
  weekStatuses: string[];
}

function DraggableChild({ child, weekStatuses }: DraggableChildProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `child-${child.id}`,
    data: { type: 'child', child },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const flag = getCountry(child.country)?.flag ?? child.country;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab hover:bg-gray-50 transition-colors ${
        isDragging ? 'opacity-40' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <ChildAvatar name={child.name} avatar={child.avatar} size={24} />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm leading-tight shrink-0">{flag}</span>
          <span className="text-sm truncate leading-tight">{child.name}</span>
        </div>
        {(child.subjects.length > 0 || weekStatuses.length > 0) && (
          <div className="flex items-center gap-1 mt-0.5">
            {[...new Set(child.subjects.map((s) => s.subject))].map((s) => (
              <span key={s} className="text-xs leading-none">{subjectEmoji(s)}</span>
            ))}
            {weekStatuses.map((status, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-300'}`}
                title={STATUS_TITLE[status] ?? status}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChildrenSidebarProps {
  childList: Child[];
  lessons: Lesson[];
  duration: 55 | 30;
  onDurationChange: (d: 55 | 30) => void;
}

export function ChildrenSidebar({ childList, lessons, duration, onDurationChange }: ChildrenSidebarProps) {
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  const childWeekStatuses = useMemo(() => {
    const map = new Map<string, string[]>();
    lessons.forEach((l) => {
      const arr = map.get(l.child.id) ?? [];
      arr.push(l.status);
      map.set(l.child.id, arr);
    });
    return map;
  }, [lessons]);

  const childIdsWithOverdue = useMemo(() => {
    const ids = new Set<string>();
    const now = new Date();
    lessons.forEach((l) => {
      if (l.status === 'PLANNED' && new Date(l.endDate) < now) {
        ids.add(l.child.id);
      }
    });
    return ids;
  }, [lessons]);

  const visibleChildren = showOnlyOverdue
    ? childList.filter((c) => childIdsWithOverdue.has(c.id))
    : childList;

  return (
    <div className="w-48 shrink-0 flex flex-col gap-2 border rounded-lg bg-white p-2">
      {/* Duration switcher */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          className={`flex-1 text-xs py-1.5 font-medium transition-colors ${
            duration === 55 ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => onDurationChange(55)}
        >
          55хв
        </button>
        <button
          className={`flex-1 text-xs py-1.5 font-medium transition-colors border-l ${
            duration === 30 ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => onDurationChange(30)}
        >
          30хв
        </button>
      </div>

      {/* Overdue filter toggle */}
      <button
        className={`text-xs px-2 py-1 rounded border transition-colors text-left ${
          showOnlyOverdue
            ? 'bg-red-50 border-red-300 text-red-700'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
        onClick={() => setShowOnlyOverdue((v) => !v)}
      >
        {showOnlyOverdue ? '✕ Скинути фільтр' : 'Лише з необробленими'}
      </button>

      {/* Children list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {visibleChildren.length === 0 ? (
          <p className="text-xs text-gray-400 px-2 py-2">Немає учнів</p>
        ) : (
          visibleChildren.map((child) => (
            <DraggableChild
              key={child.id}
              child={child}
              weekStatuses={childWeekStatuses.get(child.id) ?? []}
            />
          ))
        )}
      </div>
    </div>
  );
}
