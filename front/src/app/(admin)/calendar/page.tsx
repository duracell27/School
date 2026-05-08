'use client';

import { useState, useCallback, useRef } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { ChildAvatar } from '@/components/children/child-avatar';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { WeekCalendar, getWeekStart, countryFlag } from '@/components/dashboard/week-calendar';
import { ChildrenSidebar } from '@/components/dashboard/children-sidebar';
import { LessonActionsPopover } from '@/components/dashboard/lesson-actions-popover';
import { LessonModal } from '@/components/lessons/lesson-modal';
import { useLessons, useUpdateLesson, useCopyFromPrevWeek } from '@/lib/lessons';
import { subjectEmoji, subjectLabel } from '@/lib/subjects';
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

export default function CalendarPage() {
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'ADMIN_TEACHER';

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedTeacherId, setSelectedTeacherId] = useState(() => currentUser?.id ?? '');
  const [duration, setDuration] = useState<55 | 30>(55);

  const [slotModal, setSlotModal] = useState<SlotModalState | null>(null);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [lessonPopover, setLessonPopover] = useState<LessonPopoverState | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ hour: number; minute: number } | null>(null);
  const dragJustEnded = useRef(false);

  const { data: users = [] } = useUsers();
  const teacherId = isAdmin ? selectedTeacherId : (currentUser?.id ?? '');
  const teacherIdRef = useRef(teacherId);
  teacherIdRef.current = teacherId;

  const { data: lessons = [], isLoading } = useLessons({
    teacherId: teacherId || undefined,
    weekStart: toWeekStartStr(weekStart),
  });

  const { data: childList = [] } = useChildren(
    teacherId ? { teacherId } : {}
  );

  const updateLesson = useUpdateLesson();
  const copyFromPrevWeek = useCopyFromPrevWeek();

  const realWeekStart = getWeekStart(new Date());
  const isFutureWeek = weekStart.getTime() > realWeekStart.getTime();

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
    setSlotModal({ startDate, endDate, teacherId: teacherIdRef.current });
  }, [lessons, duration]);

  const handleLessonClick = useCallback((lesson: Lesson) => {
    if (dragJustEnded.current) {
      dragJustEnded.current = false;
      return;
    }
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
    dragJustEnded.current = true;
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
      const currentTeacherId = teacherIdRef.current;
      if (!currentTeacherId) return;
      if (isSlotOccupied(lessons, dayKey, hour, minute, duration)) return;
      const startDate = buildStartISO(dayKey, hour, minute);
      const endDate = new Date(new Date(startDate).getTime() + duration * 60000).toISOString();
      setSlotModal({ startDate, endDate, teacherId: currentTeacherId, defaultChildId: child.id });
    }

    if (activeData.type === 'lesson' && activeData.lesson) {
      const lesson = activeData.lesson;
      if (lesson.status === 'CONDUCTED') return;
      if (isSlotOccupied(lessons, dayKey, hour, minute, duration, lesson.id)) return;
      const originalStart = lesson.startDate;
      const originalEnd = lesson.endDate;
      const durationMs = new Date(originalEnd).getTime() - new Date(originalStart).getTime();
      const newStart = buildStartISO(dayKey, hour, minute);
      if (new Date(newStart).getTime() === new Date(originalStart).getTime()) return;
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
  }, [lessons, duration, updateLesson]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Календар</h2>
        <div className="flex items-center gap-2">
          {isFutureWeek && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
              disabled={copyFromPrevWeek.isPending}
              onClick={async () => {
                const result = await copyFromPrevWeek.mutateAsync({
                  targetWeekStart: toWeekStartStr(weekStart),
                  teacherId: isAdmin ? (teacherId || undefined) : undefined,
                });
                alert(`Створено ${result.created} занять`);
              }}
            >
              <Copy size={14} className="mr-1.5" />
              {copyFromPrevWeek.isPending ? 'Створення...' : 'Запланувати з минулого тижня'}
            </Button>
          )}
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
          {activeDrag?.type === 'child' && (() => {
            const child = activeDrag.child;
            const childSubjects = child.subjects.filter((s) => s.teacher.id === teacherId);
            const fmtSlotTime = (h: number, m: number) =>
              `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

            // child.timezone may be IANA string or numeric offset like "-9", "5.5"
            const toChildTz = (h: number, m: number): string => {
              const d = new Date();
              d.setHours(h, m, 0, 0);
              const tz = child.timezone;
              const numeric = parseFloat(tz);
              if (!isNaN(numeric) && String(numeric) === tz.trim()) {
                // numeric UTC offset
                const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
                const childDate = new Date(utcMs + numeric * 3600000);
                return fmtSlotTime(childDate.getHours(), childDate.getMinutes());
              }
              try {
                return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: tz });
              } catch {
                return '';
              }
            };

            const localOffsetH = -new Date().getTimezoneOffset() / 60;
            const childTzDiffers = (() => {
              const tz = child.timezone;
              const numeric = parseFloat(tz);
              if (!isNaN(numeric) && String(numeric) === tz.trim()) return numeric !== localOffsetH;
              return tz !== Intl.DateTimeFormat().resolvedOptions().timeZone;
            })();

            const endH = hoverSlot ? Math.floor((hoverSlot.hour * 60 + hoverSlot.minute + duration) / 60) : 0;
            const endM = hoverSlot ? (hoverSlot.minute + duration) % 60 : 0;

            return (
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-lg shadow-lg text-sm font-medium opacity-90 w-48">
                <ChildAvatar name={child.name} avatar={child.avatar} size={24} />
                <div className="flex flex-col min-w-0">
                  <span className="truncate leading-tight">{child.name}</span>
                  {hoverSlot && (
                    <>
                      <span className="text-xs text-blue-500 leading-tight">
                        {fmtSlotTime(hoverSlot.hour, hoverSlot.minute)}–{fmtSlotTime(endH, endM)}
                      </span>
                      {childTzDiffers && (
                        <span className="text-xs text-orange-500 leading-tight">
                          {countryFlag(child.country)} {toChildTz(hoverSlot.hour, hoverSlot.minute)}–{toChildTz(endH, endM)}
                        </span>
                      )}
                    </>
                  )}
                  {childSubjects.length > 0 && (
                    <span className="text-xs text-gray-500 leading-tight">
                      {childSubjects.length === 1
                        ? `${subjectEmoji(childSubjects[0].subject)} ${subjectLabel(childSubjects[0].subject)}`
                        : childSubjects.map((s) => subjectEmoji(s.subject)).join(' або ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
          {activeDrag?.type === 'lesson' && (() => {
            const lesson = activeDrag.lesson;
            const child = lesson.child;
            const lessonDurationMin = Math.round(
              (new Date(lesson.endDate).getTime() - new Date(lesson.startDate).getTime()) / 60000
            );
            const fmtT = (h: number, m: number) =>
              `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const toChildTz = (h: number, m: number): string => {
              const d = new Date(); d.setHours(h, m, 0, 0);
              const tz = child.timezone;
              const numeric = parseFloat(tz);
              if (!isNaN(numeric) && String(numeric) === tz.trim()) {
                const childDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + numeric * 3600000);
                return fmtT(childDate.getHours(), childDate.getMinutes());
              }
              try { return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: tz }); }
              catch { return ''; }
            };
            const localOffsetH = -new Date().getTimezoneOffset() / 60;
            const childTzDiffers = (() => {
              const tz = child.timezone;
              const numeric = parseFloat(tz);
              if (!isNaN(numeric) && String(numeric) === tz.trim()) return numeric !== localOffsetH;
              return tz !== Intl.DateTimeFormat().resolvedOptions().timeZone;
            })();
            const endTotal = hoverSlot ? hoverSlot.hour * 60 + hoverSlot.minute + lessonDurationMin : 0;
            const endH = Math.floor(endTotal / 60);
            const endM = endTotal % 60;
            return (
              <div className="px-2 py-1 bg-blue-50 border-l-2 border-blue-400 rounded text-xs font-semibold text-blue-900 shadow-lg w-36 opacity-90">
                <div>{child.name}</div>
                {hoverSlot && (
                  <>
                    <div className="text-blue-500 font-normal">
                      {fmtT(hoverSlot.hour, hoverSlot.minute)}–{fmtT(endH, endM)}
                    </div>
                    {childTzDiffers && (
                      <div className="text-orange-500 font-normal">
                        {countryFlag(child.country)} {toChildTz(hoverSlot.hour, hoverSlot.minute)}–{toChildTz(endH, endM)}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
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
