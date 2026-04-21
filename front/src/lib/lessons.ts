import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  Lesson, LessonPrice,
  CreateLessonPayload, UpdateLessonPayload,
  CreateLessonPricePayload, UpdateLessonPricePayload,
} from '@/types/lesson';

export function useLessons(filters: { teacherId?: string; weekStart?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  if (filters.weekStart) params.set('weekStart', filters.weekStart);
  const qs = params.toString();
  return useQuery({
    queryKey: ['lessons', filters],
    queryFn: () => apiFetch<Lesson[]>(`/lessons${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLessonPayload) =>
      apiFetch<Lesson>('/lessons', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonPayload }) =>
      apiFetch<Lesson>(`/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/lessons/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function usePriceSuggestion(
  childId: string | null,
  teacherId: string | null,
  startDate: string | null,
) {
  return useQuery({
    queryKey: ['price-suggestion', childId, teacherId, startDate],
    queryFn: async () => {
      const result = await apiFetch<number | null>(
        `/lessons/price-suggestion?childId=${childId}&teacherId=${teacherId}&startDate=${encodeURIComponent(startDate!)}`,
      );
      return result ?? null;
    },
    enabled: !!(childId && teacherId && startDate),
  });
}

export function useLessonPrices() {
  return useQuery({
    queryKey: ['lesson-prices'],
    queryFn: () => apiFetch<LessonPrice[]>('/lesson-prices'),
  });
}

export function useCreateLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLessonPricePayload) =>
      apiFetch<LessonPrice>('/lesson-prices', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}

export function useUpdateLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonPricePayload }) =>
      apiFetch<LessonPrice>(`/lesson-prices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}

export function useDeleteLessonPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/lesson-prices/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-prices'] }),
  });
}

export function useOverdueCount() {
  return useQuery({
    queryKey: ['lessons', 'overdue-count'],
    queryFn: () => apiFetch<number>('/lessons/overdue-count'),
    refetchInterval: 5 * 60 * 1000,
  });
}
