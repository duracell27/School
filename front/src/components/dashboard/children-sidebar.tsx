'use client';

import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff } from 'lucide-react';
import { ChildAvatar } from '@/components/children/child-avatar';
import { getCountry } from '@/lib/countries';
import { subjectEmoji } from '@/lib/subjects';
import type { Child } from '@/types/child';
import type { Lesson } from '@/types/lesson';

const STATUS_DOT: Record<string, string> = {
  CONDUCTED:   'bg-[#22a06b]',
  PLANNED:     'bg-[#4f8df5]',
  RESCHEDULED: 'bg-[#e8893c]',
  CANCELLED:   'bg-[#e15a5a]',
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
  hidden: boolean;
  onToggleVisibility: () => void;
  statusLabel?: string;
}

function DraggableChild({ child, weekStatuses, hidden, onToggleVisibility, statusLabel }: DraggableChildProps) {
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
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-grab hover:bg-gray-50 transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${hidden ? 'opacity-50' : ''}`}
      {...listeners}
      {...attributes}
    >
      <ChildAvatar name={child.name} avatar={child.avatar} size={24} />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm leading-tight shrink-0">{flag}</span>
          <span className="text-sm font-semibold truncate leading-tight">{child.name}</span>
        </div>
        {(child.subjects.length > 0 || weekStatuses.length > 0) && (
          <div className="flex items-center gap-1 mt-0.5">
            {[...new Set(child.subjects.map((s) => s.subject))].map((s) => (
              <span key={s} className="text-xs leading-none">{subjectEmoji(s)}</span>
            ))}
            {statusLabel && (
              <span className="text-[10px] text-amber-600 font-medium ml-auto">{statusLabel}</span>
            )}
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
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
        className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
        title={hidden ? 'Показати уроки' : 'Сховати уроки'}
      >
        {hidden
          ? <EyeOff size={14} />
          : <Eye size={14} />
        }
      </button>
    </div>
  );
}

interface ChildrenSidebarProps {
  childList: Child[];
  lessons: Lesson[];
  duration: 55 | 30;
  onDurationChange: (d: 55 | 30) => void;
  hiddenChildIds: Set<string>;
  onToggleChild: (childId: string) => void;
  onToggleAll: () => void;
}

export function ChildrenSidebar({ childList, lessons, duration, onDurationChange, hiddenChildIds, onToggleChild, onToggleAll }: ChildrenSidebarProps) {
  const [search, setSearch] = useState('');

  const childWeekStatuses = useMemo(() => {
    const map = new Map<string, string[]>();
    lessons.forEach((l) => {
      const arr = map.get(l.child.id) ?? [];
      arr.push(l.status);
      map.set(l.child.id, arr);
    });
    return map;
  }, [lessons]);

  const { activeChildren, inactiveChildren } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? childList.filter((c) => c.name.toLowerCase().includes(q)) : childList;
    return {
      activeChildren: filtered.filter((c) => !c.status || c.status === 'STUDYING'),
      inactiveChildren: filtered.filter((c) => c.status === 'VACATION' || c.status === 'PAUSED'),
    };
  }, [childList, search]);

  const allChildren = [...activeChildren, ...inactiveChildren];
  const allHidden = allChildren.length > 0 && hiddenChildIds.size >= allChildren.length;

  return (
    <div className="w-48 shrink-0 flex flex-col gap-2 border rounded-lg bg-card p-2">
      {/* Duration switcher */}
      <div className="inline-flex rounded-lg border bg-card p-0.5 text-xs font-medium">
        <button
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            duration === 55 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onDurationChange(55)}
        >
          55хв
        </button>
        <button
          className={`flex-1 py-1.5 rounded-md transition-colors ${
            duration === 30 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onDurationChange(30)}
        >
          30хв
        </button>
      </div>

      {/* Search + global visibility toggle */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук..."
          className="flex-1 min-w-0 text-xs px-2 py-1 rounded border border-gray-200 outline-none focus:border-ring bg-card"
        />
        <button
          onClick={onToggleAll}
          className="shrink-0 p-1 rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title={allHidden ? 'Показати всіх' : 'Сховати всіх'}
        >
          {allHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {/* Children list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {activeChildren.length === 0 && inactiveChildren.length === 0 ? (
          <p className="text-xs text-gray-400 px-2 py-2">Немає учнів</p>
        ) : (
          <>
            {activeChildren.map((child) => (
              <DraggableChild
                key={child.id}
                child={child}
                weekStatuses={childWeekStatuses.get(child.id) ?? []}
                hidden={hiddenChildIds.has(child.id)}
                onToggleVisibility={() => onToggleChild(child.id)}
              />
            ))}
            {inactiveChildren.length > 0 && (
              <>
                <div className="px-2 pt-1.5 pb-0.5">
                  <div className="h-px bg-border" />
                </div>
                {inactiveChildren.map((child) => (
                  <div key={child.id} className="rounded-lg bg-amber-50/60">
                    <DraggableChild
                      child={child}
                      weekStatuses={childWeekStatuses.get(child.id) ?? []}
                      hidden={hiddenChildIds.has(child.id)}
                      onToggleVisibility={() => onToggleChild(child.id)}
                      statusLabel={child.status === 'VACATION' ? 'канікули 🏖️' : 'пауза ⏸️'}
                    />
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
