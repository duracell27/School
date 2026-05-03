import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { LessonNote } from '@/types/lesson';

export function useLessonNote(lessonId: string | null) {
  return useQuery({
    queryKey: ['lesson-note', lessonId],
    queryFn: () => apiFetch<LessonNote>(`/lesson-notes/${lessonId}`),
    enabled: !!lessonId,
    retry: false,
  });
}

export interface UpsertLessonNotePayload {
  lessonId: string;
  description: string;
  imageData?: string;
}

export function useUpsertLessonNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertLessonNotePayload) =>
      apiFetch<LessonNote>('/lesson-notes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-note', vars.lessonId] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}
