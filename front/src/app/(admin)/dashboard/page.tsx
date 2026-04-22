'use client';

import { useState, useCallback } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { ChildAvatar } from '@/components/children/child-avatar';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekCalendar, getWeekStart } from '@/components/dashboard/week-calendar';
import { ChildrenSidebar } from '@/components/dashboard/children-sidebar';
import { LessonActionsPopover } from '@/components/dashboard/lesson-actions-popover';
import { LessonModal } from '@/components/lessons/lesson-modal';
import { useLessons, useUpdateLesson } from '@/lib/lessons';
import { useChildren } from '@/lib/children';
import { useUsers } from '@/lib/users';
import { useSessionStore } from '@/store/session.store';
import type { Lesson } from '@/types/lesson';
import type { Child } from '@/types/child';

function toWeekStartStr(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

function fmtWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  const e = end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

function buildStartISO(dayKey: string, hour: number, minute: number): string {
  const d = new Date(dayKey);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isSlotOccupied(lessons: Lesson[], dayKey: string, hour: number, minute: number, durationMin: number, excludeId?: string): boolean {
  const slotStart = new Date(dayKey);
  slotStart.setHours(hour, minute, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);
  return lessons.some((l) => {
    if (l.id === excludeId) return false;
    const ls = new Date(l.startDate);
    const le = new Date(l.endDate);
    return ls < slotEnd && le > slotStart;
  });
}

interface SlotModalState {
  startDate: string;
  endDate: string;
  teacherId: string;
  defaultChildId?: string;
}

type ActiveDrag =
  | { type: 'child'; child: Child }
  | { type: 'lesson'; lesson: Lesson };

interface LessonPopoverState {
  lesson: Lesson;
  anchorRect: DOMRect;
}

export default function DashboardPage() {
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedTeacherId, setSelectedTeacherId] = useState(() => currentUser?.id ?? '');
  const [duration, setDuration] = useState<55 | 30>(55);

  const [slotModal, setSlotModal] = useState<SlotModalState | null>(null);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [lessonPopover, setLessonPopover] = useState<LessonPopoverState | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ hour: number; minute: number } | null>(null);

  const { data: users = [] } = useUsers();
  const teacherId = isAdmin ? selectedTeacherId : (currentUser?.id ?? '');

  const { data: lessons = [], isLoading } = useLessons({
    teacherId: teacherId || undefined,
    weekStart: toWeekStartStr(weekStart),
  });

  const { data: childList = [] } = useChildren(
    teacherId ? { teacherId } : {}
  );

  const updateLesson = useUpdateLesson();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function prevWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }

  function nextWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }

  const handleSlotClick = useCallback((dayKey: string, hour: number, minute: number) => {
    if (isSlotOccupied(lessons, dayKey, hour, minute, duration)) return;
    const startDate = buildStartISO(dayKey, hour, minute);
    const endDate = new Date(new Date(startDate).getTime() + duration * 60000).toISOString();
    setSlotModal({ startDate, endDate, teacherId });
  }, [lessons, duration, teacherId]);

  const handleLessonClick = useCallback((lesson: Lesson) => {
    const el = document.querySelector(`[data-lesson-id="${lesson.id}"]`);
    const rect = el?.getBoundingClientRect() ?? new DOMRect(200, 200, 160, 36);
    setLessonPopover({ lesson, anchorRect: rect });
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const data = event.over?.data.current as { hour?: number; minute?: number } | undefined;
    if (data?.hour !== undefined && data?.minute !== undefined) {
      setHoverSlot({ hour: data.hour, minute: data.minute });
    } else {
      setHoverSlot(null);
    }
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { type: string; child?: Child; lesson?: Lesson };
    if (data.type === 'child' && data.child) setActiveDrag({ type: 'child', child: data.child });
    else if (data.type === 'lesson' && data.lesson) setActiveDrag({ type: 'lesson', lesson: data.lesson });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDrag(null);
    setHoverSlot(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { type: string; child?: Child; lesson?: Lesson };
    const overId = over.id as string;

    const match = overId.match(/^slot-(\d{4}-\d{2}-\d{2})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return;
    const [, dayKey, hourStr, minuteStr] = match;
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);

    if (activeData.type === 'child' && activeData.child) {
      const child = activeData.child;
      if (!teacherId) return;
      if (isSlotOccupied(lessons, dayKey, hour, minute, duration)) return;
      const startDate = buildStartISO(dayKey, hour, minute);
      const endDate = new Date(new Date(startDate).getTime() + duration * 60000).toISOString();
      setSlotModal({ startDate, endDate, teacherId, defaultChildId: child.id });
    }

    if (activeData.type === 'lesson' && activeData.lesson) {
      const lesson = activeData.lesson;
      if (lesson.status === 'CONDUCTED') return;
      if (isSlotOccupied(lessons, dayKey, hour, minute, duration, lesson.id)) return;
      const originalStart = lesson.startDate;
      const originalEnd = lesson.endDate;
      const durationMs = new Date(originalEnd).getTime() - new Date(originalStart).getTime();
      const newStart = buildStartISO(dayKey, hour, minute);
      const newEnd = new Date(new Date(newStart).getTime() + durationMs).toISOString();
      await updateLesson.mutateAsync({
        id: lesson.id,
        data: {
          status: 'RESCHEDULED',
          startDate: newStart,
          endDate: newEnd,
          originalStartDate: originalStart,
          originalEndDate: originalEnd,
        },
      });
    }
  }, [lessons, duration, teacherId, updateLesson]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Дашборд</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select value={selectedTeacherId} onValueChange={(v) => setSelectedTeacherId(v ?? '')}>
              <SelectTrigger className="w-48">
                <SelectValue>
                  {users.find((u) => u.id === selectedTeacherId)?.name ?? 'Всі вчителі'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Всі вчителі</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>
            Сьогодні
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={prevWeek}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium w-44 text-center">
              {fmtWeekLabel(weekStart)}
            </span>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 items-start">
          {/* Sidebar */}
          {(teacherId || !isAdmin) && (
            <ChildrenSidebar
              childList={childList}
              lessons={lessons}
              duration={duration}
              onDurationChange={setDuration}
            />
          )}
          {isAdmin && !teacherId && (
            <div className="w-48 shrink-0 flex items-center justify-center h-24 border rounded-lg bg-white text-sm text-gray-400">
              Оберіть вчителя
            </div>
          )}

          {/* Calendar */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <p className="text-gray-500">Завантаження...</p>
            ) : (
              <WeekCalendar
                lessons={lessons}
                weekStart={weekStart}
                onSlotClick={handleSlotClick}
                onLessonClick={handleLessonClick}
              />
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag?.type === 'child' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-lg shadow-lg text-sm font-medium opacity-90 w-44">
              <ChildAvatar name={activeDrag.child.name} avatar={activeDrag.child.avatar} size={24} />
              <div className="flex flex-col min-w-0">
                <span className="truncate leading-tight">{activeDrag.child.name}</span>
                {hoverSlot && (
                  <span className="text-xs text-blue-500 leading-tight">
                    {String(hoverSlot.hour).padStart(2, '0')}:{String(hoverSlot.minute).padStart(2, '0')}–
                    {(() => {
                      const end = new Date(0);
                      end.setHours(hoverSlot.hour, hoverSlot.minute + duration, 0, 0);
                      return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                    })()}
                  </span>
                )}
              </div>
            </div>
          )}
          {activeDrag?.type === 'lesson' && (
            <div className="px-2 py-1 bg-blue-50 border-l-2 border-blue-400 rounded text-xs font-semibold text-blue-900 shadow-lg w-32 opacity-90">
              <div>{activeDrag.lesson.child.name}</div>
              {hoverSlot && (
                <div className="text-blue-500 font-normal">
                  {String(hoverSlot.hour).padStart(2, '0')}:{String(hoverSlot.minute).padStart(2, '0')}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Slot click → create modal */}
      {slotModal && (
        <LessonModal
          open
          onClose={() => setSlotModal(null)}
          defaultStartDate={slotModal.startDate}
          defaultEndDate={slotModal.endDate}
          defaultTeacherId={slotModal.teacherId}
          defaultChildId={slotModal.defaultChildId}
        />
      )}

      {/* Lesson card edit modal */}
      {editLesson && (
        <LessonModal
          open
          onClose={() => setEditLesson(null)}
          lesson={editLesson}
        />
      )}

      {/* Lesson card actions popover */}
      {lessonPopover && (
        <LessonActionsPopover
          lesson={lessonPopover.lesson}
          anchorRect={lessonPopover.anchorRect}
          onClose={() => setLessonPopover(null)}
          onEdit={(lesson) => { setLessonPopover(null); setEditLesson(lesson); }}
        />
      )}
    </div>
  );
}
