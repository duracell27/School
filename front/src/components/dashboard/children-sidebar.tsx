'use client';

import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChildAvatar } from '@/components/children/child-avatar';
import type { Child } from '@/types/child';
import type { Lesson } from '@/types/lesson';

interface DraggableChildProps {
  child: Child;
  hasLessonToday: boolean;
}

function DraggableChild({ child, hasLessonToday }: DraggableChildProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `child-${child.id}`,
    data: { type: 'child', child },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

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
      <span className="text-sm truncate flex-1">{child.name}</span>
      {hasLessonToday && (
        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Має урок сьогодні" />
      )}
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
  const todayKey = new Date().toLocaleDateString('en-CA');
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  const childIdsWithLessonToday = useMemo(() => {
    const ids = new Set<string>();
    lessons.forEach((l) => {
      const lKey = new Date(l.startDate).toLocaleDateString('en-CA');
      if (lKey === todayKey) ids.add(l.child.id);
    });
    return ids;
  }, [lessons, todayKey]);

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
              hasLessonToday={childIdsWithLessonToday.has(child.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
